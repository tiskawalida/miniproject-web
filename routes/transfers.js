const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/logger');

// GET /api/transfers - Paginated transfers list
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const baseQuery = `
      FROM transfers t
      JOIN products p ON t.product_id = p.id
      JOIN warehouses w_from ON t.from_warehouse_id = w_from.id
      JOIN warehouses w_to ON t.to_warehouse_id = w_to.id
      LEFT JOIN users u_req ON t.requested_by = u_req.id
      LEFT JOIN users u_app ON t.approved_by = u_app.id
    `;

    const items = db.prepare(`
      SELECT t.*, p.name as product_name, p.code as product_code, p.unit as product_unit,
             w_from.name as from_warehouse_name, w_to.name as to_warehouse_name,
             u_req.full_name as requested_by_fullname, u_app.full_name as approved_by_fullname
      ${baseQuery}
      ORDER BY t.id DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get().total;

    res.json({
      success: true,
      data: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data transfer.', error: err.message });
  }
});

// POST /api/transfers - Request a transfer (Admin, Manager, Staff)
router.post('/', requireAuth, requireRole('admin', 'manager', 'staff'), (req, res) => {
  const { product_id, from_warehouse_id, to_warehouse_id, quantity, note } = req.body;
  if (!product_id || !from_warehouse_id || !to_warehouse_id || !quantity) {
    return res.status(400).json({ success: false, message: 'Produk, gudang asal, gudang tujuan, dan jumlah wajib diisi.' });
  }
  
  if (from_warehouse_id === to_warehouse_id) {
    return res.status(400).json({ success: false, message: 'Gudang asal dan tujuan tidak boleh sama.' });
  }

  const qty = parseInt(quantity);
  if (qty <= 0) return res.status(400).json({ success: false, message: 'Jumlah transfer harus lebih besar dari 0.' });

  try {
    const db = getDb();
    
    // Check source warehouse stock
    const sourceStock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?')
      .get(product_id, from_warehouse_id);
    
    if (!sourceStock || sourceStock.quantity < qty) {
      return res.status(400).json({ success: false, message: 'Stok di gudang asal tidak mencukupi untuk transfer.' });
    }

    // Generate code
    const count = db.prepare('SELECT COUNT(*) as c FROM transfers').get().c;
    const code = `TRF-${String(count + 1).padStart(5, '0')}`;

    const info = db.prepare(`
      INSERT INTO transfers (code, product_id, from_warehouse_id, to_warehouse_id, quantity, note, requested_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(code, product_id, from_warehouse_id, to_warehouse_id, qty, note || '', req.session.user.id);

    // Notify Manager/Admin of new pending transfer
    db.prepare(`
      INSERT INTO notifications (type, title, message, severity, target_role, related_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('transfer_request', 'Permintaan Transfer Baru', `Permintaan transfer ${qty} unit barang dari gudang asal [ID:${from_warehouse_id}] ke [ID:${to_warehouse_id}]`, 'info', 'manager', info.lastInsertRowid);

    auditLog(req.session.user.id, req.session.user.username, 'REQUEST_TRANSFER', 'transfers', `Request transfer ${code}: ${qty} unit product ID ${product_id}`, 'info', info.lastInsertRowid);
    res.json({ success: true, message: 'Permintaan transfer berhasil dibuat dengan status pending.', id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membuat transfer.', error: err.message });
  }
});

// POST /api/transfers/:id/approve - Approve & Complete Transfer (Admin & Manager)
// Pemrosesan Paralel: Updates source and destination concurrently inside a single transaction to prevent race conditions.
router.post('/:id/approve', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { id } = req.params;
  const db = getDb();

  try {
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id);
    if (!transfer) return res.status(404).json({ success: false, message: 'Data transfer tidak ditemukan.' });
    if (transfer.status !== 'pending') return res.status(400).json({ success: false, message: 'Transfer ini tidak sedang dalam status pending.' });

    const qty = transfer.quantity;
    const prodId = transfer.product_id;
    const fromWh = transfer.from_warehouse_id;
    const toWh = transfer.to_warehouse_id;

    // Check source stock
    const srcStock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?').get(prodId, fromWh);
    if (!srcStock || srcStock.quantity < qty) {
      throw new Error('Stok gudang asal tidak mencukupi.');
    }

    // Check destination capacity
    const destWh = db.prepare('SELECT capacity, name FROM warehouses WHERE id = ?').get(toWh);
    const destWhStockSum = db.prepare('SELECT SUM(quantity) as total FROM stock WHERE warehouse_id = ?').get(toWh).total || 0;
    if (destWhStockSum + qty > destWh.capacity) {
      throw new Error(`Gudang tujuan ${destWh.name} tidak memiliki kapasitas yang cukup. Sisa Kapasitas: ${destWh.capacity - destWhStockSum}`);
    }

    // Atomic SQLite transaction updating both warehouses concurrently
    const runTransferTransaction = db.transaction(() => {
      // 1. Decrement source warehouse stock
      db.prepare('UPDATE stock SET quantity = quantity - ?, updated_at = datetime("now") WHERE product_id = ? AND warehouse_id = ?')
        .run(qty, prodId, fromWh);

      // 2. Increment destination warehouse stock (or insert if not exists)
      const destStockRow = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?').get(prodId, toWh);
      if (destStockRow) {
        db.prepare('UPDATE stock SET quantity = quantity + ?, updated_at = datetime("now") WHERE product_id = ? AND warehouse_id = ?')
          .run(qty, prodId, toWh);
      } else {
        db.prepare('INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)')
          .run(prodId, toWh, qty);
      }

      // 3. Update transfer status
      db.prepare(`
        UPDATE transfers 
        SET status = 'completed', approved_by = ?, completed_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(req.session.user.id, id);

      // 4. Log incoming and outgoing transactions for auditing stock trails
      db.prepare(`
        INSERT INTO transactions (code, type, product_id, warehouse_id, quantity, note, reference_no, user_id)
        VALUES (?, 'out', ?, ?, ?, ?, ?, ?)
      `).run(`TRX-TRF-OUT-${id}`, prodId, fromWh, qty, `Kirim transfer gudang (${transfer.code})`, transfer.code, req.session.user.id);

      db.prepare(`
        INSERT INTO transactions (code, type, product_id, warehouse_id, quantity, note, reference_no, user_id)
        VALUES (?, 'in', ?, ?, ?, ?, ?, ?)
      `).run(`TRX-TRF-IN-${id}`, prodId, toWh, qty, `Terima transfer gudang (${transfer.code})`, transfer.code, req.session.user.id);
    });

    runTransferTransaction();

    // Insert alert/notif
    db.prepare(`
      INSERT INTO notifications (type, title, message, severity, target_role)
      VALUES (?, ?, ?, ?, ?)
    `).run('transfer_complete', 'Transfer Selesai', `Transfer ${qty} unit barang (${transfer.code}) dari gudang asal ke tujuan selesai diperbarui.`, 'info', 'staff');

    auditLog(req.session.user.id, req.session.user.username, 'APPROVE_TRANSFER', 'transfers', `Transfer ${transfer.code} disetujui dan diproses.`, 'info', id);
    res.json({ success: true, message: 'Transfer berhasil disetujui dan stok diperbarui secara realtime.' });
  } catch (err) {
    res.status(400).json({ success: false, message: `Gagal memproses transfer: ${err.message}` });
  }
});

// POST /api/transfers/:id/reject - Reject/Cancel Transfer (Admin & Manager)
router.post('/:id/reject', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id);
    if (!transfer) return res.status(404).json({ success: false, message: 'Data transfer tidak ditemukan.' });
    if (transfer.status !== 'pending') return res.status(400).json({ success: false, message: 'Transfer ini tidak sedang dalam status pending.' });

    db.prepare(`
      UPDATE transfers 
      SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    auditLog(req.session.user.id, req.session.user.username, 'REJECT_TRANSFER', 'transfers', `Transfer ${transfer.code} dibatalkan/ditolak.`, 'warning', id);
    res.json({ success: true, message: 'Permintaan transfer berhasil dibatalkan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membatalkan transfer.', error: err.message });
  }
});

module.exports = router;
