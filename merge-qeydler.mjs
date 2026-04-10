// merge-qeydler.mjs — Merges "·" prefixed sub-items into their parent qeyd
import fs from 'fs';

const filePath = './data/icd10_hierarchy.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let totalBefore = 0, totalAfter = 0;

for (const rubrika of data) {
  for (const bashliq of rubrika.bashliqlar) {
    for (const diaqnoz of bashliq.diaqnozlar) {
      if (!diaqnoz.qeydlər || diaqnoz.qeydlər.length === 0) continue;

      totalBefore += diaqnoz.qeydlər.length;

      const merged = [];
      for (const q of diaqnoz.qeydlər) {
        const trimmed = q.name.trim();
        if (trimmed.startsWith('·') && merged.length > 0) {
          // Clean up excessive spaces after bullet: "·       text" → "· text"
          const cleaned = trimmed.replace(/^·\s+/, '· ');
          merged[merged.length - 1].name += ' ' + cleaned;
        } else {
          merged.push({ ...q, name: q.name.trim() });
        }
      }

      // Re-number IDs
      merged.forEach((item, idx) => { item.id = idx; });

      diaqnoz.qeydlər = merged;
      totalAfter += merged.length;
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log(`Done! ${totalBefore} qeydlər → ${totalAfter} qeydlər (${totalBefore - totalAfter} merged)`);
