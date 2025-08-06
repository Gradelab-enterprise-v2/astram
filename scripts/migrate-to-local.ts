#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Supabase clients
const localSupabase = createClient(
  'http://localhost:54321',
  process.env.VITE_SUPABASE_LOCAL_ANON_KEY!
);

const remoteSupabase = createClient(
  process.env.VITE_SUPABASE_REMOTE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

interface MigrationTable {
  name: string;
  order: number;
  dependencies?: string[];
}

const migrationTables: MigrationTable[] = [
  { name: 'profiles', order: 1 },
  { name: 'system_settings', order: 2 },
  { name: 'plans', order: 3 },
  { name: 'user_plans', order: 4 },
  { name: 'administrators', order: 5 },
  { name: 'departments', order: 6 },
  { name: 'subjects', order: 7 },
  { name: 'classes', order: 8 },
  { name: 'students', order: 9 },
  { name: 'teacher_subjects', order: 10 },
  { name: 'student_answer_sheets', order: 11 },
  { name: 'test_papers', order: 12 },
  { name: 'tests', order: 13 },
  { name: 'test_results', order: 14 },
  { name: 'analysis_history', order: 15 },
  { name: 'google_classroom_connections', order: 16 },
  { name: 'google_classroom_courses', order: 17 },
  { name: 'google_classroom_students', order: 18 },
  { name: 'google_classroom_sync_logs', order: 19 },
];

async function migrateTable(tableName: string) {
  try {
    console.log(`Migrating table: ${tableName}`);
    
    // Fetch data from remote
    const { data, error } = await remoteSupabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`Error fetching from ${tableName}:`, error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log(`No data found in ${tableName}`);
      return true;
    }
    
    // Insert data into local
    const { error: insertError } = await localSupabase
      .from(tableName)
      .upsert(data, { onConflict: 'id' });
    
    if (insertError) {
      console.error(`Error inserting into ${tableName}:`, insertError);
      return false;
    }
    
    console.log(`✅ Successfully migrated ${data.length} records from ${tableName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error);
    return false;
  }
}

async function migrateAllTables() {
  console.log('🚀 Starting migration from remote to local Supabase...');
  
  // Sort tables by order
  const sortedTables = migrationTables.sort((a, b) => a.order - b.order);
  
  for (const table of sortedTables) {
    const success = await migrateTable(table.name);
    if (!success) {
      console.error(`❌ Migration failed for ${table.name}`);
      return false;
    }
  }
  
  console.log('✅ Migration completed successfully!');
  return true;
}

// Run migration
migrateAllTables().catch(console.error); 