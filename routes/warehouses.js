const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/logger');

// GET /api/warehouses - Paginated, sorted, filtered list with utilized capacity
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const search = req.query.search || '';
    const sortBy = ['code', 'name', 'city', 'capacity'].includes(req.query.sortBy) ? req.query.sortBy : 'w.id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT w.*, COALESCE(SUM(s.quantity), 0) as current_stock
      FROM warehouses w
      LEFT JOIN stock s ON w.id = s.warehouse_id
      WHERE w.is_active = 1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM warehouses WHERE is_active = 1';
    const params = [];
    
    if (search) {
      query += ' AND (w.name LIKE ? OR w.code LIKE ? OR w.city LIKE ? OR w.manager_name LIKE ?)';
      countQuery += ' AND (name LIKE ? OR code LIKE ? OR city LIKE ? OR manager_name LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    query += ` GROUP BY w.id ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    
    const total = db.prepare(countQuery).get(...params).total;
    const items = db.prepare(query).all(...params, limit, offset);
    
    res.json({
      success: true,
      data: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data gudang.', error: err.message });
  }
});

// GET /api/warehouses/all - Fetch all active warehouses for selectors
router.get('/all', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare('SELECT id, code, name, city, latitude, longitude, capacity FROM warehouses WHERE is_active = 1').all();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil dropdown gudang.', error: err.message });
  }
});

// GET /api/warehouses/:id - Get details with product stocks breakdown
router.get('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!warehouse) return res.status(404).json({ success: false, message: 'Gudang tidak ditemukan.' });
    
    // Get product stocks inside this warehouse
    const stocks = db.prepare(`
      SELECT p.code, p.name, p.unit, p.price, c.name as category_name, s.quantity
      FROM stock s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE s.warehouse_id = ? AND p.is_active = 1
    `).all(req.params.id);

    res.json({ success: true, data: { ...warehouse, stocks } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data gudang.', error: err.message });
  }
});

// POST /api/warehouses - Create Warehouse (Admin & Manager)
router.post('/', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { code, name, city, address, latitude, longitude, manager_name, phone, capacity } = req.body;
  if (!code || !name || !city) {
    return res.status(400).json({ success: false, message: 'Kode, nama, dan kota gudang wajib diisi.' });
  }
  try {
    const db = getDb();
    
    // Check code unique
    const exists = db.prepare('SELECT id FROM warehouses WHERE code = ?').get(code.trim());
    if (exists) return res.status(400).json({ success: false, message: 'Kode gudang sudah digunakan.' });

    const info = db.prepare(`
      INSERT INTO warehouses (code, name, city, address, latitude, longitude, manager_name, phone, capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.trim().toUpperCase(), 
      name.trim(), 
      city.trim(), 
      address || '', 
      latitude ? parseFloat(latitude) : null, 
      longitude ? parseFloat(longitude) : null, 
      manager_name || '', 
      phone || '', 
      capacity ? parseInt(capacity) : 1000
    );

    auditLog(req.session.user.id, req.session.user.username, 'CREATE_WAREHOUSE', 'warehouses', `Gudang baru dibuat: ${name}`, 'info', info.lastInsertRowid);
    res.json({ success: true, message: 'Gudang berhasil ditambahkan.', id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan gudang.', error: err.message });
  }
});

// PUT /api/warehouses/:id - Update Warehouse (Admin & Manager)
router.put('/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { name, city, address, latitude, longitude, manager_name, phone, capacity } = req.body;
  if (!name || !city) return res.status(400).json({ success: false, message: 'Nama dan kota gudang wajib diisi.' });
  
  try {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM warehouses WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, message: 'Gudang tidak ditemukan.' });

    db.prepare(`
      UPDATE warehouses 
      SET name = ?, city = ?, address = ?, latitude = ?, longitude = ?, manager_name = ?, phone = ?, capacity = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name.trim(), 
      city.trim(), 
      address || '', 
      latitude ? parseFloat(latitude) : null, 
      longitude ? parseFloat(longitude) : null, 
      manager_name || '', 
      phone || '', 
      capacity ? parseInt(capacity) : 1000,
      req.params.id
    );

    auditLog(req.session.user.id, req.session.user.username, 'UPDATE_WAREHOUSE', 'warehouses', `Gudang id ${req.params.id} diupdate ke: ${name}`, 'info', req.params.id);
    res.json({ success: true, message: 'Gudang berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui gudang.', error: err.message });
  }
});

// DELETE /api/warehouses/:id - Soft Delete Warehouse (Admin & Manager)
router.delete('/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const db = getDb();
    const exists = db.prepare('SELECT name FROM warehouses WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, message: 'Gudang tidak ditemukan.' });
    
    // Check if there are active stock items in this warehouse
    const activeStock = db.prepare('SELECT SUM(quantity) as total FROM stock WHERE warehouse_id = ?').get(req.params.id).total || 0;
    if (activeStock > 0) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus gudang karena masih menyimpan barang/stok di dalamnya.' });
    }

    db.prepare('UPDATE warehouses SET is_active = 0, updated_at = datetime("now") WHERE id = ?').run(req.params.id);
    auditLog(req.session.user.id, req.session.user.username, 'DELETE_WAREHOUSE', 'warehouses', `Gudang ${exists.name} dihapus secara soft-delete`, 'warning', req.params.id);
    res.json({ success: true, message: 'Gudang berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus gudang.', error: err.message });
  }
});

module.exports = router;
