/**
 * AzerDr - Re-seed icd_qeydler table with hierarchical parent/children structure
 * 
 * Usage: node supabase/reseed-qeydler.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://ujpzllhzpbydvecnomaq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcHpsbGh6cGJ5ZHZlY25vbWFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0OTY1NSwiZXhwIjoyMDkxMzI1NjU1fQ._YzeW74Di_tvirTq5tldr56v_86Onbdp2WiLBO23l9M';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const icdData = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'icd10_hierarchy.json'), 'utf-8'));

async function main() {
  // 1. Delete all existing qeydler
  console.log('Deleting existing icd_qeydler...');
  const { error: delErr } = await supabase.from('icd_qeydler').delete().gte('id', 0);
  if (delErr) { console.error('Delete error:', delErr.message); return; }
  console.log('Deleted.');

  // 2. Fetch diaqnozlar, bashliqlar, rubrikas from Supabase to map IDs
  console.log('Fetching reference data...');
  let allDiaqnozlar = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('icd_diaqnozlar').select('id,code,name,bashliq_id').range(from, from + 999);
    if (error) { console.error('Fetch error:', error.message); return; }
    allDiaqnozlar.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const { data: allBashliqlar } = await supabase.from('icd_bashliqlar').select('id,code,name,rubrika_id');
  const { data: allRubrikas } = await supabase.from('icd_rubrikas').select('id,code,name');

  // 3. Build parent rows first, then children rows
  const parentRows = [];
  const childrenMap = []; // { parentGlobalId, children: [{name}] }
  let globalId = 1;

  for (const rubrika of icdData) {
    const dbRubrika = allRubrikas.find(r => r.code === rubrika.code || r.name === rubrika.name);
    if (!dbRubrika) continue;
    const dbBashliqlarForRubrika = allBashliqlar.filter(b => b.rubrika_id === dbRubrika.id);

    for (const bashliq of rubrika.bashliqlar) {
      const dbBashliq = dbBashliqlarForRubrika.find(b => b.code === bashliq.code || b.name === bashliq.name);
      if (!dbBashliq) continue;
      const dbDiaqnozlarForBashliq = allDiaqnozlar.filter(d => d.bashliq_id === dbBashliq.id);

      for (const diaqnoz of bashliq.diaqnozlar) {
        if (!diaqnoz.qeydlər || diaqnoz.qeydlər.length === 0) continue;
        const dbDiaqnoz = dbDiaqnozlarForBashliq.find(d => d.code === diaqnoz.code || d.name === diaqnoz.name);
        if (!dbDiaqnoz) continue;

        for (const qeyd of diaqnoz.qeydlər) {
          const parentId = globalId++;
          parentRows.push({
            id: parentId,
            diaqnoz_id: dbDiaqnoz.id,
            name: qeyd.name,
            parent_id: null
          });

          if (qeyd.altSecimler && qeyd.altSecimler.length > 0) {
            const children = qeyd.altSecimler.map(child => ({
              id: globalId++,
              diaqnoz_id: dbDiaqnoz.id,
              name: child.name,
              parent_id: parentId
            }));
            childrenMap.push(...children);
          }
        }
      }
    }
  }

  // 4. Insert parents first
  console.log(`Inserting ${parentRows.length} parent qeydlər...`);
  for (let i = 0; i < parentRows.length; i += 500) {
    const batch = parentRows.slice(i, i + 500);
    const { error } = await supabase.from('icd_qeydler').insert(batch);
    if (error) { console.error(`Insert parents error at ${i}:`, error.message); return; }
  }

  // 5. Insert children
  console.log(`Inserting ${childrenMap.length} child qeydlər...`);
  for (let i = 0; i < childrenMap.length; i += 500) {
    const batch = childrenMap.slice(i, i + 500);
    const { error } = await supabase.from('icd_qeydler').insert(batch);
    if (error) { console.error(`Insert children error at ${i}:`, error.message); return; }
  }

  console.log(`Done! ${parentRows.length} parents + ${childrenMap.length} children = ${parentRows.length + childrenMap.length} total qeydlər`);
}

main().catch(console.error);
