# System Design

## 1. Arsitektur
SmartStock Pro dibangun sebagai aplikasi monolitik Node.js menggunakan Express.js.
Database SQLite dipakai untuk penyimpanan persisten lokal dengan skema tabel untuk pengguna, produk, gudang, transaksi, transfer, stok, job queue, audit log, dan notifikasi.

## 2. Lapisan utama
- Frontend: `public/index.html` + `public/js/app.js`
- Backend: `index.js` sebagai entry-point Express
- Database: `database/db.js` dan `database/init.js`
- Middleware: `middleware/auth.js` dan `middleware/logger.js`
- API modules: `routes/*.js`

## 3. Komponen fitur
- Auth: session, CSRF, role-based access control
- Dashboard: Chart.js, Leaflet, SSE notifikasi
- Jobs: queue background, laporan PDF, sinkronisasi, import CSV paralel
- Transfer: atomik update stok antar gudang dalam transaksi SQLite
- Products: upload image, gallery, search, filter, sort
- Monitoring: audit logs, performance alerts, notifications

## 4. Data flow
1. User login lewat `/api/auth/login`.
2. Frontend menyimpan token CSRF dan session cookie.
3. Permintaan API memakai header `x-csrf-token` untuk perubahan data.
4. Backend menyimpan action ke audit log saat terjadi perubahan.
5. Dashboard SSE mengirimkan update resource dan notifikasi setiap 3 detik.
6. Background worker memproses job queue setiap 5 detik.

## 5. Security design
- Proteksi CSRF implementasi token sesi.
- XSS minimisasi input dengan sanitasi string.
- Session cookie `httpOnly` + `sameSite: lax`.
- Rate limiting untuk API.

## 6. Deployment architecture
Aplikasi di-deploy sebagai service single-instance di `localhost:3000`.
Prod environment dapat mengaktifkan HTTPS dan `secure` cookie.
