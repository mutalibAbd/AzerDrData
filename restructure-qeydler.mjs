// restructure-qeydler.mjs — Un-merge and restructure qeydlər into parent/children hierarchy
import fs from 'fs';

const filePath = './data/icd10_hierarchy.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let totalParents = 0, totalChildren = 0, totalStandalone = 0;

for (const rubrika of data) {
  for (const bashliq of rubrika.bashliqlar) {
    for (const diaqnoz of bashliq.diaqnozlar) {
      if (!diaqnoz.qeydlər || diaqnoz.qeydlər.length === 0) continue;

      const newQeydler = [];

      for (const q of diaqnoz.qeydlər) {
        const name = q.name.trim();

        // Check if this merged item contains " · " (bullet children)
        if (name.includes(' · ')) {
          const parts = name.split(' · ');
          const parentName = parts[0].trim();
          const children = parts.slice(1).map((child, idx) => ({
            id: idx,
            name: child.trim()
          }));

          newQeydler.push({
            id: newQeydler.length,
            name: parentName,
            altSecimler: children
          });
          totalParents++;
          totalChildren += children.length;
        } else {
          // Standalone item - no children
          newQeydler.push({
            id: newQeydler.length,
            name: name,
            altSecimler: []
          });
          totalStandalone++;
        }
      }

      diaqnoz.qeydlər = newQeydler;
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log(`Done!`);
console.log(`  Parents with children: ${totalParents}`);
console.log(`  Total children: ${totalChildren}`);
console.log(`  Standalone items: ${totalStandalone}`);
console.log(`  Total qeydlər entries: ${totalParents + totalStandalone}`);
