import { supabase } from './supabaseClient';
import { isDemoMode } from './env';
import { getCurrentSupabaseProfile, getCurrentSupabaseOrganizationId, MOCK_PROFILE, MOCK_ORG } from './db';
import { AuditTrailEvent } from './types';

export interface AuditLogInput {
  actionCategory: 'Evidence' | 'Requirements' | 'Actions' | 'Competency' | 'Audit Packs' | 'Users & Admin' | 'System';
  actionType: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  description: string;
  beforeSnapshot?: Record<string, any> | null;
  afterSnapshot?: Record<string, any> | null;
  changedFields?: Record<string, any> | null;
  metadata?: Record<string, any>;
  undoAvailable?: boolean;
  undoActionType?: string | null;
  undoExpiresAt?: string | null;
  severity?: 'info' | 'warning' | 'critical';
  source?: string;
}

/**
 * Creates and inserts a rich audit trail event.
 * Enforces organization scope, captures actor details, snapshot states, and undo availability.
 */
export const logAuditEvent = async (input: AuditLogInput): Promise<AuditTrailEvent> => {
  const now = new Date().toISOString();
  
  let organizationId = MOCK_ORG.id;
  let actorUserId: string | null = MOCK_PROFILE.id;
  let actorName: string | null = MOCK_PROFILE.full_name;
  let actorEmail: string | null = 'jane.doe@apexlogistics.com';
  let actorRole: string | null = MOCK_PROFILE.role;

  if (!isDemoMode && supabase) {
    try {
      const orgId = await getCurrentSupabaseOrganizationId();
      if (orgId) {
        organizationId = orgId;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        actorUserId = user.id;
        actorEmail = user.email || null;
      }
      
      const profile = await getCurrentSupabaseProfile();
      if (profile) {
        actorName = profile.full_name || null;
        actorRole = profile.role || null;
        if (profile.id) {
          actorUserId = profile.id;
        }
      }
    } catch (err) {
      console.warn('Could not retrieve actor/org metadata for audit trail, using fallback:', err);
    }
  } else if (typeof window !== 'undefined') {
    // LocalStorage demo mode dynamic session
    const cachedUser = localStorage.getItem('vigilen_session_user');
    const cachedOrg = localStorage.getItem('vigilen_session_org');
    if (cachedUser) {
      const parsedUser = JSON.parse(cachedUser);
      actorUserId = parsedUser.id || null;
      actorName = parsedUser.full_name || null;
      actorRole = parsedUser.role || null;
      actorEmail = parsedUser.email || 'jane.doe@apexlogistics.com';
    }
    if (cachedOrg) {
      const parsedOrg = JSON.parse(cachedOrg);
      organizationId = parsedOrg.id || MOCK_ORG.id;
    }
  }

  const newEvent: AuditTrailEvent = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt-${Math.random().toString(36).substr(2, 9)}`,
    organization_id: organizationId,
    actor_user_id: actorUserId,
    actor_name: actorName,
    actor_email: actorEmail,
    actor_role: actorRole,
    action_type: input.actionType,
    action_category: input.actionCategory,
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_label: input.entityLabel,
    description: input.description,
    before_snapshot: input.beforeSnapshot || null,
    after_snapshot: input.afterSnapshot || null,
    changed_fields: input.changedFields || null,
    metadata: input.metadata || {},
    undo_available: input.undoAvailable || false,
    undo_action_type: input.undoActionType || null,
    undo_expires_at: input.undoExpiresAt || null,
    undone_at: null,
    undone_by: null,
    created_at: now,
    severity: input.severity || 'info',
    source: input.source || 'app'
  };

  if (!isDemoMode && supabase) {
    const { data, error } = await supabase
      .from('audit_trail_events')
      .insert([newEvent])
      .select()
      .single();

    if (error) {
      console.error('Failed to write audit trail to Supabase:', error);
      throw new Error(`Failed to write audit trail event: ${error.message}`);
    }
    return data;
  } else {
    // Write to LocalStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vigilen_audit_trail_events');
      const events: AuditTrailEvent[] = stored ? JSON.parse(stored) : [];
      events.unshift(newEvent);
      localStorage.setItem('vigilen_audit_trail_events', JSON.stringify(events));
    }
    return newEvent;
  }
};
