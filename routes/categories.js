const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/logger');

// GET /api/categories - Paginated, sorted, filtered list
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const search = req.query.search || '';
    const sortBy = ['code', 'name', 'created_at'].includes(req.query.sortBy) ? req.query.sortBy : 'id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM categories WHERE is_active = 1';
    let countQuery = 'SELECT COUNT(*) as total FROM categories WHERE is_active = 1';
    const params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
      countQuery += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
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
    res.status(500).json({ success: false, message: 'Gagal mengambil data kategori.', error: err.message });
  }
});

// GET /api/categories/all - Fetch all categories for dropdown select
router.get('/all', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare('SELECT id, code, name FROM categories WHERE is_active = 1 ORDER BY name ASC').all();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil dropdown kategori.', error: err.message });
  }
});

// GET /api/categories/:id - Get detail
router.get('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare('SELECT * FROM categories WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data kategori.', error: err.message });
  }
});

// POST /api/categories - Create Category (Admin & Manager)
router.post('/', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { code, name, description } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Kode dan nama kategori wajib diisi.' });
  }
  try {
    const db = getDb();
    
    // Check code unique
    const exists = db.prepare('SELECT id FROM categories WHERE code = ?').get(code.trim());
    if (exists) return res.status(400).json({ success: false, message: 'Kode kategori sudah digunakan.' });

    const info = db.prepare(`
      INSERT INTO categories (code, name, description)
      VALUES (?, ?, ?)
    `).run(code.trim().toUpperCase(), name.trim(), description || '');

    auditLog(req.session.user.id, req.session.user.username, 'CREATE_CATEGORY', 'categories', `Kategori baru dibuat: ${name}`, 'info', info.lastInsertRowid);
    res.json({ success: true, message: 'Kategori berhasil ditambahkan.', id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan kategori.', error: err.message });
  }
});

// PUT /api/categories/:id - Update Category (Admin & Manager)
router.put('/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
  
  try {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM categories WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });

    db.prepare(`
      UPDATE categories SET name = ?, description = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name.trim(), description || '', req.params.id);

    auditLog(req.session.user.id, req.session.user.username, 'UPDATE_CATEGORY', 'categories', `Kategori id ${req.params.id} diupdate ke: ${name}`, 'info', req.params.id);
    res.json({ success: true, message: 'Kategori berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui kategori.', error: err.message });
  }
});

// DELETE /api/categories/:id - Soft Delete Category (Admin & Manager)
router.delete('/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const db = getDb();
    const exists = db.prepare('SELECT name FROM categories WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    
    // Check if there are active products using this category
    const hasProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1').get(req.params.id).count;
    if (hasProducts > 0) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus kategori karena masih digunakan oleh produk aktif.' });
    }

    db.prepare('UPDATE categories SET is_active = 0, updated_at = datetime("now") WHERE id = ?').run(req.params.id);
    auditLog(req.session.user.id, req.session.user.username, 'DELETE_CATEGORY', 'categories', `Kategori ${exists.name} dihapus secara soft-delete`, 'warning', req.params.id);
    res.json({ success: true, message: 'Kategori berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori.', error: err.message });
  }
});

module.exports = router;
