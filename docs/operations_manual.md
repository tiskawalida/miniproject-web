# Operations Manual

## 1. Pengantar
Dokumen ini menjelaskan bagaimana pengguna operasional dapat menggunakan SmartStock Pro setiap hari.

## 2. Login dan Dashboard
- Login dengan akun yang tersedia (Admin / Manager / Staff / Viewer).
- Dashboard menampilkan KPI inventaris, grafik tren, dan peta gudang.
- Notifikasi realtime ditampilkan di panel notifikasi.

## 3. Manajemen Master Data
- Admin dapat menambahkan kategori, supplier, gudang, dan produk.
- Saat membuat produk, foto dapat diunggah dan akan tampil di gallery.
- Produk dapat dicari dan difilter berdasarkan kategori/supplier.

## 4. Pengelolaan Stok
- Transaksi masuk/keluar dapat dicatat di modul transaksi.
- Sistem otomatis memicu peringatan saat stok mendekati `min_stock`.
- Supervisor dapat memantau peringatan stok di panel notifikasi.

## 5. Transfer Antar Gudang
- Staff dapat membuat permintaan transfer barang antar gudang.
- Manager/Admin akan menerima notifikasi transfer baru.
- Setelah disetujui, stok dikurangi dari gudang sumber dan ditambah ke gudang tujuan dengan validasi kapasitas.

## 6. Laporan dan Migrasi
- Gunakan module `Background Jobs` untuk membuat laporan PDF.
- `Import CSV` mendukung migrasi produk secara batch dan memproses data paralel.
- Gunakan `Reports` untuk mengunduh file hasil job latar belakang.

## 7. Monitoring dan Audit
- Admin dapat melihat audit log melalui API monitoring.
- Sistem melakukan log otomatis pada error server dan event penting.
- Gunakan data SSE untuk memantau performa CPU/RAM/response time.
