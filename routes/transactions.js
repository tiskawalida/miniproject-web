const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/logger');

// GET /api/transactions - Paginated, sorted, filtered list
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const search = req.query.search || '';
    const type = req.query.type || '';
    const warehouseId = req.query.warehouseId || '';
    const sortBy = ['t.code', 't.created_at', 'p.name', 'w.name'].includes(req.query.sortBy) ? req.query.sortBy : 't.id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM transactions t
      JOIN products p ON t.product_id = p.id
      JOIN warehouses w ON t.warehouse_id = w.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      baseQuery += ' AND (t.code LIKE ? OR p.name LIKE ? OR t.note LIKE ? OR t.reference_no LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    if (type) {
      baseQuery += ' AND t.type = ?';
      params.push(type);
    }
    if (warehouseId) {
      baseQuery += ' AND t.warehouse_id = ?';
      params.push(warehouseId);
    }

    const selectQuery = `
      SELECT t.*, p.name as product_name, p.code as product_code, p.unit as product_unit, 
             w.name as warehouse_name, u.full_name as user_fullname
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
    res.status(500).json({ success: false, message: 'Gagal mengambil transaksi.', error: err.message });
  }
});

// POST /api/transactions - Log new transaction & update stock atomatically (Admin, Manager, Staff)
router.post('/', requireAuth, requireRole('admin', 'manager', 'staff'), (req, res) => {
  const { type, product_id, warehouse_id, quantity, price_per_unit, note, reference_no } = req.body;
  
  if (!type || !product_id || !warehouse_id || !quantity) {
    return res.status(400).json({ success: false, message: 'Tipe, produk, gudang, dan kuantitas wajib diisi.' });
  }

  const qty = parseInt(quantity);
  const price = parseFloat(price_per_unit) || 0;
  if (qty <= 0) return res.status(400).json({ success: false, message: 'Kuantitas harus lebih besar dari 0.' });

  const db = getDb();
  
  // Wrap stock update & transaction log in a SQLite Transaction
  const executeTx = db.transaction(() => {
    // 1. Get current stock
    let currentStockRow = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?')
      .get(product_id, warehouse_id);
    
    let currentStock = currentStockRow ? currentStockRow.quantity : 0;

    // Verify product exists and is active
    const product = db.prepare('SELECT name, min_stock, code FROM products WHERE id = ? AND is_active = 1').get(product_id);
    if (!product) throw new Error('Produk tidak aktif atau tidak ditemukan.');

    // Verify warehouse exists
    const warehouse = db.prepare('SELECT capacity, name FROM warehouses WHERE id = ? AND is_active = 1').get(warehouse_id);
    if (!warehouse) throw new Error('Gudang tidak aktif atau tidak ditemukan.');

    let newStock = currentStock;

    if (type === 'in') {
      // Check capacity limit
      const currentTotalInWh = db.prepare('SELECT SUM(quantity) as total FROM stock WHERE warehouse_id = ?')
        .get(warehouse_id).total || 0;
      if (currentTotalInWh + qty > warehouse.capacity) {
        throw new Error(`Kapasitas gudang tidak mencukupi. Kapasitas: ${warehouse.capacity}, Digunakan: ${currentTotalInWh}, Diminta tambah: ${qty}`);
      }
      
      newStock += qty;
    } else if (type === 'out') {
      if (currentStock < qty) {
        throw new Error(`Stok produk tidak mencukupi di ${warehouse.name}. Tersedia: ${currentStock}, Diminta: ${qty}`);
      }
      newStock -= qty;
    } else {
      throw new Error('Tipe transaksi tidak valid.');
    }

    // 2. Insert or update stock table
    if (currentStockRow) {
      db.prepare('UPDATE stock SET quantity = ?, updated_at = datetime("now") WHERE product_id = ? AND warehouse_id = ?')
        .run(newStock, product_id, warehouse_id);
    } else {
      db.prepare('INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)')
        .run(product_id, warehouse_id, newStock);
    }

    // 3. Generate transaction code
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE code LIKE ?').get(`TRX-${datePrefix}%`).count;
    const code = `TRX-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

    // 4. Log transaction
    const totalVal = qty * price;
    db.prepare(`
      INSERT INTO transactions (code, type, product_id, warehouse_id, quantity, price_per_unit, total_price, note, reference_no, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code, type, product_id, warehouse_id, qty, price, totalVal, note || '', reference_no || '', req.session.user.id);

    // 5. Check if stock falls below min_stock threshold -> Trigger Alert
    if (newStock < product.min_stock) {
      const alertMsg = `Stok produk [${product.code}] ${product.name} di ${warehouse.name} tersisa ${newStock} ${product.unit} (Minimum threshold: ${product.min_stock})`;
      
      db.prepare(`
        INSERT INTO notifications (type, title, message, severity, target_role, related_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('stock_alert', 'Stok Kritis!', alertMsg, newStock <= (product.min_stock / 2) ? 'critical' : 'warning', 'manager', product_id);
    }

    return { code, newStock, productName: product.name, warehouseName: warehouse.name };
  });

  try {
    const result = executeTx();
    auditLog(
      req.session.user.id, 
      req.session.user.username, 
      `CREATE_TRANSACTION_${type.toUpperCase()}`, 
      'transactions', 
      `Transaksi ${result.code}: ${type === 'in' ? 'Masuk' : 'Keluar'} ${qty} unit ${result.productName} di ${result.warehouseName}. Stok baru: ${result.newStock}`, 
      'info'
    );
    res.json({ success: true, message: `Transaksi ${result.code} berhasil disimpan.`, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/transactions/valuation/:productId - FIFO / LIFO Stock valuation (Modul 3: Algoritma perhitungan stok otomatis)
router.get('/valuation/:productId', requireAuth, (req, res) => {
  const { productId } = req.params;
  try {
    const db = getDb();
    
    // Check product
    const product = db.prepare('SELECT name, code, unit FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });

    // Fetch all stock movements (transactions) for this product ordered chronologically
    const txs = db.prepare(`
      SELECT type, quantity, price_per_unit, created_at, code
      FROM transactions
      WHERE product_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(productId);

    // 1. FIFO Calculation Engine
    let fifoBatches = [];
    let fifoCogs = 0;
    
    // 2. LIFO Calculation Engine
    let lifoBatches = [];
    let lifoCogs = 0;

    txs.forEach(tx => {
      const qty = tx.quantity;
      const price = tx.price_per_unit;

      if (tx.type === 'in') {
        // Add batch for FIFO
        fifoBatches.push({ code: tx.code, qtyRemaining: qty, priceUnit: price, qtyInitial: qty });
        // Add batch for LIFO
        lifoBatches.push({ code: tx.code, qtyRemaining: qty, priceUnit: price, qtyInitial: qty });
      } 
      
      else if (tx.type === 'out') {
        // ------------------ FIFO logic (consume first batch) ------------------
        let remainingToConsumeFIFO = qty;
        for (let i = 0; i < fifoBatches.length; i++) {
          if (fifoBatches[i].qtyRemaining > 0) {
            const consume = Math.min(remainingToConsumeFIFO, fifoBatches[i].qtyRemaining);
            fifoBatches[i].qtyRemaining -= consume;
            fifoCogs += consume * fifoBatches[i].priceUnit;
            remainingToConsumeFIFO -= consume;
            if (remainingToConsumeFIFO <= 0) break;
          }
        }

        // ------------------ LIFO logic (consume last batch) ------------------
        let remainingToConsumeLIFO = qty;
        for (let i = lifoBatches.length - 1; i >= 0; i--) {
          if (lifoBatches[i].qtyRemaining > 0) {
            const consume = Math.min(remainingToConsumeLIFO, lifoBatches[i].qtyRemaining);
            lifoBatches[i].qtyRemaining -= consume;
            lifoCogs += consume * lifoBatches[i].priceUnit;
            remainingToConsumeLIFO -= consume;
            if (remainingToConsumeLIFO <= 0) break;
          }
        }
      }
    });

    // Compute remaining inventory values
    const fifoEndingInventory = fifoBatches.reduce((acc, b) => acc + (b.qtyRemaining * b.priceUnit), 0);
    const fifoEndingQty = fifoBatches.reduce((acc, b) => acc + b.qtyRemaining, 0);

    const lifoEndingInventory = lifoBatches.reduce((acc, b) => acc + (b.qtyRemaining * b.priceUnit), 0);
    const lifoEndingQty = lifoBatches.reduce((acc, b) => acc + b.qtyRemaining, 0);

    res.json({
      success: true,
      productName: product.name,
      productCode: product.code,
      unit: product.unit,
      summary: {
        fifo: {
          endingQuantity: fifoEndingQty,
          endingInventoryValue: fifoEndingInventory,
          cogs: fifoCogs,
          batches: fifoBatches.filter(b => b.qtyRemaining > 0)
        },
        lifo: {
          endingQuantity: lifoEndingQty,
          endingInventoryValue: lifoEndingInventory,
          cogs: lifoCogs,
          batches: lifoBatches.filter(b => b.qtyRemaining > 0)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghitung valuasi stok.', error: err.message });
  }
});

module.exports = router;
