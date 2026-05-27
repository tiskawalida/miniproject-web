# Deployment Guide

## 1. Persyaratan
- Node.js 18+.
- Folder project memiliki `node_modules` yang terpasang.
- Hak akses tulis untuk `public/uploads`, `public/reports`, dan `scratch`.

## 2. Instalasi

```bash
npm install
```

## 3. Menjalankan aplikasi

```bash
npm run start
```

Atau untuk mode pengembangan:

```bash
npm run dev
```

## 4. Konfigurasi produksi
- Pastikan `app.use(session({... secure: true ...}))` jika aplikasi dijalankan di HTTPS.
- Atur reverse proxy / load balancer untuk meneruskan header dan session cookie.
- Aktifkan environment `NODE_ENV=production` untuk merahasiakan pesan error internal.

## 5. Backup dan pemeliharaan
- Backup file SQLite database secara berkala.
- Cadangkan folder `public/uploads` dan `public/reports`.
- Periksa file `CHANGES.md` untuk riwayat update.
