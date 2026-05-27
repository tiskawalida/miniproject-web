const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'smartstock.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🚀 Initializing SmartStock Pro Database...');

// ============================================================
// CREATE TABLES
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','manager','staff','viewer')),
    warehouse_id INTEGER,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    latitude REAL,
    longitude REAL,
    manager_name TEXT,
    phone TEXT,
    capacity INTEGER DEFAULT 1000,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    supplier_id INTEGER,
    unit TEXT DEFAULT 'pcs',
    price REAL DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    UNIQUE(product_id, warehouse_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in','out')),
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_per_unit REAL DEFAULT 0,
    total_price REAL DEFAULT 0,
    note TEXT,
    reference_no TEXT,
    user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    product_id INTEGER NOT NULL,
    from_warehouse_id INTEGER NOT NULL,
    to_warehouse_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','cancelled')),
    note TEXT,
    requested_by INTEGER,
    approved_by INTEGER,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    severity TEXT DEFAULT 'info' CHECK(severity IN ('critical','warning','info')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info' CHECK(severity IN ('critical','warning','info')),
    is_read INTEGER DEFAULT 0,
    target_role TEXT,
    related_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS job_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
    result TEXT,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS csrf_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    token TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log('✅ Tables created successfully');

// ============================================================
// SEED DATA
// ============================================================
const SALT_ROUNDS = 10;

// Seed Warehouses
const warehouseCount = db.prepare('SELECT COUNT(*) as c FROM warehouses').get().c;
if (warehouseCount === 0) {
  const insertWarehouse = db.prepare(`
    INSERT INTO warehouses (code, name, city, address, latitude, longitude, manager_name, phone, capacity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const warehouses = [
    ['WH-JKT', 'Gudang Jakarta', 'Jakarta', 'Jl. Raya Bekasi KM 18, Jakarta Timur', -6.2088, 106.8456, 'Budi Santoso', '021-8765432', 5000],
    ['WH-SBY', 'Gudang Surabaya', 'Surabaya', 'Jl. Margomulyo No. 45, Surabaya', -7.2575, 112.7521, 'Siti Rahayu', '031-7654321', 4000],
    ['WH-BDG', 'Gudang Bandung', 'Bandung', 'Jl. Soekarno Hatta No. 123, Bandung', -6.9175, 107.6191, 'Ahmad Fauzi', '022-6543210', 3000],
    ['WH-MDN', 'Gudang Medan', 'Medan', 'Jl. Gatot Subroto No. 78, Medan', 3.5952, 98.6722, 'Dewi Lestari', '061-5432109', 2500],
    ['WH-MKS', 'Gudang Makassar', 'Makassar', 'Jl. Perintis Kemerdekaan KM 10, Makassar', -5.1477, 119.4327, 'Rizky Pratama', '0411-4321098', 2000],
  ];
  warehouses.forEach(w => insertWarehouse.run(...w));
  console.log('✅ Warehouses seeded');
}

// Seed Categories
const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
if (catCount === 0) {
  const insertCat = db.prepare('INSERT INTO categories (code, name, description) VALUES (?, ?, ?)');
  [
    ['CAT-001', 'Smartphone', 'Perangkat telepon pintar dan aksesoris'],
    ['CAT-002', 'Laptop & Komputer', 'Laptop, PC, dan komponen komputer'],
    ['CAT-003', 'TV & Audio', 'Televisi, speaker, dan perangkat audio'],
    ['CAT-004', 'Kamera', 'Kamera digital, DSLR, dan aksesoris'],
    ['CAT-005', 'Aksesoris', 'Kabel, charger, casing, dan aksesoris lain'],
    ['CAT-006', 'Tablet', 'iPad, Android tablet, dan e-reader'],
    ['CAT-007', 'Perangkat Jaringan', 'Router, switch, modem, dan perangkat jaringan'],
  ].forEach(c => insertCat.run(...c));
  console.log('✅ Categories seeded');
}

// Seed Suppliers
const supCount = db.prepare('SELECT COUNT(*) as c FROM suppliers').get().c;
if (supCount === 0) {
  const insertSup = db.prepare('INSERT INTO suppliers (code, name, contact_person, email, phone, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)');
  [
    ['SUP-001', 'Samsung Electronics Indonesia', 'Park Sung Jin', 'samsung@supplier.id', '021-1234567', 'Gedung Menara BCA, Jakarta', 'Jakarta'],
    ['SUP-002', 'Apple Authorized Distributor', 'Michael Tan', 'apple@supplier.id', '021-2345678', 'Sudirman Central Business District', 'Jakarta'],
    ['SUP-003', 'Xiaomi Indonesia', 'Wang Lei', 'xiaomi@supplier.id', '021-3456789', 'Wisma GKBI, Jakarta', 'Jakarta'],
    ['SUP-004', 'Sony Indonesia', 'Hiroshi Yamamoto', 'sony@supplier.id', '021-4567890', 'World Trade Center, Jakarta', 'Jakarta'],
    ['SUP-005', 'LG Electronics Indonesia', 'Kim Dong Woo', 'lg@supplier.id', '021-5678901', 'Ratu Prabu 2, Jakarta', 'Jakarta'],
    ['SUP-006', 'ASUS Indonesia', 'Andy Chen', 'asus@supplier.id', '021-6789012', 'DBS Bank Tower, Jakarta', 'Jakarta'],
  ].forEach(s => insertSup.run(...s));
  console.log('✅ Suppliers seeded');
}

// Seed Products
const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (prodCount === 0) {
  const insertProd = db.prepare('INSERT INTO products (code, name, description, category_id, supplier_id, unit, price, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const products = [
    ['PRD-001', 'Samsung Galaxy S25', 'Smartphone flagship Samsung terbaru', 1, 1, 'unit', 12000000, 20],
    ['PRD-002', 'iPhone 16 Pro', 'Smartphone Apple terbaru dengan chip A18', 1, 2, 'unit', 18000000, 15],
    ['PRD-003', 'Xiaomi 14T', 'Smartphone Xiaomi dengan Leica camera', 1, 3, 'unit', 8500000, 25],
    ['PRD-004', 'Samsung Galaxy Tab S10', 'Tablet Android premium Samsung', 6, 1, 'unit', 9500000, 10],
    ['PRD-005', 'ASUS ROG Laptop G16', 'Laptop gaming ASUS ROG dengan RTX 4070', 2, 6, 'unit', 25000000, 8],
    ['PRD-006', 'Sony Bravia 55" 4K', 'Televisi Sony OLED 55 inci 4K HDR', 3, 4, 'unit', 15000000, 5],
    ['PRD-007', 'Sony Alpha A7 IV', 'Kamera mirrorless Sony full-frame', 4, 4, 'unit', 35000000, 5],
    ['PRD-008', 'LG Soundbar S90QY', 'Soundbar LG Dolby Atmos 5.1.2', 3, 5, 'unit', 8000000, 8],
    ['PRD-009', 'Kabel USB-C 1m', 'Kabel USB-C data dan fast charging', 5, 3, 'pcs', 150000, 100],
    ['PRD-010', 'Router TP-Link AX5400', 'WiFi 6 Router dual-band AX5400', 7, 3, 'unit', 1200000, 30],
    ['PRD-011', 'iPad Pro 12.9"', 'Tablet Apple dengan chip M4', 6, 2, 'unit', 22000000, 10],
    ['PRD-012', 'Samsung 49" Monitor', 'Ultrawide gaming monitor 49 inci', 2, 1, 'unit', 13000000, 5],
    ['PRD-013', 'Xiaomi Mi Band 9', 'Smartband fitness tracker Xiaomi', 5, 3, 'unit', 450000, 50],
    ['PRD-014', 'ASUS ZenBook 14', 'Laptop tipis premium ASUS ZenBook', 2, 6, 'unit', 14000000, 12],
    ['PRD-015', 'Charger 65W GaN', 'Charger universal GaN 65W multi-port', 5, 6, 'unit', 350000, 80],
  ];
  products.forEach(p => insertProd.run(...p));
  console.log('✅ Products seeded');
}

// Seed Stock
const stockCount = db.prepare('SELECT COUNT(*) as c FROM stock').get().c;
if (stockCount === 0) {
  const insertStock = db.prepare('INSERT OR IGNORE INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)');
  const stockData = [
    // Jakarta (wh=1)
    [1,1,150],[2,1,80],[3,1,200],[4,1,60],[5,1,35],[6,1,25],[7,1,15],[8,1,40],[9,1,500],[10,1,120],[11,1,45],[12,1,20],[13,1,300],[14,1,55],[15,1,400],
    // Surabaya (wh=2)
    [1,2,100],[2,2,50],[3,2,150],[4,2,40],[5,2,20],[6,2,15],[7,2,8],[8,2,25],[9,2,300],[10,2,80],[11,2,30],[12,2,12],[13,2,200],[14,2,35],[15,2,250],
    // Bandung (wh=3)
    [1,3,80],[2,3,30],[3,3,120],[4,3,25],[5,3,12],[6,3,8],[7,3,4],[8,3,15],[9,3,200],[10,3,50],[11,3,20],[12,3,8],[13,3,150],[14,3,22],[15,3,180],
    // Medan (wh=4)
    [1,4,60],[2,4,20],[3,4,90],[4,4,15],[5,4,8],[6,4,5],[7,4,2],[8,4,10],[9,4,150],[10,4,35],[11,4,12],[12,4,5],[13,4,100],[14,4,18],[15,4,120],
    // Makassar (wh=5)
    [1,5,40],[2,5,12],[3,5,60],[4,5,10],[5,5,5],[6,5,3],[7,5,1],[8,5,6],[9,5,100],[10,5,20],[11,5,8],[12,5,3],[13,5,80],[14,5,10],[15,5,90],
  ];
  stockData.forEach(s => insertStock.run(...s));
  console.log('✅ Stock seeded');
}

// Seed Users
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (username, password, full_name, email, role, warehouse_id) VALUES (?, ?, ?, ?, ?, ?)');
  const users = [
    ['admin', bcrypt.hashSync('Admin@123', SALT_ROUNDS), 'Administrator Sistem', 'admin@smartstock.id', 'admin', null],
    ['manager1', bcrypt.hashSync('Manager@123', SALT_ROUNDS), 'Budi Santoso', 'manager1@smartstock.id', 'manager', 1],
    ['manager2', bcrypt.hashSync('Manager@123', SALT_ROUNDS), 'Siti Rahayu', 'manager2@smartstock.id', 'manager', 2],
    ['staff1', bcrypt.hashSync('Staff@123', SALT_ROUNDS), 'Ahmad Fauzi', 'staff1@smartstock.id', 'staff', 1],
    ['staff2', bcrypt.hashSync('Staff@123', SALT_ROUNDS), 'Dewi Lestari', 'staff2@smartstock.id', 'staff', 2],
    ['staff3', bcrypt.hashSync('Staff@123', SALT_ROUNDS), 'Rizky Pratama', 'staff3@smartstock.id', 'staff', 3],
    ['viewer1', bcrypt.hashSync('Viewer@123', SALT_ROUNDS), 'Diana Putri', 'viewer1@smartstock.id', 'viewer', null],
  ];
  users.forEach(u => insertUser.run(...u));
  console.log('✅ Users seeded');
}

// Seed Transactions
const txCount = db.prepare('SELECT COUNT(*) as c FROM transactions').get().c;
if (txCount === 0) {
  const insertTx = db.prepare('INSERT INTO transactions (code, type, product_id, warehouse_id, quantity, price_per_unit, total_price, note, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const now = new Date();
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const d = new Date(now - daysAgo * 86400000);
    const dateStr = d.toISOString().replace('T', ' ').split('.')[0];
    const type = i % 3 === 0 ? 'out' : 'in';
    const prodId = (i % 15) + 1;
    const whId = (i % 5) + 1;
    const qty = Math.floor(Math.random() * 50) + 1;
    const price = Math.floor(Math.random() * 5000000) + 100000;
    const code = `TRX-${String(i + 1).padStart(5, '0')}`;
    insertTx.run(code, type, prodId, whId, qty, price, qty * price, type === 'in' ? 'Pembelian rutin' : 'Penjualan', 1, dateStr);
  }
  console.log('✅ Transactions seeded');
}

// Seed Audit Logs
const logCount = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
if (logCount === 0) {
  const insertLog = db.prepare('INSERT INTO audit_logs (user_id, username, action, entity, details, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const actions = [
    [1, 'admin', 'LOGIN', 'users', 'User admin berhasil login', 'info', '2026-05-27 08:00:00'],
    [2, 'manager1', 'CREATE', 'transactions', 'Transaksi barang masuk TRX-00001', 'info', '2026-05-27 08:30:00'],
    [1, 'admin', 'CREATE', 'products', 'Produk baru PRD-016 ditambahkan', 'info', '2026-05-27 09:00:00'],
    [3, 'manager2', 'LOGIN', 'users', 'User manager2 berhasil login', 'info', '2026-05-27 09:15:00'],
    [1, 'admin', 'DELETE', 'products', 'Percobaan hapus produk gagal - stok masih ada', 'warning', '2026-05-27 10:00:00'],
    [4, 'staff1', 'LOGIN', 'users', 'User staff1 berhasil login', 'info', '2026-05-27 10:30:00'],
    [1, 'admin', 'UPDATE', 'users', 'Password user staff2 direset oleh admin', 'warning', '2026-05-27 11:00:00'],
    [2, 'manager1', 'CREATE', 'transfers', 'Transfer barang WH-JKT ke WH-SBY', 'info', '2026-05-27 11:30:00'],
    [1, 'admin', 'SYSTEM', 'notifications', 'Alert stok kritis: PRD-007 di WH-MDN < min_stock', 'critical', '2026-05-27 12:00:00'],
    [5, 'staff2', 'LOGOUT', 'users', 'User staff2 logout', 'info', '2026-05-27 12:30:00'],
  ];
  actions.forEach(a => insertLog.run(...a));
  console.log('✅ Audit logs seeded');
}

// Seed Notifications
const notifCount = db.prepare('SELECT COUNT(*) as c FROM notifications').get().c;
if (notifCount === 0) {
  const insertNotif = db.prepare('INSERT INTO notifications (type, title, message, severity, target_role, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  [
    ['stock_alert', 'Stok Kritis: Sony Alpha A7 IV', 'Stok Sony Alpha A7 IV di Gudang Makassar hanya tersisa 1 unit (min: 5)', 'critical', 'admin', '2026-05-27 12:00:00'],
    ['stock_alert', 'Stok Rendah: ASUS ROG Laptop', 'Stok ASUS ROG Laptop di Gudang Makassar hanya tersisa 5 unit (min: 8)', 'warning', 'admin', '2026-05-27 11:00:00'],
    ['transfer', 'Transfer Selesai', 'Transfer 50 unit Samsung Galaxy S25 dari Jakarta ke Surabaya telah selesai', 'info', 'manager', '2026-05-27 10:00:00'],
    ['system', 'Backup Database Berhasil', 'Backup otomatis database berhasil dilakukan pukul 02:00', 'info', 'admin', '2026-05-27 02:00:00'],
  ].forEach(n => insertNotif.run(...n));
  console.log('✅ Notifications seeded');
}

console.log('');
console.log('🎉 Database SmartStock Pro berhasil diinisialisasi!');
console.log('');
console.log('📋 Test Accounts:');
console.log('  Admin    : admin / Admin@123');
console.log('  Manager  : manager1 / Manager@123');
console.log('  Staff    : staff1 / Staff@123');
console.log('  Viewer   : viewer1 / Viewer@123');

db.close();
module.exports = db;
