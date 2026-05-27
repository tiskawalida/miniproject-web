# Developer Guide

## 1. Setup
1. Pastikan Node.js terpasang (versi 18+ direkomendasikan).
2. Jalankan di folder project:

```bash
npm install
```

3. Jalankan server:

```bash
npm run dev
```

4. Buka `http://localhost:3000`.

## 2. Struktur folder
- `index.js` : entry-point Express.
- `database/` : helper koneksi SQLite dan skema init.
- `routes/` : API route per domain.
- `middleware/` : auth, CSRF, audit, dan sanitasi.
- `public/` : frontend statis, CSS, JS, dan uploads.
- `docs/` : dokumentasi teknis dan fungsional.

## 3. Penambahan fitur
- Tambahkan route baru di `routes/`.
- Jika butuh helper DB, gunakan `getDb()` dari `database/db.js`.
- Catat semua perubahan penting ke `CHANGES.md`.

## 4. Kode standar
- Gunakan middleware `requireAuth` untuk endpoint yang memerlukan login.
- Gunakan `requireRole('admin', 'manager')` untuk operasi yang sensitif.
- Simpan audit log menggunakan `auditLog(userId, username, action, entity, details, severity, entityId)`.
- Sanitasi input di server menggunakan `sanitizeBody`.

## 5. Menjalankan worker
Server sudah menjalankan worker background secara otomatis setiap 5 detik ketika aplikasi dijalankan.

## 6. Testing manual
- Periksa endpoint `/api/dashboard/stats` dan `/api/monitoring/events`.
- Gunakan `POST /api/jobs/import-csv` untuk mengunggah file CSV produk.
