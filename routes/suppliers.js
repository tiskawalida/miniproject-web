const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/logger');

// GET /api/suppliers - Paginated, sorted, filtered list
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const search = req.query.search || '';
    const sortBy = ['code', 'name', 'city'].includes(req.query.sortBy) ? req.query.sortBy : 'id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM suppliers WHERE is_active = 1';
    let countQuery = 'SELECT COUNT(*) as total FROM suppliers WHERE is_active = 1';
    const params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ? OR city LIKE ? OR contact_person LIKE ?)';
      countQuery += ' AND (name LIKE ? OR code LIKE ? OR city LIKE ? OR contact_person LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    
    const total = db.prepare(countQuery).get(...params).total;
    const items = db.prepare(query).all(...params, limit, offset);
    
    res.json({
      success: true,
      data: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data supplier.', error: err.message });
  }
});

// GET /api/suppliers/all - Fetch all active suppliers for dropdown lists
router.get('/all', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare('SELECT id, code, name FROM suppliers WHERE is_active = 1 ORDER BY name ASC').all();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil dropdown supplier.', error: err.message });
  }
});

// GET /api/suppliers/:id - Get detail
router.get('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare('SELECT * FROM suppliers WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Supplier tidak ditemukan.' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data supplier.', error: err.message });
  }
});

// POST /api/suppliers - Create Supplier (Admin & Manager)
router.post('/', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { code, name, contact_person, email, phone, address, city } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Kode dan nama supplier wajib diisi.' });
  }
  try {
    const db = getDb();
    
    // Check code unique
    const exists = db.prepare('SELECT id FROM suppliers WHERE code = ?').get(code.trim());
    if (exists) return res.status(400).json({ success: false, message: 'Kode supplier sudah digunakan.' });

    const info = db.prepare(`
      INSERT INTO suppliers (code, name, contact_person, email, phone, address, city)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(code.trim().toUpperCase(), name.trim(), contact_person || '', email || '', phone || '', address || '', city || '');

    auditLog(req.session.user.id, req.session.user.username, 'CREATE_SUPPLIER', 'suppliers', `Supplier baru dibuat: ${name}`, 'info', info.lastInsertRowid);
    res.json({ success: true, message: 'Supplier berhasil ditambahkan.', id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan supplier.', error: err.message });
  }
});

// PUT /api/suppliers/:id - Update Supplier (Admin & Manager)
router.put('/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { name, contact_person, email, phone, address, city } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Nama supplier wajib diisi.' });
  
  try {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM suppliers WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, message: 'Supplier tidak ditemukan.' });

    db.prepare(`
      UPDATE suppliers 
      SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?, city = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name.trim(), contact_person || '', email || '', phone || '', address || '', city || '', req.params.id);

    auditLog(req.session.user.id, req.session.user.username, 'UPDATE_SUPPLIER', 'suppliers', `Supplier id ${req.params.id} diupdate ke: ${name}`, 'info', req.params.id);
    res.json({ success: true, message: 'Supplier berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui supplier.', error: err.message });
  }
});

// DELETE /api/suppliers/:id - Soft Delete Supplier (Admin & Manager)
router.delete('/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const db = getDb();
    const exists = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, message: 'Supplier tidak ditemukan.' });
    
    // Check if there are active products using this supplier
    const hasProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE supplier_id = ? AND is_active = 1').get(req.params.id).count;
    if (hasProducts > 0) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus supplier karena masih digunakan oleh produk aktif.' });
    }

    db.prepare('UPDATE suppliers SET is_active = 0, updated_at = datetime("now") WHERE id = ?').run(req.params.id);
    auditLog(req.session.user.id, req.session.user.username, 'DELETE_SUPPLIER', 'suppliers', `Supplier ${exists.name} dihapus secara soft-delete`, 'warning', req.params.id);
    res.json({ success: true, message: 'Supplier berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus supplier.', error: err.message });
  }
});

module.exports = router;
