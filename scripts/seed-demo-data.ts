import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { generateDemoData } from './generate-demo-data';

// Inline .env file loader for custom script environments
function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const key = trimmed.substring(0, firstEqual).trim();
            const val = trimmed.substring(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
            if (key && !(key in process.env)) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

// Helper to chunk upserts to avoid API batch size/query parameter limits
async function upsertRows(supabase: any, table: string, rows: any[]) {
  const BATCH_SIZE = 100;
  let count = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch);
    if (error) {
      throw new Error(`Failed to upsert to ${table}: ${error.message}`);
    }
    count += batch.length;
  }
  return count;
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('=====================================================');
  console.log('       VYGILENCE HIGH-VOLUME DEMO SEEDING SCRIPT     ');
  console.log('=====================================================');

  // Verify environment configurations
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
    console.error('Please configure them in your .env.local file:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key');
    console.log('=====================================================');
    process.exit(1);
  }

  const isRemote = supabaseUrl.includes('supabase.co');
  console.log(`Target database mode: ${isRemote ? 'REMOTE SUPABASE' : 'LOCAL/EMULATED SUPABASE'}`);
  console.log(`Supabase URL:         ${supabaseUrl}`);
  console.log(`Target Organization:  Overview360 Demo Logistics Ltd`);
  console.log(`Demo Org ID:          00000000-0000-0000-0000-d3e0d3e0d3e0`);
  console.log('=====================================================');

  // Initialize Admin Supabase client with RLS bypass privileges
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const demoOrgId = '00000000-0000-0000-0000-d3e0d3e0d3e0';

  // 1. CRITICAL SAFETY CHECK: Verify organization ID is not occupied by real client organization
  const { data: existingOrg, error: orgCheckError } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', demoOrgId)
    .maybeSingle();

  if (orgCheckError) {
    console.error(`Safety check failed: ${orgCheckError.message}`);
    process.exit(1);
  }

  if (existingOrg && existingOrg.name !== 'Overview360 Demo Logistics Ltd') {
    console.error(`CRITICAL SAFETY ERROR: Target Org ID ${demoOrgId} belongs to '${existingOrg.name}'.`);
    console.error('ABORTING: Seeding aborted to prevent pollution or data loss of real company workspace.');
    process.exit(1);
  }

  // Generate deterministic data using common generator
  const data = generateDemoData();

  // 2. Ensure Demo Administrator exists in auth.users
  console.log('Ensuring Demo Auth user exists in auth.users...');
  const demoAuthId = '00000000-0000-0000-0000-a001a001a001';
  const demoEmail = 'demo.administrator@demologistics.example.com';
  const demoPassword = 'demoPassword123!';

  let authUserExists = false;
  try {
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (!listError && userList?.users) {
      const match = userList.users.find(u => u.id === demoAuthId || u.email === demoEmail);
      if (match) {
        authUserExists = true;
        console.log(`✓ Demo auth user found (ID: ${match.id}, Email: ${match.email}).`);
      }
    }
  } catch (err) {
    console.log('Could not list auth users. Proceeding to safe upsert attempt...');
  }

  if (!authUserExists) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      id: demoAuthId,
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo Administrator'
      }
    });

    if (createError) {
      console.warn(`WARNING: Failed to create auth user in auth.users: ${createError.message}`);
      console.warn('The profile will still be upserted. You may need to create this user manually in the Supabase Dashboard:');
      console.warn(`  Email:    ${demoEmail}`);
      console.warn(`  User ID:  ${demoAuthId}`);
    } else {
      console.log(`✓ Successfully created auth user in auth.users (ID: ${newUser.user.id}).`);
    }
  }

  // 3. Reset existing demo profile and organization (cascades to all children)
  console.log('\nCleaning up existing demo organization and profiles...');
  const { error: profileDelError } = await supabase.from('profiles').delete().eq('organization_id', demoOrgId);
  if (profileDelError) {
    console.warn(`Warning: Profile cleanup error: ${profileDelError.message}`);
  }

  const { error: orgDelError } = await supabase.from('organizations').delete().eq('id', demoOrgId);
  if (orgDelError) {
    console.warn(`Warning: Organization cleanup error: ${orgDelError.message}`);
  }

  // 4. Seed Organization
  console.log('\nUpserting demo records...');
  console.log(`- Organizations: 1 (${data.org.name})`);
  await supabase.from('organizations').upsert([data.org]);

  // 5. Seed Profile & Membership
  console.log(`- Profiles: 1 (${data.profile.full_name})`);
  await supabase.from('profiles').upsert([data.profile]);

  const memberRow = {
    id: '00000000-0000-0000-0000-b001b001b001',
    organization_id: demoOrgId,
    user_id: demoAuthId,
    role: 'Owner',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z'
  };
  console.log(`- Organization Members: 1`);
  await supabase.from('organization_members').upsert([memberRow]);

  // 6. Seed People
  const peopleCount = await upsertRows(supabase, 'people', data.people);
  console.log(`- People: ${peopleCount}`);

  // 7. Seed Competency Types
  const ctCount = await upsertRows(supabase, 'competency_types', data.competencyTypes);
  console.log(`- Competency Types: ${ctCount}`);

  // 8. Seed Evidence Documents
  // Clean evidence_documents storage urls if they don't align with supabase host
  const cleanedDocs = data.evidenceDocuments.map(doc => {
    // If the file_url hostname is different from current supabaseUrl, correct it
    if (doc.file_url) {
      try {
        const urlObj = new URL(doc.file_url);
        const targetUrlObj = new URL(supabaseUrl);
        urlObj.host = targetUrlObj.host;
        doc.file_url = urlObj.toString();
      } catch (e) {}
    }
    return doc;
  });
  const docCount = await upsertRows(supabase, 'evidence_documents', cleanedDocs);
  console.log(`- Evidence Documents: ${docCount}`);

  // 9. Seed Competency Records
  const recCount = await upsertRows(supabase, 'competency_records', data.competencyRecords);
  console.log(`- Competency Records: ${recCount}`);

  // 10. Seed Competency Record Document Links
  const crdCount = await upsertRows(supabase, 'competency_record_documents', data.competencyRecordDocuments);
  console.log(`- Competency Record Documents: ${crdCount}`);

  // 11. Seed Requirements
  const reqCount = await upsertRows(supabase, 'requirements', data.requirements);
  console.log(`- Requirements: ${reqCount}`);

  // 12. Seed Requirement Document Links
  const rdCount = await upsertRows(supabase, 'requirement_documents', data.requirementDocuments);
  console.log(`- Requirement Documents: ${rdCount}`);

  // 13. Seed Requirement Evidence Criteria
  const recritCount = await upsertRows(supabase, 'requirement_evidence_criteria', data.requirementEvidenceCriteria);
  console.log(`- Requirement Evidence Criteria: ${recritCount}`);

  // 14. Seed Criteria Matches
  const matchCount = await upsertRows(supabase, 'requirement_evidence_criterion_matches', data.requirementEvidenceCriterionMatches);
  console.log(`- Criteria Matches: ${matchCount}`);

  // 15. Seed Actions
  const actionCount = await upsertRows(supabase, 'actions', data.actions);
  console.log(`- Actions: ${actionCount}`);

  // 16. Seed Requirement Action links
  const raCount = await upsertRows(supabase, 'requirement_actions', data.requirementActions);
  console.log(`- Requirement Actions: ${raCount}`);

  // 17. Seed Action Document links
  const adCount = await upsertRows(supabase, 'action_documents', data.actionDocuments);
  console.log(`- Action Documents: ${adCount}`);

  // 18. Seed Action Updates
  const auCount = await upsertRows(supabase, 'action_updates', data.actionUpdates);
  console.log(`- Action Updates: ${auCount}`);

  // 19. Seed Audit Packs
  const packCount = await upsertRows(supabase, 'audit_packs', data.auditPacks);
  console.log(`- Audit Packs: ${packCount}`);

  // 20. Seed Audit Trail Events (enforce triggers are bypassed)
  const auditEventCount = await upsertRows(supabase, 'audit_trail_events', data.auditTrailEvents);
  console.log(`- Audit Trail Events: ${auditEventCount}`);

  // 21. Seed Matrix Cells
  const cellCount = await upsertRows(supabase, 'matrix_cells', data.matrixCells);
  console.log(`- Matrix Cells: ${cellCount}`);

  console.log('=====================================================');
  console.log('✓ Seeding complete! Database is fully populated.');
  console.log(`Seed batch ID: batch-demo-logistic-seeding`);
  console.log('=====================================================');
  console.log('How to log in and view seeded data in the Overview360 application:');
  console.log(`1. Ensure NEXT_PUBLIC_VIGILEN_APP_MODE is set to 'production'`);
  console.log(`2. Log in with:`);
  console.log(`   Email:    ${demoEmail}`);
  console.log(`   Password: ${demoPassword}`);
  console.log(`3. Navigate the dashboard to test responsiveness and matrix cells.`);
  console.log('=====================================================');
}

main().catch(err => {
  console.error('Seeding process encountered an unhandled error:');
  console.error(err);
  process.exit(1);
});
