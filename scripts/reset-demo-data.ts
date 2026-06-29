import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('=====================================================');
  console.log('       VYGILENCE HIGH-VOLUME DEMO RESET SCRIPT       ');
  console.log('=====================================================');

  // Verify confirm flag
  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm');

  if (!isConfirmed) {
    console.error('ERROR: Confirmation is required to execute this script.');
    console.error('Please run the script with the --confirm flag:');
    console.error('  npx tsx scripts/reset-demo-data.ts --confirm');
    console.log('=====================================================');
    process.exit(1);
  }

  // Verify environment configurations
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
    console.error('Please configure them in your .env.local file to clean up remote Supabase demo data.');
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
  const demoAuthId = '00000000-0000-0000-0000-a001a001a001';

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
    console.error('ABORTING: Reset aborted to prevent pollution or data loss of real company workspace.');
    process.exit(1);
  }

  if (!existingOrg) {
    console.log('Demo organization Overview360 Demo Logistics Ltd does not exist in the database.');
    console.log('No data to reset.');
    console.log('=====================================================');
    return;
  }

  // 2. Count existing records before deleting them for detailed output reporting
  console.log('Scanning database for demo records to delete...');
  const tables = [
    { name: 'matrix_cells', col: 'organisation_id' },
    { name: 'audit_trail_events', col: 'organization_id' },
    { name: 'audit_packs', col: 'organization_id' },
    { name: 'action_updates', col: 'organisation_id' },
    { name: 'action_documents', col: 'organisation_id' },
    { name: 'requirement_actions', col: 'organisation_id' },
    { name: 'actions', col: 'organisation_id' },
    { name: 'requirement_evidence_criterion_matches', col: 'organisation_id' },
    { name: 'requirement_evidence_criteria', col: 'organisation_id' },
    { name: 'requirement_documents', col: 'organisation_id' },
    { name: 'requirements', col: 'organisation_id' },
    { name: 'competency_record_documents', col: 'organisation_id' },
    { name: 'competency_records', col: 'organisation_id' },
    { name: 'evidence_documents', col: 'organization_id' },
    { name: 'competency_types', col: 'organisation_id' },
    { name: 'people', col: 'organisation_id' },
    { name: 'organization_members', col: 'organization_id' },
    { name: 'profiles', col: 'organization_id' }
  ];

  const deleteCounts: Record<string, number> = {};

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
        .eq(table.col, demoOrgId);
      
      if (!error) {
        deleteCounts[table.name] = count || 0;
      } else {
        deleteCounts[table.name] = 0;
      }
    } catch (e) {
      deleteCounts[table.name] = 0;
    }
  }

  console.log('The following records will be deleted:');
  console.log(`- organizations: 1 (Overview360 Demo Logistics Ltd)`);
  for (const [table, count] of Object.entries(deleteCounts)) {
    console.log(`- ${table}: ${count}`);
  }
  console.log('=====================================================');

  // 3. Execute deletes
  console.log('Executing deletion...');

  // Delete profiles first to avoid foreign key set null or references lock issues
  const { error: profileDelError } = await supabase.from('profiles').delete().eq('organization_id', demoOrgId);
  if (profileDelError) {
    console.error(`Failed to delete profiles: ${profileDelError.message}`);
    process.exit(1);
  }

  // Delete the organization. Cascading deletes will remove related records in other tables.
  const { error: orgDelError } = await supabase.from('organizations').delete().eq('id', demoOrgId);
  if (orgDelError) {
    console.error(`Failed to delete organization: ${orgDelError.message}`);
    process.exit(1);
  }

  // 4. Delete user from auth.users if exists
  console.log('Checking if demo auth user needs to be removed from auth.users...');
  try {
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (!listError && userList?.users) {
      const match = userList.users.find(u => u.id === demoAuthId || u.email === 'demo.administrator@demologistics.example.com');
      if (match) {
        console.log(`Removing demo user ${match.email} (ID: ${match.id}) from auth.users...`);
        const { error: userDelError } = await supabase.auth.admin.deleteUser(match.id);
        if (userDelError) {
          console.warn(`Warning: Could not delete user from auth.users: ${userDelError.message}`);
          console.warn('You can manually clean up this auth user in the Supabase Dashboard if required.');
        } else {
          console.log('✓ Demo auth user successfully deleted.');
        }
      } else {
        console.log('No matching demo user found in auth.users.');
      }
    }
  } catch (err) {
    console.warn(`Could not check or delete auth.users: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log('=====================================================');
  console.log('✓ Reset complete! All demo data has been cleaned up.');
  console.log('=====================================================');
}

main().catch(err => {
  console.error('Reset process encountered an unhandled error:');
  console.error(err);
  process.exit(1);
});
