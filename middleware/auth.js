const { getDb } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// =============================================
// Auth Middleware - Check if user is logged in
// =============================================
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
      return res.status(401).json({ success: false, message: 'Sesi telah berakhir. Silakan login kembali.' });
    }
    return res.redirect('/');
  }
  // Session activity update
  req.session.lastActivity = Date.now();
  next();
}

// =============================================
// Role-based Access Control
// =============================================
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Akses ditolak. Hanya ${roles.join('/')} yang dapat mengakses fitur ini.` 
      });
    }
    next();
  };
}

// =============================================
// Session Timeout Middleware (30 minutes)
// =============================================
function sessionTimeout(req, res, next) {
  const TIMEOUT = 30 * 60 * 1000; // 30 minutes
  if (req.session && req.session.user) {
    const now = Date.now();
    if (req.session.lastActivity && (now - req.session.lastActivity) > TIMEOUT) {
      const username = req.session.user.username;
      req.session.destroy();
      if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Sesi habis karena tidak aktif 30 menit. Silakan login kembali.',
          timeout: true
        });
      }
      return res.redirect('/?timeout=1');
    }
    req.session.lastActivity = now;
  }
  next();
}

// =============================================
// CSRF Protection
// =============================================
function generateCsrfToken(req) {
  const token = uuidv4();
  if (!req.session.csrfToken) {
    req.session.csrfToken = token;
  }
  return req.session.csrfToken;
}

function verifyCsrfToken(req, res, next) {
  // Skip for GET, HEAD, OPTIONS
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  // Skip login endpoint because user has no CSRF token yet
  if (req.path === '/api/auth/login') return next();
  // Skip for API routes that use Bearer tokens (SSE etc)
  if (req.path.startsWith('/api/events')) return next();
  
  const sessionToken = req.session && req.session.csrfToken;
  const requestToken = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!sessionToken || !requestToken || sessionToken !== requestToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
  }
  next();
}

module.exports = { requireAuth, requireRole, sessionTimeout, generateCsrfToken, verifyCsrfToken };
