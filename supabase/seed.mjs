/**
 * AzerDr - Supabase Data Seeding Script
 * 
 * Prerequisites:
 *   1. Run migration.sql in Supabase SQL Editor first
 *   2. npm install @supabase/supabase-js (run from project root)
 * 
 * Usage:
 *   node supabase/seed.mjs
 * 
 * Environment variables (or edit the constants below):
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_KEY - Your Supabase service_role key (recommended) or anon key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ──────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ujpzllhzpbydvecnomaq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcHpsbGh6cGJ5ZHZlY25vbWFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0OTY1NSwiZXhwIjoyMDkxMzI1NjU1fQ._YzeW74Di_tvirTq5tldr56v_86Onbdp2WiLBO23l9M';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ────────────────────────────────────────────────
function loadJson(relativePath) {
  const fullPath = join(__dirname, '..', 'data', relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

async function batchInsert(table, rows, batchSize = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`  ❌ Error inserting into ${table} (batch ${Math.floor(i/batchSize)+1}): ${error.message}`);
      if (error.details) console.error(`     Details: ${error.details}`);
      return false;
    }
    inserted += batch.length;
    process.stdout.write(`  ${table}: ${inserted}/${rows.length}\r`);
  }
  console.log(`  ✅ ${table}: ${inserted} rows inserted`);
  return true;
}

// Generate BCrypt hashes at runtime
const ADMIN_HASH = bcrypt.hashSync('admin123', 11);
// test123 → BCrypt hash
const DOCTOR_HASH = bcrypt.hashSync('test123', 11);

// ── Seed Functions ─────────────────────────────────────────

async function seedAdmin() {
  console.log('\n📋 Checking if admin exists...');
  const { data } = await supabase.from('users').select('id').eq('username', 'admin').single();
  if (data) {
    console.log('  ⏩ Admin already exists, skipping');
    return;
  }

  // Use Supabase SQL to insert with bcrypt hash (since we can't easily generate bcrypt in JS without extra deps)
  // Instead, we'll insert via REST and the backend will need to handle login
  const { error } = await supabase.from('users').insert({
    username: 'admin',
    password_hash: ADMIN_HASH,
    full_name: 'Administrator',
    role: 'admin',
    is_active: true
  });

  if (error) {
    console.error(`  ❌ Error creating admin: ${error.message}`);
    console.log('  💡 Note: You may need to use the service_role key instead of the anon key');
    console.log('  💡 Find it in Supabase Dashboard → Settings → API → service_role (secret)');
  } else {
    console.log('  ✅ Admin user created (username: admin, password: admin123)');
  }
}

async function seedIcdHierarchy() {
  console.log('\n📋 Seeding ICD-10 hierarchy...');

  // Check if already seeded
  const { count } = await supabase.from('icd_rubrikas').select('*', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log(`  ⏩ ICD data already exists (${count} rubrikas), skipping`);
    return;
  }

  const icdData = loadJson('icd10_hierarchy.json');

  const rubrikas = [];
  const bashliqlar = [];
  const diaqnozlar = [];
  const qeydler = [];

  let rubrikaId = 1;
  let bashliqId = 1;
  let diaqnozId = 1;
  let qeydId = 1;

  for (const rubrika of icdData) {
    const rId = rubrikaId++;
    rubrikas.push({
      id: rId,
      code: rubrika.code,
      name: rubrika.name
    });

    for (const bashliq of (rubrika.bashliqlar || [])) {
      const bId = bashliqId++;
      bashliqlar.push({
        id: bId,
        rubrika_id: rId,
        code: bashliq.code,
        name: bashliq.name
      });

      for (const diaqnoz of (bashliq.diaqnozlar || [])) {
        // Skip placeholder entries
        if (diaqnoz.code === '---' || diaqnoz.name === '---') continue;

        const dId = diaqnozId++;
        diaqnozlar.push({
          id: dId,
          bashliq_id: bId,
          code: diaqnoz.code,
          name: diaqnoz.name
        });

        // qeydlər (sub-notes)
        const qeydlerArr = diaqnoz['qeydl\u0259r'] || diaqnoz.qeydler || [];
        for (const qeyd of qeydlerArr) {
          qeydler.push({
            id: qeydId++,
            diaqnoz_id: dId,
            name: qeyd.name
          });
        }
      }
    }
  }

  console.log(`  Found: ${rubrikas.length} rubrikas, ${bashliqlar.length} bashliqlar, ${diaqnozlar.length} diaqnozlar, ${qeydler.length} qeydler`);

  await batchInsert('icd_rubrikas', rubrikas);
  await batchInsert('icd_bashliqlar', bashliqlar);
  await batchInsert('icd_diaqnozlar', diaqnozlar);
  if (qeydler.length > 0) {
    await batchInsert('icd_qeydler', qeydler);
  }
}

async function seedAnomalies() {
  console.log('\n📋 Seeding anomalies...');

  // Check if already seeded
  const { count } = await supabase.from('anomalies').select('*', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log(`  ⏩ Anomalies already exist (${count}), skipping`);
    return;
  }

  const rawAnomalies = loadJson('anomalies.json');

  const anomalies = rawAnomalies.map((a, index) => ({
    id: index + 1,
    report_id: a.report_id || '',
    patient_id: a.patient_id || '',
    date: a.date || '2020-01-01',
    diagnosis: a.diagnosis || '',
    explanation: a.explanation || '',
    status: 'pending'
  }));

  console.log(`  Found: ${anomalies.length} anomalies`);
  await batchInsert('anomalies', anomalies, 300);
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  console.log('🚀 AzerDr Supabase Seeding Script');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Key: ${SUPABASE_KEY.substring(0, 20)}...`);

  // Test connection
  const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
  if (error) {
    console.error(`\n❌ Cannot connect to Supabase: ${error.message}`);
    if (error.message.includes('permission denied') || error.message.includes('401')) {
      console.log('\n💡 The anon key may not have sufficient permissions.');
      console.log('   Options:');
      console.log('   1. Use the service_role key: SUPABASE_KEY=eyJ... node supabase/seed.mjs');
      console.log('   2. Make sure you ran migration.sql first (includes GRANT statements)');
    }
    process.exit(1);
  }
  console.log('✅ Connected to Supabase successfully');

  await seedAdmin();
  await seedIcdHierarchy();
  await seedAnomalies();

  console.log('\n🎉 Seeding complete!');
  console.log('   Check your Supabase Dashboard → Table Editor to verify data');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
