-- ============================================
-- SMARTSTOCK PRO DATABASE DUMP
-- Generated: 2026-05-27T16:14:03.779Z
-- ============================================

-- Table: audit_logs
DROP TABLE IF EXISTS "audit_logs";
CREATE TABLE audit_logs (
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

-- Table: categories
DROP TABLE IF EXISTS "categories";
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

-- Table: csrf_tokens
DROP TABLE IF EXISTS "csrf_tokens";
CREATE TABLE csrf_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    token TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

-- Table: job_queue
DROP TABLE IF EXISTS "job_queue";
CREATE TABLE job_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
    result TEXT,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

-- Table: notifications
DROP TABLE IF EXISTS "notifications";
CREATE TABLE notifications (
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

-- Table: products
DROP TABLE IF EXISTS "products";
CREATE TABLE products (
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

-- Table: stock
DROP TABLE IF EXISTS "stock";
CREATE TABLE stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    UNIQUE(product_id, warehouse_id)
  );

-- Table: suppliers
DROP TABLE IF EXISTS "suppliers";
CREATE TABLE suppliers (
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

-- Table: transactions
DROP TABLE IF EXISTS "transactions";
CREATE TABLE transactions (
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

-- Table: transfers
DROP TABLE IF EXISTS "transfers";
CREATE TABLE transfers (
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

-- Table: users
DROP TABLE IF EXISTS "users";
CREATE TABLE users (
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

-- Table: warehouses
DROP TABLE IF EXISTS "warehouses";
CREATE TABLE warehouses (
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

INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (1, 1, 'admin', 'LOGIN', 'users', NULL, 'User admin berhasil login', NULL, NULL, 'info', '2026-05-27 08:00:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (2, 2, 'manager1', 'CREATE', 'transactions', NULL, 'Transaksi barang masuk TRX-00001', NULL, NULL, 'info', '2026-05-27 08:30:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (3, 1, 'admin', 'CREATE', 'products', NULL, 'Produk baru PRD-016 ditambahkan', NULL, NULL, 'info', '2026-05-27 09:00:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (4, 3, 'manager2', 'LOGIN', 'users', NULL, 'User manager2 berhasil login', NULL, NULL, 'info', '2026-05-27 09:15:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (5, 1, 'admin', 'DELETE', 'products', NULL, 'Percobaan hapus produk gagal - stok masih ada', NULL, NULL, 'warning', '2026-05-27 10:00:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (6, 4, 'staff1', 'LOGIN', 'users', NULL, 'User staff1 berhasil login', NULL, NULL, 'info', '2026-05-27 10:30:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (7, 1, 'admin', 'UPDATE', 'users', NULL, 'Password user staff2 direset oleh admin', NULL, NULL, 'warning', '2026-05-27 11:00:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (8, 2, 'manager1', 'CREATE', 'transfers', NULL, 'Transfer barang WH-JKT ke WH-SBY', NULL, NULL, 'info', '2026-05-27 11:30:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (9, 1, 'admin', 'SYSTEM', 'notifications', NULL, 'Alert stok kritis: PRD-007 di WH-MDN < min_stock', NULL, NULL, 'critical', '2026-05-27 12:00:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (10, 5, 'staff2', 'LOGOUT', 'users', NULL, 'User staff2 logout', NULL, NULL, 'info', '2026-05-27 12:30:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (11, NULL, 'tiskawalida@apps.ipb.ac.id', 'LOGIN_FAILED', 'users', NULL, 'Login gagal: user tidak ditemukan', NULL, NULL, 'warning', '2026-05-27 13:33:40');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (12, 7, 'viewer1', 'POST /login', 'http', NULL, 'Status: 500, Duration: 118ms', NULL, NULL, 'critical', '2026-05-27 13:36:57');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (13, 7, 'viewer1', 'POST /login', 'http', NULL, 'Status: 500, Duration: 73ms', NULL, NULL, 'critical', '2026-05-27 13:37:01');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (14, 4, 'staff1', 'LOGIN_FAILED', 'users', NULL, 'Login gagal: password salah', NULL, NULL, 'warning', '2026-05-27 13:37:45');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (15, 7, 'viewer1', 'POST /login', 'http', NULL, 'Status: 401, Duration: 74ms', NULL, NULL, 'warning', '2026-05-27 13:37:45');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (16, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 500, Duration: 98ms', NULL, NULL, 'critical', '2026-05-27 14:01:57');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (17, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 500, Duration: 77ms', NULL, NULL, 'critical', '2026-05-27 14:03:00');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (18, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 500, Duration: 122ms', NULL, NULL, 'critical', '2026-05-27 14:26:33');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (19, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 500, Duration: 89ms', NULL, NULL, 'critical', '2026-05-27 14:37:34');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (20, 1, 'admin', 'LOGIN_FAILED', 'users', NULL, 'Login gagal: password salah', NULL, NULL, 'warning', '2026-05-27 14:38:31');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (21, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 500, Duration: 77ms', NULL, NULL, 'critical', '2026-05-27 14:38:51');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (22, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 500, Duration: 79ms', NULL, NULL, 'critical', '2026-05-27 14:39:57');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (23, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 500, Duration: 78ms', NULL, NULL, 'critical', '2026-05-27 14:40:05');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (24, 1, 'admin', 'LOGIN', 'users', NULL, 'Login berhasil dari IP: ::1', NULL, NULL, 'info', '2026-05-27 14:42:03');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (25, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 200, Duration: 87ms', NULL, NULL, 'info', '2026-05-27 14:42:03');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (26, 1, 'admin', 'LOGIN', 'users', NULL, 'Login berhasil dari IP: ::1', NULL, NULL, 'info', '2026-05-27 14:42:34');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (27, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 200, Duration: 76ms', NULL, NULL, 'info', '2026-05-27 14:42:34');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (28, 1, 'admin', 'LOGIN', 'users', NULL, 'Login berhasil dari IP: ::1', NULL, NULL, 'info', '2026-05-27 14:44:02');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (29, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 200, Duration: 83ms', NULL, NULL, 'info', '2026-05-27 14:44:02');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (30, 1, 'admin', 'LOGOUT', 'users', NULL, 'User logout', NULL, NULL, 'info', '2026-05-27 14:48:20');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (31, 4, 'staff1', 'LOGIN', 'users', NULL, 'Login berhasil dari IP: ::1', NULL, NULL, 'info', '2026-05-27 14:48:36');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (32, 4, 'staff1', 'POST /login', 'http', NULL, 'Status: 200, Duration: 98ms', NULL, NULL, 'info', '2026-05-27 14:48:36');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (33, 4, 'staff1', 'LOGOUT', 'users', NULL, 'User logout', NULL, NULL, 'info', '2026-05-27 14:48:41');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (34, 1, 'admin', 'LOGOUT', 'users', NULL, 'User logout', NULL, NULL, 'info', '2026-05-27 14:50:03');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (35, NULL, 'anonymous', 'SERVER_ERROR', '/api/auth/logout', NULL, 'Error: Cannot read properties of undefined (reading ''_csrf''). Stack: TypeError: Cannot read properties of undefined (reading ''_csrf'')
    at verifyCsrfToken (C:\Users\tiska\Downloads\tugasweb_tiskawalida\middleware\auth.js:81:64)
    at Layer.handleRequest (C:\Users\tiska\Downloads\tugasweb_tiskawalida\node_modules\router\lib\layer.js:152:17)
    at trimPrefix (C:\Users\tiska\Downloads\tugasweb_tiskawalida\node_modules\router\index.js:342:13)
    at C:\Users\tiska\Downloads\tugasweb_tiskawalida\node_modules\router\index.js:297:9
    at processParams (C:\Users\tiska\Downloads\tugasweb_tiskawalida\node_modules\router\index.js:582:12)
    at next (C:\Users\tiska\Downloads\tugasweb_tiskawalida\node_modules\router\index.js:291:5)
    at Immediate._onImmediate (C:\Users\tiska\Downloads\tugasweb_tiskawalida\node_modules\express-session\index.js:521:7)
    at process.processImmediate (node:internal/timers:493:21)', NULL, NULL, 'critical', '2026-05-27 14:50:17');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (36, 1, 'admin', 'LOGOUT', 'users', NULL, 'User logout', NULL, NULL, 'info', '2026-05-27 14:51:02');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (37, 4, 'staff1', 'LOGIN', 'users', NULL, 'Login berhasil dari IP: ::1', NULL, NULL, 'info', '2026-05-27 14:51:12');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (38, 4, 'staff1', 'POST /login', 'http', NULL, 'Status: 200, Duration: 79ms', NULL, NULL, 'info', '2026-05-27 14:51:12');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (39, 4, 'staff1', 'LOGOUT', 'users', NULL, 'User logout', NULL, NULL, 'info', '2026-05-27 14:51:26');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (40, 4, 'staff1', 'LOGOUT', 'users', NULL, 'User logout', NULL, NULL, 'info', '2026-05-27 14:59:44');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (41, 7, 'viewer1', 'LOGIN', 'users', NULL, 'Login berhasil dari IP: ::1', NULL, NULL, 'info', '2026-05-27 15:00:03');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (42, 7, 'viewer1', 'POST /login', 'http', NULL, 'Status: 200, Duration: 92ms', NULL, NULL, 'info', '2026-05-27 15:00:03');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (43, 7, 'viewer1', 'LOGOUT', 'users', NULL, 'User logout', NULL, NULL, 'info', '2026-05-27 15:23:58');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (44, NULL, 'admin1', 'LOGIN_FAILED', 'users', NULL, 'Login gagal: user tidak ditemukan', NULL, NULL, 'warning', '2026-05-27 15:24:12');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (45, NULL, 'admin1', 'LOGIN_FAILED', 'users', NULL, 'Login gagal: user tidak ditemukan', NULL, NULL, 'warning', '2026-05-27 15:24:27');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (46, 1, 'admin', 'LOGIN', 'users', NULL, 'Login berhasil dari IP: ::1', NULL, NULL, 'info', '2026-05-27 15:25:01');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (47, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 200, Duration: 134ms', NULL, NULL, 'info', '2026-05-27 15:25:01');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (48, 1, 'admin', 'LOGOUT', 'users', NULL, 'User logout', NULL, NULL, 'info', '2026-05-27 15:25:31');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (49, 1, 'admin', 'LOGOUT', 'users', NULL, 'User logout', NULL, NULL, 'info', '2026-05-27 15:36:25');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (50, 1, 'admin', 'LOGIN', 'users', NULL, 'Login berhasil dari IP: ::1', NULL, NULL, 'info', '2026-05-27 15:39:47');
INSERT INTO "audit_logs" ("id", "user_id", "username", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "severity", "created_at") VALUES (51, 1, 'admin', 'POST /login', 'http', NULL, 'Status: 200, Duration: 117ms', NULL, NULL, 'info', '2026-05-27 15:39:47');

INSERT INTO "categories" ("id", "code", "name", "description", "is_active", "created_at", "updated_at") VALUES (1, 'CAT-001', 'Smartphone', 'Perangkat telepon pintar dan aksesoris', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "categories" ("id", "code", "name", "description", "is_active", "created_at", "updated_at") VALUES (2, 'CAT-002', 'Laptop & Komputer', 'Laptop, PC, dan komponen komputer', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "categories" ("id", "code", "name", "description", "is_active", "created_at", "updated_at") VALUES (3, 'CAT-003', 'TV & Audio', 'Televisi, speaker, dan perangkat audio', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "categories" ("id", "code", "name", "description", "is_active", "created_at", "updated_at") VALUES (4, 'CAT-004', 'Kamera', 'Kamera digital, DSLR, dan aksesoris', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "categories" ("id", "code", "name", "description", "is_active", "created_at", "updated_at") VALUES (5, 'CAT-005', 'Aksesoris', 'Kabel, charger, casing, dan aksesoris lain', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "categories" ("id", "code", "name", "description", "is_active", "created_at", "updated_at") VALUES (6, 'CAT-006', 'Tablet', 'iPad, Android tablet, dan e-reader', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "categories" ("id", "code", "name", "description", "is_active", "created_at", "updated_at") VALUES (7, 'CAT-007', 'Perangkat Jaringan', 'Router, switch, modem, dan perangkat jaringan', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');

INSERT INTO "notifications" ("id", "type", "title", "message", "severity", "is_read", "target_role", "related_id", "created_at") VALUES (1, 'stock_alert', 'Stok Kritis: Sony Alpha A7 IV', 'Stok Sony Alpha A7 IV di Gudang Makassar hanya tersisa 1 unit (min: 5)', 'critical', 0, 'admin', NULL, '2026-05-27 12:00:00');
INSERT INTO "notifications" ("id", "type", "title", "message", "severity", "is_read", "target_role", "related_id", "created_at") VALUES (2, 'stock_alert', 'Stok Rendah: ASUS ROG Laptop', 'Stok ASUS ROG Laptop di Gudang Makassar hanya tersisa 5 unit (min: 8)', 'warning', 0, 'admin', NULL, '2026-05-27 11:00:00');
INSERT INTO "notifications" ("id", "type", "title", "message", "severity", "is_read", "target_role", "related_id", "created_at") VALUES (3, 'transfer', 'Transfer Selesai', 'Transfer 50 unit Samsung Galaxy S25 dari Jakarta ke Surabaya telah selesai', 'info', 0, 'manager', NULL, '2026-05-27 10:00:00');
INSERT INTO "notifications" ("id", "type", "title", "message", "severity", "is_read", "target_role", "related_id", "created_at") VALUES (4, 'system', 'Backup Database Berhasil', 'Backup otomatis database berhasil dilakukan pukul 02:00', 'info', 0, 'admin', NULL, '2026-05-27 02:00:00');
INSERT INTO "notifications" ("id", "type", "title", "message", "severity", "is_read", "target_role", "related_id", "created_at") VALUES (5, 'system_error', 'Unhandled Server Error', 'Aplikasi mengalami error: Cannot read properties of undefined (reading ''_csrf'')', 'critical', 0, 'admin', NULL, '2026-05-27 14:50:17');

INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (1, 'PRD-001', 'Samsung Galaxy S25', 'Smartphone flagship Samsung terbaru', 1, 1, 'unit', 12000000, 20, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (2, 'PRD-002', 'iPhone 16 Pro', 'Smartphone Apple terbaru dengan chip A18', 1, 2, 'unit', 18000000, 15, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (3, 'PRD-003', 'Xiaomi 14T', 'Smartphone Xiaomi dengan Leica camera', 1, 3, 'unit', 8500000, 25, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (4, 'PRD-004', 'Samsung Galaxy Tab S10', 'Tablet Android premium Samsung', 6, 1, 'unit', 9500000, 10, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (5, 'PRD-005', 'ASUS ROG Laptop G16', 'Laptop gaming ASUS ROG dengan RTX 4070', 2, 6, 'unit', 25000000, 8, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (6, 'PRD-006', 'Sony Bravia 55" 4K', 'Televisi Sony OLED 55 inci 4K HDR', 3, 4, 'unit', 15000000, 5, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (7, 'PRD-007', 'Sony Alpha A7 IV', 'Kamera mirrorless Sony full-frame', 4, 4, 'unit', 35000000, 5, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (8, 'PRD-008', 'LG Soundbar S90QY', 'Soundbar LG Dolby Atmos 5.1.2', 3, 5, 'unit', 8000000, 8, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (9, 'PRD-009', 'Kabel USB-C 1m', 'Kabel USB-C data dan fast charging', 5, 3, 'pcs', 150000, 100, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (10, 'PRD-010', 'Router TP-Link AX5400', 'WiFi 6 Router dual-band AX5400', 7, 3, 'unit', 1200000, 30, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (11, 'PRD-011', 'iPad Pro 12.9"', 'Tablet Apple dengan chip M4', 6, 2, 'unit', 22000000, 10, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (12, 'PRD-012', 'Samsung 49" Monitor', 'Ultrawide gaming monitor 49 inci', 2, 1, 'unit', 13000000, 5, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (13, 'PRD-013', 'Xiaomi Mi Band 9', 'Smartband fitness tracker Xiaomi', 5, 3, 'unit', 450000, 50, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (14, 'PRD-014', 'ASUS ZenBook 14', 'Laptop tipis premium ASUS ZenBook', 2, 6, 'unit', 14000000, 12, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "products" ("id", "code", "name", "description", "category_id", "supplier_id", "unit", "price", "min_stock", "image_url", "is_active", "created_at", "updated_at") VALUES (15, 'PRD-015', 'Charger 65W GaN', 'Charger universal GaN 65W multi-port', 5, 6, 'unit', 350000, 80, NULL, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');

INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (1, 1, 1, 150, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (2, 2, 1, 80, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (3, 3, 1, 200, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (4, 4, 1, 60, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (5, 5, 1, 35, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (6, 6, 1, 25, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (7, 7, 1, 15, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (8, 8, 1, 40, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (9, 9, 1, 500, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (10, 10, 1, 120, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (11, 11, 1, 45, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (12, 12, 1, 20, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (13, 13, 1, 300, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (14, 14, 1, 55, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (15, 15, 1, 400, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (16, 1, 2, 100, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (17, 2, 2, 50, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (18, 3, 2, 150, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (19, 4, 2, 40, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (20, 5, 2, 20, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (21, 6, 2, 15, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (22, 7, 2, 8, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (23, 8, 2, 25, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (24, 9, 2, 300, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (25, 10, 2, 80, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (26, 11, 2, 30, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (27, 12, 2, 12, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (28, 13, 2, 200, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (29, 14, 2, 35, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (30, 15, 2, 250, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (31, 1, 3, 80, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (32, 2, 3, 30, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (33, 3, 3, 120, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (34, 4, 3, 25, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (35, 5, 3, 12, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (36, 6, 3, 8, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (37, 7, 3, 4, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (38, 8, 3, 15, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (39, 9, 3, 200, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (40, 10, 3, 50, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (41, 11, 3, 20, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (42, 12, 3, 8, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (43, 13, 3, 150, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (44, 14, 3, 22, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (45, 15, 3, 180, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (46, 1, 4, 60, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (47, 2, 4, 20, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (48, 3, 4, 90, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (49, 4, 4, 15, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (50, 5, 4, 8, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (51, 6, 4, 5, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (52, 7, 4, 2, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (53, 8, 4, 10, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (54, 9, 4, 150, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (55, 10, 4, 35, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (56, 11, 4, 12, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (57, 12, 4, 5, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (58, 13, 4, 100, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (59, 14, 4, 18, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (60, 15, 4, 120, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (61, 1, 5, 40, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (62, 2, 5, 12, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (63, 3, 5, 60, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (64, 4, 5, 10, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (65, 5, 5, 5, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (66, 6, 5, 3, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (67, 7, 5, 1, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (68, 8, 5, 6, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (69, 9, 5, 100, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (70, 10, 5, 20, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (71, 11, 5, 8, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (72, 12, 5, 3, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (73, 13, 5, 80, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (74, 14, 5, 10, '2026-05-27 13:27:04');
INSERT INTO "stock" ("id", "product_id", "warehouse_id", "quantity", "updated_at") VALUES (75, 15, 5, 90, '2026-05-27 13:27:04');

INSERT INTO "suppliers" ("id", "code", "name", "contact_person", "email", "phone", "address", "city", "is_active", "created_at", "updated_at") VALUES (1, 'SUP-001', 'Samsung Electronics Indonesia', 'Park Sung Jin', 'samsung@supplier.id', '021-1234567', 'Gedung Menara BCA, Jakarta', 'Jakarta', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "suppliers" ("id", "code", "name", "contact_person", "email", "phone", "address", "city", "is_active", "created_at", "updated_at") VALUES (2, 'SUP-002', 'Apple Authorized Distributor', 'Michael Tan', 'apple@supplier.id', '021-2345678', 'Sudirman Central Business District', 'Jakarta', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "suppliers" ("id", "code", "name", "contact_person", "email", "phone", "address", "city", "is_active", "created_at", "updated_at") VALUES (3, 'SUP-003', 'Xiaomi Indonesia', 'Wang Lei', 'xiaomi@supplier.id', '021-3456789', 'Wisma GKBI, Jakarta', 'Jakarta', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "suppliers" ("id", "code", "name", "contact_person", "email", "phone", "address", "city", "is_active", "created_at", "updated_at") VALUES (4, 'SUP-004', 'Sony Indonesia', 'Hiroshi Yamamoto', 'sony@supplier.id', '021-4567890', 'World Trade Center, Jakarta', 'Jakarta', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "suppliers" ("id", "code", "name", "contact_person", "email", "phone", "address", "city", "is_active", "created_at", "updated_at") VALUES (5, 'SUP-005', 'LG Electronics Indonesia', 'Kim Dong Woo', 'lg@supplier.id', '021-5678901', 'Ratu Prabu 2, Jakarta', 'Jakarta', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "suppliers" ("id", "code", "name", "contact_person", "email", "phone", "address", "city", "is_active", "created_at", "updated_at") VALUES (6, 'SUP-006', 'ASUS Indonesia', 'Andy Chen', 'asus@supplier.id', '021-6789012', 'DBS Bank Tower, Jakarta', 'Jakarta', 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');

INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (1, 'TRX-00001', 'out', 1, 1, 42, 1450506, 60921252, 'Penjualan', NULL, 1, '2026-05-04 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (2, 'TRX-00002', 'in', 2, 2, 45, 4768617, 214587765, 'Pembelian rutin', NULL, 1, '2026-04-29 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (3, 'TRX-00003', 'in', 3, 3, 39, 557321, 21735519, 'Pembelian rutin', NULL, 1, '2026-05-03 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (4, 'TRX-00004', 'out', 4, 4, 47, 2669024, 125444128, 'Penjualan', NULL, 1, '2026-05-16 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (5, 'TRX-00005', 'in', 5, 5, 16, 3394435, 54310960, 'Pembelian rutin', NULL, 1, '2026-05-03 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (6, 'TRX-00006', 'in', 6, 1, 38, 2970317, 112872046, 'Pembelian rutin', NULL, 1, '2026-05-27 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (7, 'TRX-00007', 'out', 7, 2, 24, 5029203, 120700872, 'Penjualan', NULL, 1, '2026-05-15 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (8, 'TRX-00008', 'in', 8, 3, 38, 1889792, 71812096, 'Pembelian rutin', NULL, 1, '2026-05-07 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (9, 'TRX-00009', 'in', 9, 4, 42, 1274979, 53549118, 'Pembelian rutin', NULL, 1, '2026-05-23 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (10, 'TRX-00010', 'out', 10, 5, 29, 1830145, 53074205, 'Penjualan', NULL, 1, '2026-05-14 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (11, 'TRX-00011', 'in', 11, 1, 2, 278643, 557286, 'Pembelian rutin', NULL, 1, '2026-05-08 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (12, 'TRX-00012', 'in', 12, 2, 35, 1301507, 45552745, 'Pembelian rutin', NULL, 1, '2026-04-29 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (13, 'TRX-00013', 'out', 13, 3, 26, 240088, 6242288, 'Penjualan', NULL, 1, '2026-05-24 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (14, 'TRX-00014', 'in', 14, 4, 19, 3851026, 73169494, 'Pembelian rutin', NULL, 1, '2026-05-26 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (15, 'TRX-00015', 'in', 15, 5, 40, 265275, 10611000, 'Pembelian rutin', NULL, 1, '2026-05-21 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (16, 'TRX-00016', 'out', 1, 1, 5, 560611, 2803055, 'Penjualan', NULL, 1, '2026-05-25 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (17, 'TRX-00017', 'in', 2, 2, 10, 3625557, 36255570, 'Pembelian rutin', NULL, 1, '2026-05-08 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (18, 'TRX-00018', 'in', 3, 3, 14, 3168307, 44356298, 'Pembelian rutin', NULL, 1, '2026-05-24 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (19, 'TRX-00019', 'out', 4, 4, 2, 3538715, 7077430, 'Penjualan', NULL, 1, '2026-04-29 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (20, 'TRX-00020', 'in', 5, 5, 19, 3259956, 61939164, 'Pembelian rutin', NULL, 1, '2026-04-30 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (21, 'TRX-00021', 'in', 6, 1, 50, 2930882, 146544100, 'Pembelian rutin', NULL, 1, '2026-05-18 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (22, 'TRX-00022', 'out', 7, 2, 15, 2608010, 39120150, 'Penjualan', NULL, 1, '2026-05-09 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (23, 'TRX-00023', 'in', 8, 3, 2, 928878, 1857756, 'Pembelian rutin', NULL, 1, '2026-05-08 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (24, 'TRX-00024', 'in', 9, 4, 10, 3607517, 36075170, 'Pembelian rutin', NULL, 1, '2026-05-02 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (25, 'TRX-00025', 'out', 10, 5, 37, 1613039, 59682443, 'Penjualan', NULL, 1, '2026-05-27 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (26, 'TRX-00026', 'in', 11, 1, 3, 2304731, 6914193, 'Pembelian rutin', NULL, 1, '2026-05-21 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (27, 'TRX-00027', 'in', 12, 2, 10, 3604755, 36047550, 'Pembelian rutin', NULL, 1, '2026-05-03 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (28, 'TRX-00028', 'out', 13, 3, 28, 3376636, 94545808, 'Penjualan', NULL, 1, '2026-05-18 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (29, 'TRX-00029', 'in', 14, 4, 33, 4814127, 158866191, 'Pembelian rutin', NULL, 1, '2026-05-15 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (30, 'TRX-00030', 'in', 15, 5, 5, 2064453, 10322265, 'Pembelian rutin', NULL, 1, '2026-05-02 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (31, 'TRX-00031', 'out', 1, 1, 25, 3085888, 77147200, 'Penjualan', NULL, 1, '2026-05-24 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (32, 'TRX-00032', 'in', 2, 2, 33, 3129193, 103263369, 'Pembelian rutin', NULL, 1, '2026-05-01 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (33, 'TRX-00033', 'in', 3, 3, 31, 1457772, 45190932, 'Pembelian rutin', NULL, 1, '2026-05-02 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (34, 'TRX-00034', 'out', 4, 4, 4, 2562108, 10248432, 'Penjualan', NULL, 1, '2026-05-11 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (35, 'TRX-00035', 'in', 5, 5, 9, 4333016, 38997144, 'Pembelian rutin', NULL, 1, '2026-05-07 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (36, 'TRX-00036', 'in', 6, 1, 39, 3080642, 120145038, 'Pembelian rutin', NULL, 1, '2026-05-11 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (37, 'TRX-00037', 'out', 7, 2, 6, 2976453, 17858718, 'Penjualan', NULL, 1, '2026-05-04 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (38, 'TRX-00038', 'in', 8, 3, 49, 2153887, 105540463, 'Pembelian rutin', NULL, 1, '2026-05-07 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (39, 'TRX-00039', 'in', 9, 4, 15, 4155950, 62339250, 'Pembelian rutin', NULL, 1, '2026-05-04 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (40, 'TRX-00040', 'out', 10, 5, 48, 435575, 20907600, 'Penjualan', NULL, 1, '2026-05-20 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (41, 'TRX-00041', 'in', 11, 1, 41, 2283904, 93640064, 'Pembelian rutin', NULL, 1, '2026-05-26 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (42, 'TRX-00042', 'in', 12, 2, 12, 133369, 1600428, 'Pembelian rutin', NULL, 1, '2026-05-13 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (43, 'TRX-00043', 'out', 13, 3, 23, 4291926, 98714298, 'Penjualan', NULL, 1, '2026-05-19 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (44, 'TRX-00044', 'in', 14, 4, 24, 1968376, 47241024, 'Pembelian rutin', NULL, 1, '2026-05-10 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (45, 'TRX-00045', 'in', 15, 5, 37, 3176089, 117515293, 'Pembelian rutin', NULL, 1, '2026-05-26 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (46, 'TRX-00046', 'out', 1, 1, 28, 2942196, 82381488, 'Penjualan', NULL, 1, '2026-05-05 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (47, 'TRX-00047', 'in', 2, 2, 14, 1192879, 16700306, 'Pembelian rutin', NULL, 1, '2026-05-15 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (48, 'TRX-00048', 'in', 3, 3, 15, 2301682, 34525230, 'Pembelian rutin', NULL, 1, '2026-05-21 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (49, 'TRX-00049', 'out', 4, 4, 13, 4725032, 61425416, 'Penjualan', NULL, 1, '2026-05-18 13:27:05');
INSERT INTO "transactions" ("id", "code", "type", "product_id", "warehouse_id", "quantity", "price_per_unit", "total_price", "note", "reference_no", "user_id", "created_at") VALUES (50, 'TRX-00050', 'in', 5, 5, 6, 2830674, 16984044, 'Pembelian rutin', NULL, 1, '2026-05-18 13:27:05');

INSERT INTO "users" ("id", "username", "password", "full_name", "email", "role", "warehouse_id", "is_active", "last_login", "created_at", "updated_at") VALUES (1, 'admin', '$2b$10$e/OGOksV5Wnkfwhm71oTBe/PqFXtTWFho2JXeTVh5zJA2Q/s9l1iW', 'Administrator Sistem', 'admin@smartstock.id', 'admin', NULL, 1, '2026-05-27 15:39:47', '2026-05-27 13:27:05', '2026-05-27 13:27:05');
INSERT INTO "users" ("id", "username", "password", "full_name", "email", "role", "warehouse_id", "is_active", "last_login", "created_at", "updated_at") VALUES (2, 'manager1', '$2b$10$I44q6SG3nodDXKIW4HQVIeMB0h35oi9MjFv9Wg3ZudohyJx2lqm4C', 'Budi Santoso', 'manager1@smartstock.id', 'manager', 1, 1, NULL, '2026-05-27 13:27:05', '2026-05-27 13:27:05');
INSERT INTO "users" ("id", "username", "password", "full_name", "email", "role", "warehouse_id", "is_active", "last_login", "created_at", "updated_at") VALUES (3, 'manager2', '$2b$10$hP0UEU.i9dJRzmoGaUklzOscvocqA1rJnj68KRVJ7IZxB8Td/vyRG', 'Siti Rahayu', 'manager2@smartstock.id', 'manager', 2, 1, NULL, '2026-05-27 13:27:05', '2026-05-27 13:27:05');
INSERT INTO "users" ("id", "username", "password", "full_name", "email", "role", "warehouse_id", "is_active", "last_login", "created_at", "updated_at") VALUES (4, 'staff1', '$2b$10$3wGzdmdm3f3.RaQkluXIVOU2FWj9/gaQXVV0wc3c.9MSZN6S/714C', 'Ahmad Fauzi', 'staff1@smartstock.id', 'staff', 1, 1, '2026-05-27 14:51:12', '2026-05-27 13:27:05', '2026-05-27 13:27:05');
INSERT INTO "users" ("id", "username", "password", "full_name", "email", "role", "warehouse_id", "is_active", "last_login", "created_at", "updated_at") VALUES (5, 'staff2', '$2b$10$MRnrqRxuWyRXOcZkZszo5uine3b3h7vQpL//AXYeLL.ztK66aCoeW', 'Dewi Lestari', 'staff2@smartstock.id', 'staff', 2, 1, NULL, '2026-05-27 13:27:05', '2026-05-27 13:27:05');
INSERT INTO "users" ("id", "username", "password", "full_name", "email", "role", "warehouse_id", "is_active", "last_login", "created_at", "updated_at") VALUES (6, 'staff3', '$2b$10$C3f9TIev4yhEh8gC48KMeuGiDws7IzB7iC4F9MUicNRKIt.raAe4G', 'Rizky Pratama', 'staff3@smartstock.id', 'staff', 3, 1, NULL, '2026-05-27 13:27:05', '2026-05-27 13:27:05');
INSERT INTO "users" ("id", "username", "password", "full_name", "email", "role", "warehouse_id", "is_active", "last_login", "created_at", "updated_at") VALUES (7, 'viewer1', '$2b$10$oqxoquXROc9XuVeY1k0TJuAk4wlAd2p77lFDnHwHhiquPmU9VTMQK', 'Diana Putri', 'viewer1@smartstock.id', 'viewer', NULL, 1, '2026-05-27 15:00:03', '2026-05-27 13:27:05', '2026-05-27 13:27:05');

INSERT INTO "warehouses" ("id", "code", "name", "city", "address", "latitude", "longitude", "manager_name", "phone", "capacity", "is_active", "created_at", "updated_at") VALUES (1, 'WH-JKT', 'Gudang Jakarta', 'Jakarta', 'Jl. Raya Bekasi KM 18, Jakarta Timur', -6.2088, 106.8456, 'Budi Santoso', '021-8765432', 5000, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "warehouses" ("id", "code", "name", "city", "address", "latitude", "longitude", "manager_name", "phone", "capacity", "is_active", "created_at", "updated_at") VALUES (2, 'WH-SBY', 'Gudang Surabaya', 'Surabaya', 'Jl. Margomulyo No. 45, Surabaya', -7.2575, 112.7521, 'Siti Rahayu', '031-7654321', 4000, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "warehouses" ("id", "code", "name", "city", "address", "latitude", "longitude", "manager_name", "phone", "capacity", "is_active", "created_at", "updated_at") VALUES (3, 'WH-BDG', 'Gudang Bandung', 'Bandung', 'Jl. Soekarno Hatta No. 123, Bandung', -6.9175, 107.6191, 'Ahmad Fauzi', '022-6543210', 3000, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "warehouses" ("id", "code", "name", "city", "address", "latitude", "longitude", "manager_name", "phone", "capacity", "is_active", "created_at", "updated_at") VALUES (4, 'WH-MDN', 'Gudang Medan', 'Medan', 'Jl. Gatot Subroto No. 78, Medan', 3.5952, 98.6722, 'Dewi Lestari', '061-5432109', 2500, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');
INSERT INTO "warehouses" ("id", "code", "name", "city", "address", "latitude", "longitude", "manager_name", "phone", "capacity", "is_active", "created_at", "updated_at") VALUES (5, 'WH-MKS', 'Gudang Makassar', 'Makassar', 'Jl. Perintis Kemerdekaan KM 10, Makassar', -5.1477, 119.4327, 'Rizky Pratama', '0411-4321098', 2000, 1, '2026-05-27 13:27:04', '2026-05-27 13:27:04');

-- ============================================
-- END OF DUMP
-- ============================================