const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'smartstock.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

module.exports = { getDb };
