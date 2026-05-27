# Requirements Specification

## 1. Goal
Menetapkan cakupan fungsional SmartStock Pro sebagai sistem manajemen inventaris berbasis web untuk tugas BNSP.

## 2. Business requirements
- Sistem harus mengelola pengguna dengan peran Admin, Manager, Staff, dan Viewer.
- Sistem harus melacak produk, kategori, supplier, gudang, stok, transaksi, dan transfer antar gudang.
- Sistem harus menyediakan dashboard real-time dan notifikasi internal untuk peringatan stok serta error sistem.
- Sistem harus mendukung impor batch produk via CSV dan pembuatan laporan PDF.
- Sistem harus menggunakan audit log untuk semua tindakan penting.

## 3. Functional requirements
- User authentication/session dengan password hashed.
- Proteksi CSRF pada endpoint non-GET.
- CRUD untuk kategori, supplier, gudang, produk, dan transaksi.
- Transfer antar gudang dengan validasi stok dan kapasitas.
- Monitoring resource server realtime (CPU, RAM, uptime, response time).
- FIFO/LIFO valuation engine untuk estimasi ending inventory dan COGS.
- Upload gambar produk sebagai gallery multimedia.
- Multi-warehouse stock breakdown per produk.
- Parallel CSV import untuk migrasi produk.
- Background job queue untuk laporan dan sync gudang.

## 4. Non-functional requirements
- Respon API harus aman dan toleran terhadap input tidak valid.
- Aplikasi harus menyimpan metadata audit dan notifikasi dalam database SQLite.
- Dashboard harus menyediakan grafik dan peta aktif.
- Dokumentasi harus lengkap sebagai bukti pencapaian modul.

## 5. Acceptance criteria
- Admin dapat membuat user, supplier, kategori, produk, gudang.
- Staff dapat membuat transaksi dan transfer request.
- Manager/Admin dapat menyetujui atau menolak transfer.
- Sistem menghasilkan notifikasi stok rendah dan error internal.
- CSV import memproses batch produk dalam mode chunk paralel.
- Dashboard menampilkan KPIs, grafik, dan peta gudang.
