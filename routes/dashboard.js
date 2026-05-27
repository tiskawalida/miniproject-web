const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/dashboard/stats - Fetch KPIs and Chart data
router.get('/stats', requireAuth, (req, res) => {
  try {
    const db = getDb();

    // 1. KPIs
    // Total Products
    const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').get().c;
    
    // Total Warehouses
    const totalWarehouses = db.prepare('SELECT COUNT(*) as c FROM warehouses WHERE is_active = 1').get().c;
    
    // Total Inventory Value (Stock Qty * Product Price)
    const inventoryVal = db.prepare(`
      SELECT SUM(s.quantity * p.price) as value
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE p.is_active = 1
    `).get().value || 0;

    // Critical low stock warning count
    const criticalStockAlerts = db.prepare(`
      SELECT COUNT(*) as count 
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.quantity < p.min_stock AND p.is_active = 1
    `).get().count;

    // 2. Charts Data
    // Stock levels by Category
    const stockByCategory = db.prepare(`
      SELECT c.name as category, SUM(s.quantity) as total_stock, SUM(s.quantity * p.price) as value
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND c.is_active = 1
      GROUP BY c.id
    `).all();

    // Transaction trends (last 7 days)
    const trxTrends = db.prepare(`
      SELECT SUBSTR(created_at, 1, 10) as date, 
             SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as qty_in,
             SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as qty_out
      FROM transactions
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date
      ORDER BY date ASC
    `).all();

    // Stock distribution per Warehouse
    const stockByWarehouse = db.prepare(`
      SELECT w.name as warehouse, w.city, COALESCE(SUM(s.quantity), 0) as total_stock, w.capacity
      FROM warehouses w
      LEFT JOIN stock s ON w.id = s.warehouse_id
      WHERE w.is_active = 1
      GROUP BY w.id
    `).all();

    // Top 5 products by stock
    const topProducts = db.prepare(`
      SELECT p.name, SUM(s.quantity) as stock
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY stock DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      kpis: {
        totalProducts,
        totalWarehouses,
        inventoryVal,
        criticalStockAlerts
      },
      charts: {
        stockByCategory,
        trxTrends,
        stockByWarehouse,
        topProducts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat statistik dashboard.', error: err.message });
  }
});

module.exports = router;
