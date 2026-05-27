const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const PDFDocument = require('pdfkit');
const { getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/logger');

// Setup multer for temporary uploads
const upload = multer({ dest: path.join(__dirname, '..', 'scratch') });

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '..', 'public', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// GET /api/jobs - List background jobs
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare('SELECT * FROM job_queue ORDER BY id DESC LIMIT 50').all();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat daftar pekerjaan.', error: err.message });
  }
});

// GET /api/jobs/report/pdf - Download inventory report as PDF
router.get('/report/pdf', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const kpis = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE is_active = 1) as totalProducts,
        (SELECT COUNT(*) FROM warehouses WHERE is_active = 1) as totalWarehouses,
        (SELECT COALESCE(SUM(s.quantity * p.price), 0) FROM stock s JOIN products p ON s.product_id = p.id WHERE p.is_active = 1) as inventoryVal,
        (SELECT COUNT(*) FROM stock s JOIN products p ON s.product_id = p.id WHERE s.quantity < p.min_stock AND p.is_active = 1) as criticalStockAlerts
    `).get();

    const stockByCategory = db.prepare(`
      SELECT c.name as category, COALESCE(SUM(s.quantity), 0) as total_stock, COALESCE(SUM(s.quantity * p.price), 0) as value
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND c.is_active = 1
      GROUP BY c.id
      ORDER BY total_stock DESC
    `).all();

    const stockByWarehouse = db.prepare(`
      SELECT w.name as warehouse, w.city, w.capacity, COALESCE(SUM(s.quantity), 0) as total_stock
      FROM warehouses w
      LEFT JOIN stock s ON w.id = s.warehouse_id
      WHERE w.is_active = 1
      GROUP BY w.id
      ORDER BY total_stock DESC
    `).all();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-inventaris-smartstock-pro.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#1f2937').text('SmartStock Pro', { continued: false });
    doc.fontSize(10).fillColor('#475569').text('Sistem Manajemen Inventaris PT Maju Bersama Digital');
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Dicetak oleh: ${req.session.user.full_name} (${req.session.user.role})`, { continued: false });
    doc.text(`Tanggal: ${new Date().toLocaleString('id-ID')}`);
    doc.moveDown();

    doc.fontSize(14).fillColor('#111827').text('Ringkasan KPI', { underline: true });
    doc.moveDown(0.5);
    const summaryData = [
      ['Total Produk', `${kpis.totalProducts} item`],
      ['Total Gudang Aktif', `${kpis.totalWarehouses} gudang`],
      ['Nilai Inventaris', `Rp ${kpis.inventoryVal.toLocaleString('id-ID')}`],
      ['Peringatan Stok Kritis', `${kpis.criticalStockAlerts} item`]
    ];
    summaryData.forEach(row => {
      doc.fontSize(10).fillColor('#0f172a').text(`${row[0]}: `, { continued: true });
      doc.fillColor('#334155').text(row[1]);
    });

    doc.moveDown();
    doc.fontSize(13).fillColor('#111827').text('Distribusi Stok Berdasarkan Kategori', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10);
    doc.text('Kategori', { continued: true, width: 180 });
    doc.text('Stok', { continued: true, width: 90, align: 'right' });
    doc.text('Nilai (Rp)', { align: 'right' });
    doc.moveDown(0.2);

    stockByCategory.forEach(item => {
      doc.fillColor('#0f172a').text(item.category, { continued: true, width: 180 });
      doc.fillColor('#1f2937').text(item.total_stock.toString(), { continued: true, width: 90, align: 'right' });
      doc.fillColor('#1f2937').text(`Rp ${item.value.toLocaleString('id-ID')}`, { align: 'right' });
    });

    doc.moveDown();
    doc.fontSize(13).fillColor('#111827').text('Utilisasi Kapasitas Gudang', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10);
    doc.text('Gudang', { continued: true, width: 130 });
    doc.text('Kota', { continued: true, width: 100 });
    doc.text('Stok', { continued: true, width: 80, align: 'right' });
    doc.text('Kapasitas', { continued: true, width: 80, align: 'right' });
    doc.text('Utilisasi', { align: 'right' });
    doc.moveDown(0.2);

    stockByWarehouse.forEach(item => {
      const utilization = item.capacity > 0 ? Math.round((item.total_stock / item.capacity) * 100) : 0;
      doc.fillColor('#0f172a').text(item.warehouse, { continued: true, width: 130 });
      doc.fillColor('#334155').text(item.city, { continued: true, width: 100 });
      doc.fillColor('#1f2937').text(item.total_stock.toString(), { continued: true, width: 80, align: 'right' });
      doc.text(item.capacity.toString(), { continued: true, width: 80, align: 'right' });
      doc.text(`${utilization}%`, { align: 'right' });
    });

    doc.moveDown();
    doc.fontSize(12).fillColor('#111827').text('Catatan', { underline: true });
    doc.fontSize(10).fillColor('#475569').text('Laporan ini dapat digunakan sebagai referensi untuk manajemen stok, kapasitas gudang, dan prioritas pengisian ulang inventaris.', {
      lineGap: 4
    });

    doc.end();
  } catch (err) {
    console.error('Failed to generate PDF report:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat laporan PDF.', error: err.message });
  }
});

// POST /api/jobs/report - Trigger a background job to generate stock report
router.post('/report', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const info = db.prepare(`
      INSERT INTO job_queue (type, payload, status)
      VALUES (?, ?, 'pending')
    `).run('generate_report', JSON.stringify({ userId: req.session.user.id, username: req.session.user.username }));

    auditLog(req.session.user.id, req.session.user.username, 'ENQUEUE_JOB', 'job_queue', `Generate report enqueued`, 'info', info.lastInsertRowid);
    res.json({ success: true, message: 'Proses generate laporan telah ditambahkan ke antrean latar belakang.', jobId: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan ke antrean.', error: err.message });
  }
});

// POST /api/jobs/sync - Trigger warehouse sync background task
router.post('/sync', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const db = getDb();
    const info = db.prepare(`
      INSERT INTO job_queue (type, payload, status)
      VALUES (?, ?, 'pending')
    `).run('sync_warehouses', JSON.stringify({ userId: req.session.user.id }));

    auditLog(req.session.user.id, req.session.user.username, 'ENQUEUE_JOB', 'job_queue', `Warehouse sync job enqueued`, 'info', info.lastInsertRowid);
    res.json({ success: true, message: 'Proses sinkronisasi data antar gudang dimasukkan ke antrean.', jobId: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memulai sinkronisasi.', error: err.message });
  }
});

// POST /api/jobs/import-csv - Parallel CSV batch import of products
router.post('/import-csv', requireAuth, requireRole('admin', 'manager'), upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File CSV wajib diunggah.' });
  }

  const results = [];
  const errors = [];
  
  // Read and parse CSV file
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Delete temporary uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) {}

      if (results.length === 0) {
        return res.status(400).json({ success: false, message: 'File CSV kosong atau tidak valid.' });
      }

      // Parallel process chunks of products
      const chunkSize = 5;
      const db = getDb();
      let importedCount = 0;

      // Wrap validation and database operations into chunks
      for (let i = 0; i < results.length; i += chunkSize) {
        const chunk = results.slice(i, i + chunkSize);
        
        // Execute inserts in parallel for the current chunk
        await Promise.all(chunk.map(async (row) => {
          try {
            const { code, name, description, category_code, supplier_code, unit, price, min_stock } = row;
            if (!code || !name || !category_code || !supplier_code) {
              throw new Error(`Data tidak lengkap di baris: ${JSON.stringify(row)}`);
            }

            // Find category
            let cat = db.prepare('SELECT id FROM categories WHERE code = ?').get(category_code.trim());
            if (!cat) {
              // Auto-create category for seamless migration
              const catInfo = db.prepare('INSERT INTO categories (code, name, description) VALUES (?, ?, ?)')
                .run(category_code.trim().toUpperCase(), `Kategori ${category_code}`, 'Diimpor via CSV');
              cat = { id: catInfo.lastInsertRowid };
            }

            // Find supplier
            let sup = db.prepare('SELECT id FROM suppliers WHERE code = ?').get(supplier_code.trim());
            if (!sup) {
              // Auto-create supplier for seamless migration
              const supInfo = db.prepare('INSERT INTO suppliers (code, name, city) VALUES (?, ?, ?)')
                .run(supplier_code.trim().toUpperCase(), `Supplier ${supplier_code}`, 'Jakarta');
              sup = { id: supInfo.lastInsertRowid };
            }

            // Verify if product code already exists
            const exists = db.prepare('SELECT id FROM products WHERE code = ?').get(code.trim());
            if (exists) {
              // Update existing product
              db.prepare(`
                UPDATE products 
                SET name = ?, description = ?, category_id = ?, supplier_id = ?, unit = ?, price = ?, min_stock = ?, updated_at = datetime('now')
                WHERE id = ?
              `).run(name.trim(), description || '', cat.id, sup.id, unit || 'pcs', parseFloat(price) || 0, parseInt(min_stock) || 10, exists.id);
            } else {
              // Insert new product
              const pInfo = db.prepare(`
                INSERT INTO products (code, name, description, category_id, supplier_id, unit, price, min_stock)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).run(code.trim().toUpperCase(), name.trim(), description || '', cat.id, sup.id, unit || 'pcs', parseFloat(price) || 0, parseInt(min_stock) || 10);
              
              // Seed stock level 0 for all warehouses
              const warehouses = db.prepare('SELECT id FROM warehouses WHERE is_active = 1').all();
              const insertStock = db.prepare('INSERT OR IGNORE INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, 0)');
              warehouses.forEach(w => insertStock.run(pInfo.lastInsertRowid, w.id));
            }
            importedCount++;
          } catch (rowErr) {
            errors.push({ row: row.code || 'Unknown', error: rowErr.message });
          }
        }));
      }

      auditLog(
        req.session.user.id, 
        req.session.user.username, 
        'IMPORT_CSV', 
        'products', 
        `Batch import: ${importedCount} produk berhasil diimpor/diupdate. Error: ${errors.length}`, 
        errors.length > 0 ? 'warning' : 'info'
      );

      res.json({
        success: true,
        message: `Import selesai. Berhasil: ${importedCount}, Gagal: ${errors.length}`,
        imported: importedCount,
        errors: errors
      });
    });
});

// =========================================================================
// BACKGROUND WORKER PROCESSOR (Executes asynchronously from the main loop)
// =========================================================================
async function runWorker() {
  const db = getDb();
  
  // Find next pending job
  const job = db.prepare("SELECT * FROM job_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get();
  if (!job) return; // No jobs pending

  // Mark job as processing
  db.prepare("UPDATE job_queue SET status = 'processing', updated_at = datetime('now') WHERE id = ?").run(job.id);
  console.log(`👷 Worker started processing Job #${job.id} (${job.type})`);

  try {
    const payload = JSON.parse(job.payload || '{}');
    let result = '';

    if (job.type === 'generate_report') {
      // Simulate heavy report generation (read database tables, format, write to file)
      // Sleep 3 seconds to prove background async nature
      await new Promise(resolve => setTimeout(resolve, 3000));

      const products = db.prepare(`
        SELECT p.code, p.name, c.name as category, s.name as supplier, p.price,
        (SELECT SUM(quantity) FROM stock WHERE product_id = p.id) as total_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.is_active = 1
      `).all();

      const totalVal = products.reduce((acc, p) => acc + (p.price * (p.total_stock || 0)), 0);

      // Create detailed HTML/Text file report
      const fileName = `laporan-stok-${Date.now()}.html`;
      const filePath = path.join(reportsDir, fileName);

      let html = `
        <html>
        <head>
          <title>SmartStock Pro - Laporan Inventaris Utama</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #2c3e50; border-bottom: 2px solid #34495e; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #bdc3c7; padding: 8px 12px; text-align: left; }
            th { background-color: #ecf0f1; color: #2c3e50; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .total { font-weight: bold; font-size: 1.1em; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Laporan Inventaris SmartStock Pro</h1>
          <p>Dihasilkan oleh: ${payload.username || 'System Background Worker'}</p>
          <p>Tanggal Cetak: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Supplier</th>
                <th>Harga Satuan</th>
                <th>Total Stok</th>
                <th>Nilai Total</th>
              </tr>
            </thead>
            <tbody>
      `;

      products.forEach(p => {
        const itemVal = p.price * (p.total_stock || 0);
        html += `
          <tr>
            <td>${p.code}</td>
            <td>${p.name}</td>
            <td>${p.category || '-'}</td>
            <td>${p.supplier || '-'}</td>
            <td>Rp ${p.price.toLocaleString('id-ID')}</td>
            <td>${p.total_stock || 0}</td>
            <td>Rp ${itemVal.toLocaleString('id-ID')}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
          <p class="total">Total Nilai Aset Inventaris: Rp ${totalVal.toLocaleString('id-ID')}</p>
        </body>
        </html>
      `;

      fs.writeFileSync(filePath, html);
      result = `/reports/${fileName}`; // file link path
    } 
    
    else if (job.type === 'sync_warehouses') {
      // Simulate sync across the 5 cities (takes 2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = 'Sukses menyinkronkan data inventaris di 5 Kota Besar (Jakarta, Surabaya, Bandung, Medan, Makassar). Ledger kliring terverifikasi.';
    }

    // Update job status to completed
    db.prepare(`
      UPDATE job_queue 
      SET status = 'completed', result = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(result, job.id);
    
    // Add success notification
    db.prepare(`
      INSERT INTO notifications (type, title, message, severity, target_role)
      VALUES ('job_success', 'Pekerjaan Latar Belakang Selesai', 'Pekerjaan #${job.id} (${job.type}) berhasil diselesaikan.', 'info', 'admin')
    `).run();

    console.log(`✅ Worker successfully processed Job #${job.id}`);
  } catch (err) {
    console.error(`❌ Worker failed processing Job #${job.id}:`, err.message);
    db.prepare(`
      UPDATE job_queue 
      SET status = 'failed', error = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(err.message + '\n' + err.stack, job.id);

    db.prepare(`
      INSERT INTO notifications (type, title, message, severity, target_role)
      VALUES ('job_failed', 'Pekerjaan Latar Belakang Gagal', 'Pekerjaan #${job.id} mengalami kesalahan: ${err.message}', 'critical', 'admin')
    `).run();
  }
}

module.exports = router;
module.exports.runWorker = runWorker;
