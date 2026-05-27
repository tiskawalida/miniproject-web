const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { getDb } = require('./database/db');
const { requestLogger, sanitizeBody, auditLog } = require('./middleware/logger');
const { sessionTimeout, verifyCsrfToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Security Middlewares
// Configure Helmet with CSP for CDNs (Chart.js, Leaflet, Google Fonts)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiter: Max 200 requests per 15 minutes for APIs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// 2. Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);

// 3. Session Configuration
app.use(session({
  name: 'smartstock_session',
  secret: 'smartstock_secret_key_12345!@#$',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true in HTTPS production
    sameSite: 'lax',
    maxAge: 30 * 60 * 1000 // 30 minutes session life
  }
}));

// 4. CSRF Protection and request validation
app.use(verifyCsrfToken);

// 5. Request Logging and Timeout verification
app.use(requestLogger);
app.use(sessionTimeout);

// 5. Static Assets Routing
app.use(express.static(path.join(__dirname, 'public')));

// 6. API Route Handlers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/products', require('./routes/products'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/monitoring', require('./routes/monitoring'));
app.use('/api/jobs', require('./routes/jobs'));

// 7. Base frontend route fallback (Single Page App)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// 8. Global Error Handler (Modul 4: Notifikasi error pada aplikasi dikirim ke admin)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  
  // Log to Audit Log database (Severity: critical)
  const username = req.session && req.session.user ? req.session.user.username : 'anonymous';
  const userId = req.session && req.session.user ? req.session.user.id : null;
  
  auditLog(
    userId,
    username,
    'SERVER_ERROR',
    req.path,
    `Error: ${err.message}. Stack: ${err.stack}`,
    'critical'
  );

  // In-app Notification for Admin
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO notifications (type, title, message, severity, target_role)
      VALUES (?, ?, ?, ?, ?)
    `).run('system_error', 'Unhandled Server Error', `Aplikasi mengalami error: ${err.message}`, 'critical', 'admin');
  } catch (dbErr) {
    console.error('Failed to log error to notifications table:', dbErr);
  }

  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan sistem internal. Masalah ini telah dilaporkan kepada Administrator.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 9. Start Server & Background Worker Queue
app.listen(PORT, () => {
  console.log(`🚀 SmartStock Pro server running on http://localhost:${PORT}`);
  
  // Start job queue monitor (runs every 5 seconds)
  const { runWorker } = require('./routes/jobs');
  setInterval(() => {
    runWorker().catch(err => console.error('Error running worker queue:', err));
  }, 5000);
});
