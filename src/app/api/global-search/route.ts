import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GlobalSearchResult } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SEARCH_TYPES = new Set([
  'all',
  'requirements',
  'actions',
  'people',
  'evidence',
  'competencies',
  'audit-packs',
  'reports',
  'audit-trail',
  'assets'
]);
const SEARCH_SORTS = new Set(['relevance', 'recent', 'type', 'status']);
const MAX_RESULTS = 50;

const normalizeFilterTerm = (value: string) =>
  value
    .trim()
    .slice(0, 100)
    .replace(/[,%():"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = normalizeFilterTerm(searchParams.get('q') || '');
    const requestedType = searchParams.get('type') || 'all';
    const requestedSort = searchParams.get('sort') || 'relevance';
    const tabType = SEARCH_TYPES.has(requestedType) ? requestedType : 'all';
    const sortBy = SEARCH_SORTS.has(requestedSort) ? requestedSort : 'relevance';

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Initialize Supabase using the user's token so RLS policies are applied automatically
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Verify token & resolve user profile/organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      return NextResponse.json({ error: 'Unauthorized: No organization association' }, { status: 403 });
    }

    const orgId = profile.organization_id;
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Unauthorized: No organization membership' }, { status: 403 });
    }

    const isAdmin = membership.role === 'Owner' || membership.role === 'Admin';

    // Prepare search term
    const term = query;

    // Query promises
    const promises: Promise<GlobalSearchResult[]>[] = [];

    // Helper to compute relevance score
    const getRelevance = (title: string, desc: string | null, searchStr: string): number => {
      const t = title.toLowerCase();
      const s = searchStr.toLowerCase();
      const d = (desc || '').toLowerCase();
      if (t === s) return 100;
      if (t.startsWith(s)) return 80;
      if (t.includes(s)) return 60;
      if (d.includes(s)) return 40;
      return 20;
    };

    // 1. Requirements (Standards-agnostic Framework)
    if (tabType === 'all' || tabType === 'requirements') {
      const getRequirements = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('requirements')
          .select('id, title, description, category, status, created_at')
          .eq('organisation_id', orgId)
          .is('deleted_at', null)
          .or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`)
          .limit(20);
        
        if (error || !data) return [];
        return data.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          type: 'requirement' as const,
          status: r.status,
          category: r.category,
          path: `/dashboard/requirements?selected=${r.id}`,
          relevanceScore: getRelevance(r.title, r.description, term),
          additionalInfo: { created_at: r.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getRequirements());
    }

    // 2. Actions (Gap Action Registry Items)
    if (tabType === 'all' || tabType === 'actions') {
      const getActions = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('actions')
          .select('id, title, description, owner, status, created_at')
          .eq('organisation_id', orgId)
          .or(`title.ilike.%${term}%,description.ilike.%${term}%,owner.ilike.%${term}%`)
          .limit(20);

        if (error || !data) return [];
        return data.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          type: 'action' as const,
          status: a.status,
          category: 'Action Item',
          path: `/dashboard/requirements?selectedAction=${a.id}`,
          relevanceScore: getRelevance(a.title, a.description, term),
          additionalInfo: { owner: a.owner, created_at: a.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getActions());
    }

    // 3. People (Personnel Tracking)
    if (tabType === 'all' || tabType === 'people') {
      const getPeople = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('people')
          .select('id, first_name, last_name, display_name, email, department, role, active, created_at')
          .eq('organisation_id', orgId)
          .eq('active', true)
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,display_name.ilike.%${term}%,email.ilike.%${term}%,department.ilike.%${term}%,role.ilike.%${term}%`)
          .limit(20);

        if (error || !data) return [];
        return data.map(p => ({
          id: p.id,
          title: p.display_name || `${p.first_name} ${p.last_name}`,
          description: p.email ? `Email: ${p.email} | Department: ${p.department || 'N/A'}` : `Department: ${p.department || 'N/A'}`,
          type: 'person' as const,
          status: p.active ? 'Active' : 'Inactive',
          category: p.role || 'Personnel',
          path: `/dashboard/competencies?person=${p.id}`,
          relevanceScore: getRelevance(p.display_name || `${p.first_name} ${p.last_name}`, p.email || '', term),
          additionalInfo: { created_at: p.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getPeople());
    }

    // 4. Competency Types
    if (tabType === 'all' || tabType === 'competencies') {
      const getCompetencies = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('competency_types')
          .select('id, title, category, description, created_at')
          .eq('organisation_id', orgId)
          .eq('active', true)
          .or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`)
          .limit(20);

        if (error || !data) return [];
        return data.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          type: 'competency_type' as const,
          status: 'Active',
          category: c.category,
          path: `/dashboard/competencies?competency=${c.id}`,
          relevanceScore: getRelevance(c.title, c.description, term),
          additionalInfo: { created_at: c.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getCompetencies());
    }

    // 5. Evidence Documents (Vault Metadata Only)
    if (tabType === 'all' || tabType === 'evidence') {
      const getEvidence = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('evidence_documents')
          .select('id, title, file_name, original_file_name, category, status, created_at')
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          .or(`title.ilike.%${term}%,file_name.ilike.%${term}%,original_file_name.ilike.%${term}%,category.ilike.%${term}%`)
          .limit(20);

        if (error || !data) return [];
        return data.map(d => ({
          id: d.id,
          title: d.title,
          description: `File: ${d.original_file_name || d.file_name}`,
          type: 'document' as const,
          status: d.status,
          category: d.category,
          path: `/dashboard/vault?document=${d.id}`,
          relevanceScore: getRelevance(d.title, d.original_file_name || d.file_name, term),
          additionalInfo: { created_at: d.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getEvidence());
    }

    // 6. Audit Packs (Packs Builder)
    if (tabType === 'all' || tabType === 'audit-packs') {
      const getAuditPacks = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('audit_packs')
          .select('id, name, description, status, created_at')
          .eq('organization_id', orgId)
          .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
          .limit(20);

        if (error || !data) return [];
        return data.map(ap => ({
          id: ap.id,
          title: ap.name,
          description: ap.description,
          type: 'audit_pack' as const,
          status: ap.status,
          category: 'Audit Pack',
          path: `/dashboard/audit-packs?pack=${ap.id}`,
          relevanceScore: getRelevance(ap.name, ap.description, term),
          additionalInfo: { created_at: ap.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getAuditPacks());
    }

    // 7. Saved Reports
    if (tabType === 'all' || tabType === 'reports') {
      const getReports = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('saved_reports')
          .select('id, name, description, report_type, data_source, created_at')
          .eq('organization_id', orgId)
          .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
          .limit(20);

        if (error || !data) return [];
        return data.map(sr => ({
          id: sr.id,
          title: sr.name,
          description: sr.description || `Data source: ${sr.data_source}`,
          type: 'report' as const,
          status: 'Saved',
          category: sr.report_type,
          path: `/dashboard/reports/detail?report=${sr.id}`,
          relevanceScore: getRelevance(sr.name, sr.description, term),
          additionalInfo: { created_at: sr.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getReports());
    }

    // 8. Audit Trail (Gated: Owner / Admin only)
    if (isAdmin && (tabType === 'all' || tabType === 'audit-trail')) {
      const getAuditTrail = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('audit_trail_events')
          .select('id, description, action_type, action_category, entity_label, created_at, severity')
          .eq('organization_id', orgId)
          .or(`description.ilike.%${term}%,action_type.ilike.%${term}%,action_category.ilike.%${term}%,entity_label.ilike.%${term}%`)
          .limit(20);

        if (error || !data) return [];
        return data.map(ate => ({
          id: ate.id,
          title: ate.description,
          description: `Action: ${ate.action_type} | Category: ${ate.action_category}`,
          type: 'audit_trail_event' as const,
          status: ate.severity,
          category: 'Audit Trail',
          path: `/dashboard/audit-trail?event=${ate.id}`,
          relevanceScore: getRelevance(ate.description, ate.action_type, term),
          additionalInfo: { created_at: ate.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getAuditTrail());
    }

    // 9. Assets
    if (tabType === 'all' || tabType === 'assets') {
      const getAssets = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('assets')
          .select('id, name, asset_type, registration_number, serial_number, make, model, status, created_at')
          .eq('organisation_id', orgId)
          .eq('status', 'active')
          .or(`name.ilike.%${term}%,asset_type.ilike.%${term}%,registration_number.ilike.%${term}%,make.ilike.%${term}%,model.ilike.%${term}%`)
          .limit(20);

        if (error || !data) return [];
        return data.map(a => ({
          id: a.id,
          title: a.name,
          description: `Reg: ${a.registration_number || 'N/A'} | Type: ${a.asset_type} | Make/Model: ${a.make || ''} ${a.model || ''}`,
          type: 'asset' as const,
          status: a.status,
          category: a.asset_type,
          path: `/dashboard/matrix?asset=${a.id}`,
          relevanceScore: getRelevance(a.name, a.registration_number || '', term),
          additionalInfo: { created_at: a.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getAssets());

      const getAssetCategories = async (): Promise<GlobalSearchResult[]> => {
        const { data, error } = await supabase
          .from('asset_categories')
          .select('id, name, description, active, created_at')
          .eq('organisation_id', orgId)
          .eq('active', true)
          .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
          .limit(20);

        if (error || !data) return [];
        return data.map(c => ({
          id: c.id,
          title: c.name,
          description: c.description || `Asset Category: ${c.name}`,
          type: 'asset' as const,
          status: 'Active',
          category: 'Category',
          path: `/dashboard/matrix?category=${c.id}`,
          relevanceScore: getRelevance(c.name, c.description, term),
          additionalInfo: { created_at: c.created_at }
        })) as GlobalSearchResult[];
      };
      promises.push(getAssetCategories());
    }

    // Await all database queries
    const resolvedResults = await Promise.all(promises);

    // Flatten results list
    const allResults = resolvedResults.flat();

    // Sort results
    if (sortBy === 'recent') {
      allResults.sort((a, b) => {
        const dateA = new Date(a.additionalInfo?.created_at || 0).getTime();
        const dateB = new Date(b.additionalInfo?.created_at || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === 'type') {
      allResults.sort((a, b) => a.type.localeCompare(b.type));
    } else if (sortBy === 'status') {
      allResults.sort((a, b) => a.status.localeCompare(b.status));
    } else {
      // Default: Relevance score descending, then secondary by title alphabetical
      allResults.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return a.title.localeCompare(b.title);
      });
    }

    return NextResponse.json({ results: allResults.slice(0, MAX_RESULTS) });
  } catch (err) {
    console.error('Unhandled global search API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
