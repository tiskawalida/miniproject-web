// scripts/export-db.js
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'database', 'smartstock.db');
const outputPath = path.join(__dirname, '..', 'database', 'dump.sql');

function escapeValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'object') return escapeValue(JSON.stringify(v));
  return `'${v.toString().replace(/'/g, "''")}'`;
}

function main() {
  if (!fs.existsSync(dbPath)) {
    console.error('Database file not found at', dbPath);
    process.exit(1);
  }

  const db = new Database(dbPath, { readonly: true });

  const header = [
    '-- ============================================',
    '-- SMARTSTOCK PRO DATABASE DUMP',
    `-- Generated: ${new Date().toISOString()}`,
    '-- ============================================\n'
  ];

  const stmts = [];
  stmts.push(...header);

  // Dump schema for tables, indexes, triggers, views
  const objects = db.prepare(`SELECT type, name, sql FROM sqlite_master WHERE sql NOT NULL AND type IN ('table','index','trigger','view') ORDER BY type='table' DESC`).all();

  // We will drop user tables first (exclude sqlite_sequence and sqlite_stat1/2)
  const tableNames = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();

  tableNames.forEach(t => {
    stmts.push(`-- Table: ${t.name}`);
    stmts.push(`DROP TABLE IF EXISTS \"${t.name}\";`);
    if (t.sql) stmts.push(t.sql + ';');
    stmts.push('');
  });

  // Dump other objects (indexes, triggers, views) - include after tables
  objects.forEach(obj => {
    if (obj.type !== 'table') {
      stmts.push(`-- ${obj.type}: ${obj.name}`);
      stmts.push(obj.sql + ';');
      stmts.push('');
    }
  });

  // Dump data as INSERTs
  tableNames.forEach(t => {
    const rows = db.prepare(`SELECT * FROM \"${t.name}\"`).all();
    if (rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const colList = cols.map(c => `\"${c}\"`).join(', ');
    rows.forEach(r => {
      const values = cols.map(c => escapeValue(r[c])).join(', ');
      stmts.push(`INSERT INTO \"${t.name}\" (${colList}) VALUES (${values});`);
    });
    stmts.push('');
  });

  stmts.push('-- ============================================');
  stmts.push('-- END OF DUMP');
  stmts.push('-- ============================================');

  fs.writeFileSync(outputPath, stmts.join('\n'), 'utf8');
  console.log('✅ Dump created at', outputPath);
  db.close();
}

main();
