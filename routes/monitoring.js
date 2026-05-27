const express = require('express');
const router = express.Router();
const os = require('os');
const { getDb } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/logger');

// CPU load average calculations
function cpuAverage() {
  let totalIdle = 0, totalTick = 0;
  const cpus = os.cpus();
  for (let i = 0, len = cpus.length; i < len; i++) {
    const cpu = cpus[i];
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

function getCpuUsage(callback) {
  const startMeasure = cpuAverage();
  setTimeout(() => {
    const endMeasure = cpuAverage();
    const idleDifference = endMeasure.idle - startMeasure.idle;
    const totalDifference = endMeasure.total - startMeasure.total;
    const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
    callback(percentageCPU);
  }, 100);
}

// SSE Connection helper
function sendEvent(res, eventName, data) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// GET /api/monitoring/events - SSE Stream for real-time dashboard notifications & server resource updates
router.get('/events', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sendEvent(res, 'connected', { msg: 'Realtime SSE link connected' });

  let performanceLogged = false;

  const intervalId = setInterval(() => {
    getCpuUsage((cpu) => {
      // Memory Usage calculation
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const ramPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

      // Average Response Time calculation
      const times = global.responseTimeHistory || [];
      const avgResponse = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 8; // default 8ms

      const db = getDb();
      
      // Real-time stock alerts & notifications
      const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get().count;
      const recentNotifs = db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 15').all();
      
      // Auto Alert if avg response time is high (>250ms)
      if (avgResponse > 250 && !performanceLogged) {
        db.prepare(`
          INSERT INTO notifications (type, title, message, severity, target_role)
          VALUES ('performance', 'Respons Lambat!', 'Rata-rata waktu respons server melebihi threshold (>250ms)', 'warning', 'admin')
        `).run();
        performanceLogged = true; // prevent duplicate spam logs in same SSE session
      }

      sendEvent(res, 'dashboard_update', {
        metrics: {
          cpu,
          ram: ramPercent,
          responseTime: avgResponse,
          uptime: Math.round(process.uptime())
        },
        unreadCount,
        notifications: recentNotifs
      });
    });
  }, 3000); // Send updates every 3 seconds

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

// GET /api/monitoring/logs - Get Audit & Error Logs (Admin only)
router.get('/logs', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const severity = req.query.severity || '';
    const action = req.query.action || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let baseQuery = 'FROM audit_logs WHERE 1=1';
    const params = [];

    if (severity) {
      baseQuery += ' AND severity = ?';
      params.push(severity);
    }
    if (action) {
      baseQuery += ' AND action LIKE ?';
      params.push(`%${action}%`);
    }

    const items = db.prepare(`
      SELECT * 
      ${baseQuery}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get(...params).total;

    res.json({
      success: true,
      data: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat log audit.', error: err.message });
  }
});

// GET /api/monitoring/notifications - Get all notifications
router.get('/notifications', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 50').all();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat notifikasi.', error: err.message });
  }
});

// POST /api/monitoring/notifications/read-all - Mark all notifications as read
router.post('/notifications/read-all', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
    res.json({ success: true, message: 'Semua notifikasi ditandai telah dibaca.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui notifikasi.', error: err.message });
  }
});

module.exports = router;
