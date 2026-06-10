import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = process.argv[2] || '/home/fnk/Downloads/ikariam.xlsx';
const OUT_PATH = join(__dirname, '../src/data/buildings.json');
const PY_SCRIPT = join(__dirname, 'import-buildings-xlsx.py');

const raw = execFileSync('python3', [PY_SCRIPT, XLSX_PATH], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
const buildings = JSON.parse(raw);

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(buildings, null, 2) + '\n');

console.log(`Imported ${buildings.length} buildings to ${OUT_PATH}`);
for (const b of buildings) {
  console.log(`  ${b.name} (id=${b.buildingId}): ${b.levels.length} levels`);
}
