const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, '..', 'database', 'dump.sql');
const outPath = path.join(__dirname, '..', 'database', 'smartstockpro_schema.sql');

const txt = fs.readFileSync(dumpPath, 'utf8');
const marker = /\nINSERT INTO /i;
const m = txt.search(marker);
let schema = txt;
if (m !== -1) {
  schema = txt.slice(0, m).trim() + '\n';
}
fs.writeFileSync(outPath, schema, 'utf8');
console.log('Wrote schema-only SQL to', outPath);
