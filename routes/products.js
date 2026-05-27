const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/logger');

// Multer Config for product images upload (Multimedia gallery requirement)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Format berkas harus berupa gambar (jpeg/jpg/png/webp/gif).'));
  },
  limits: { fileSize: 2 * 1024 * 1024 } // Limit 2MB
});

// GET /api/products - Paginated, sorted, filtered, searched list
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const search = req.query.search || '';
    const categoryId = req.query.categoryId || '';
    const supplierId = req.query.supplierId || '';
    const sortBy = ['p.code', 'p.name', 'p.price', 'total_stock'].includes(req.query.sortBy) ? req.query.sortBy : 'p.id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (search) {
      baseQuery += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.description LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    if (categoryId) {
      baseQuery += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    if (supplierId) {
      baseQuery += ' AND p.supplier_id = ?';
      params.push(supplierId);
    }

    const selectQuery = `
      SELECT p.*, c.name as category_name, s.name as supplier_name,
      COALESCE((SELECT SUM(quantity) FROM stock WHERE product_id = p.id), 0) as total_stock
      ${baseQuery}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      ${baseQuery}
    `;

    const total = db.prepare(countQuery).get(...params).total;
    const items = db.prepare(selectQuery).all(...params, limit, offset);

    res.json({
      success: true,
      data: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data produk.', error: err.message });
  }
});

// GET /api/products/all - Dropdown list
router.get('/all', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare('SELECT id, code, name, price, unit FROM products WHERE is_active = 1 ORDER BY name ASC').all();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil dropdown produk.', error: err.message });
  }
});

// GET /api/products/:id - Get details with breakdown by warehouse stocks
router.get('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ? AND p.is_active = 1
    `).get(req.params.id);

    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });

    // Warehouse stocks breakdown
    const stocks = db.prepare(`
      SELECT w.id as warehouse_id, w.code as warehouse_code, w.name as warehouse_name, w.city as warehouse_city, COALESCE(s.quantity, 0) as quantity
      FROM warehouses w
      LEFT JOIN stock s ON w.id = s.warehouse_id AND s.product_id = ?
      WHERE w.is_active = 1
    `).all(req.params.id);

    res.json({ success: true, data: { ...product, stocks } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail produk.', error: err.message });
  }
});

// POST /api/products - Create Product (Admin & Manager)
router.post('/', requireAuth, requireRole('admin', 'manager'), upload.single('image'), (req, res) => {
  const { code, name, description, category_id, supplier_id, unit, price, min_stock } = req.body;
  if (!code || !name || !category_id || !supplier_id) {
    return res.status(400).json({ success: false, message: 'Kode, nama, kategori, dan supplier wajib diisi.' });
  }

  try {
    const db = getDb();
    
    // Check code unique
    const exists = db.prepare('SELECT id FROM products WHERE code = ?').get(code.trim());
    if (exists) return res.status(400).json({ success: false, message: 'Kode produk sudah digunakan.' });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const info = db.prepare(`
      INSERT INTO products (code, name, description, category_id, supplier_id, unit, price, min_stock, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.trim().toUpperCase(), 
      name.trim(), 
      description || '', 
      parseInt(category_id), 
      parseInt(supplier_id), 
      unit || 'pcs', 
      price ? parseFloat(price) : 0, 
      min_stock ? parseInt(min_stock) : 10,
      imageUrl
    );

    // Initialize stock of 0 in all warehouses for this product
    const warehouses = db.prepare('SELECT id FROM warehouses WHERE is_active = 1').all();
    const insertStock = db.prepare('INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, 0)');
    
    // Run in loop or transaction
    const insertTransaction = db.transaction((proId, whs) => {
      whs.forEach(w => insertStock.run(proId, w.id));
    });
    insertTransaction(info.lastInsertRowid, warehouses);

    auditLog(req.session.user.id, req.session.user.username, 'CREATE_PRODUCT', 'products', `Produk baru dibuat: ${name}`, 'info', info.lastInsertRowid);
    res.json({ success: true, message: 'Produk berhasil ditambahkan.', id: info.lastInsertRowid });
  } catch (err) {
    // Delete file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Gagal menambahkan produk.', error: err.message });
  }
});

// PUT /api/products/:id - Update Product (Admin & Manager)
router.put('/:id', requireAuth, requireRole('admin', 'manager'), upload.single('image'), (req, res) => {
  const { name, description, category_id, supplier_id, unit, price, min_stock } = req.body;
  if (!name || !category_id || !supplier_id) {
    return res.status(400).json({ success: false, message: 'Nama, kategori, dan supplier wajib diisi.' });
  }

  try {
    const db = getDb();
    const product = db.prepare('SELECT image_url, name FROM products WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });

    let imageUrl = product.image_url;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      // Attempt to delete old image if it exists
      if (product.image_url) {
        const oldPath = path.join(__dirname, '..', 'public', product.image_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    db.prepare(`
      UPDATE products 
      SET name = ?, description = ?, category_id = ?, supplier_id = ?, unit = ?, price = ?, min_stock = ?, image_url = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name.trim(), 
      description || '', 
      parseInt(category_id), 
      parseInt(supplier_id), 
      unit || 'pcs', 
      price ? parseFloat(price) : 0, 
      min_stock ? parseInt(min_stock) : 10,
      imageUrl,
      req.params.id
    );

    auditLog(req.session.user.id, req.session.user.username, 'UPDATE_PRODUCT', 'products', `Produk id ${req.params.id} diupdate`, 'info', req.params.id);
    res.json({ success: true, message: 'Produk berhasil diperbarui.' });
  } catch (err) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Gagal memperbarui produk.', error: err.message });
  }
});

// DELETE /api/products/:id - Soft Delete Product (Admin & Manager)
router.delete('/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const db = getDb();
    const exists = db.prepare('SELECT name, image_url FROM products WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    
    // Check if total stock is 0
    const totalStock = db.prepare('SELECT SUM(quantity) as total FROM stock WHERE product_id = ?').get(req.params.id).total || 0;
    if (totalStock > 0) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus produk karena masih ada stok tersisa di gudang.' });
    }

    db.prepare('UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?').run(req.params.id);
    auditLog(req.session.user.id, req.session.user.username, 'DELETE_PRODUCT', 'products', `Produk ${exists.name} dihapus secara soft-delete`, 'warning', req.params.id);
    res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus produk.', error: err.message });
  }
});

module.exports = router;
