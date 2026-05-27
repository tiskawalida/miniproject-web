const { getDb } = require('../database/db');

// =============================================
// Audit Logger
// =============================================
function auditLog(userId, username, action, entity, details, severity = 'info', entityId = null) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (user_id, username, action, entity, entity_id, details, severity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId || null, username || 'system', action, entity || '', entityId || null, details || '', severity);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// =============================================
// Request Logger Middleware
// =============================================
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Save response time for monitoring
    global.responseTimeHistory = global.responseTimeHistory || [];
    global.responseTimeHistory.push(duration);
    if (global.responseTimeHistory.length > 100) {
      global.responseTimeHistory.shift();
    }

    const user = req.session && req.session.user;
    if (user && req.method !== 'GET') {
      const action = `${req.method} ${req.path}`;
      auditLog(user.id, user.username, action, 'http', `Status: ${res.statusCode}, Duration: ${duration}ms`, 
        res.statusCode >= 500 ? 'critical' : res.statusCode >= 400 ? 'warning' : 'info');
    }
  });
  next();
}

// =============================================
// Input Sanitizer (XSS Prevention)
// =============================================
function sanitizeInput(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeBody(req, res, next) {
  function sanitize(value) {
    if (typeof value === 'string') {
      return sanitizeInput(value.trim());
    }
    if (Array.isArray(value)) {
      return value.map(sanitize);
    }
    if (value && typeof value === 'object') {
      const result = {};
      for (const key in value) {
        result[key] = sanitize(value[key]);
      }
      return result;
    }
    return value;
  }

  if (req.body) {
    req.body = sanitize(req.body);
  }
  next();
}

module.exports = { auditLog, requestLogger, sanitizeInput, sanitizeBody };
