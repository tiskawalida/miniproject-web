const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { getDb } = require('../database/db');
const { auditLog } = require('../middleware/logger');
const { generateCsrfToken, requireAuth, requireRole } = require('../middleware/auth');

// Password strength validator
function isStrongPassword(password) {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return minLength && hasUpper && hasLower && hasDigit && hasSpecial;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
  }

  try {
    console.log('DEBUG: /api/auth/login called', { ip: req.ip, username });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username.trim());
    console.log('DEBUG: user lookup result', !!user);

    if (!user) {
      auditLog(null, username, 'LOGIN_FAILED', 'users', `Login gagal: user tidak ditemukan`, 'warning');
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    console.log('DEBUG: comparing password for user id', user.id);
    const match = await bcrypt.compare(password, user.password);
    console.log('DEBUG: bcrypt.compare result', match);
    if (!match) {
      auditLog(user.id, username, 'LOGIN_FAILED', 'users', `Login gagal: password salah`, 'warning');
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    // Set session
    req.session.user = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      warehouse_id: user.warehouse_id
    };
    req.session.lastActivity = Date.now();
    req.session.csrfToken = require('uuid').v4();

    // Update last login
    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    auditLog(user.id, user.username, 'LOGIN', 'users', `Login berhasil dari IP: ${req.ip}`, 'info');

    res.json({
      success: true,
      message: 'Login berhasil',
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, warehouse_id: user.warehouse_id },
      csrfToken: req.session.csrfToken
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  if (req.session && req.session.user) {
    auditLog(req.session.user.id, req.session.user.username, 'LOGOUT', 'users', 'User logout', 'info');
  }
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logout berhasil.' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  res.json({ success: true, user: req.session.user, csrfToken: req.session.csrfToken });
});

// GET /api/auth/users - List users (Admin only)
router.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.role, u.warehouse_id, u.is_active, u.last_login, u.created_at,
             w.name as warehouse_name
      FROM users u
      LEFT JOIN warehouses w ON u.warehouse_id = w.id
      ORDER BY u.id DESC
    `).all();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data user.', error: err.message });
  }
});

// POST /api/auth/users - Create User (Admin only)
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, password, full_name, email, role, warehouse_id } = req.body;
  if (!username || !password || !full_name || !email || !role) {
    return res.status(400).json({ success: false, message: 'Username, password, nama lengkap, email, dan role wajib diisi.' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Kekuatan password lemah. Harus minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, dan karakter spesial.' 
    });
  }

  try {
    const db = getDb();
    
    // Check duplicates
    const existUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim());
    if (existUser) return res.status(400).json({ success: false, message: 'Username atau email sudah digunakan.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const wId = warehouse_id ? parseInt(warehouse_id) : null;

    const info = db.prepare(`
      INSERT INTO users (username, password, full_name, email, role, warehouse_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username.trim(), hashedPassword, full_name.trim(), email.trim(), role, wId);

    auditLog(req.session.user.id, req.session.user.username, 'CREATE_USER', 'users', `User baru dibuat: ${username} (Role: ${role})`, 'warning', info.lastInsertRowid);
    res.json({ success: true, message: 'User berhasil ditambahkan.', id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan user.', error: err.message });
  }
});

// PUT /api/auth/users/:id - Edit User (Admin only)
router.put('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { full_name, email, role, warehouse_id, password, is_active } = req.body;
  if (!full_name || !email || !role) {
    return res.status(400).json({ success: false, message: 'Nama lengkap, email, dan role wajib diisi.' });
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

    const wId = warehouse_id ? parseInt(warehouse_id) : null;
    const isActive = is_active !== undefined ? parseInt(is_active) : 1;

    if (password) {
      if (!isStrongPassword(password)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Kekuatan password lemah. Harus minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, dan karakter spesial.' 
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare(`
        UPDATE users 
        SET full_name = ?, email = ?, role = ?, warehouse_id = ?, password = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(full_name.trim(), email.trim(), role, wId, hashedPassword, isActive, req.params.id);
    } else {
      db.prepare(`
        UPDATE users 
        SET full_name = ?, email = ?, role = ?, warehouse_id = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(full_name.trim(), email.trim(), role, wId, isActive, req.params.id);
    }

    auditLog(req.session.user.id, req.session.user.username, 'UPDATE_USER', 'users', `User id ${req.params.id} (${user.username}) diupdate oleh admin`, 'warning', req.params.id);
    res.json({ success: true, message: 'User berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui user.', error: err.message });
  }
});

// DELETE /api/auth/users/:id - Delete User (Admin only)
router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  if (parseInt(req.params.id) === req.session.user.id) {
    return res.status(400).json({ success: false, message: 'Tidak dapat menghapus diri sendiri.' });
  }
  try {
    const db = getDb();
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    auditLog(req.session.user.id, req.session.user.username, 'DELETE_USER', 'users', `User ${user.username} (ID: ${req.params.id}) dihapus oleh admin`, 'critical', req.params.id);
    res.json({ success: true, message: 'User berhasil dihapus secara permanen.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus user.', error: err.message });
  }
});

module.exports = router;
