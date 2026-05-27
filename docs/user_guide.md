# Panduan Pengguna, FAQ, & API Reference - SmartStock Pro

Dokumen ini berisi panduan pengoperasian sistem **SmartStock Pro**, tanya-jawab umum (FAQ), dokumentasi API teknis, serta panduan pemecahan masalah (troubleshooting).

---

## 1. Panduan Pengoperasian Sistem (User Guide)

SmartStock Pro dapat diakses berdasarkan level peran pengguna (Admin, Manajer Gudang, Staf Gudang, Viewer):

### A. Autentikasi dan Login
1. Buka browser dan arahkan ke alamat web server (misal: `http://localhost:3000`).
2. Masukkan **Username** dan **Password** Anda. (Atau klik salah satu pill akun demo untuk pengisian otomatis cepat).
3. Klik tombol **Masuk Sistem**.
4. Jika login berhasil, Anda akan dialihkan ke Dashboard Utama dan cookie sesi diaktifkan. Sistem memiliki **Session Timeout otomatis selama 30 menit**. Jika tidak ada aktivitas, sesi akan berakhir secara otomatis demi keamanan.

### B. Membaca Dashboard & Real-Time Monitoring
* **KPI Panel**: Menampilkan total produk aktif, jumlah gudang, total nilai aset (Rupiah), dan jumlah stok kritis.
* **Tren Grafis**: Grafik garis memperlihatkan frekuensi transaksi masuk vs keluar 7 hari terakhir.
* **Peta Gudang**: Peta Indonesia menampilkan pin lokasi gudang. Arahkan kursor ke pin untuk melihat status kapasitas. Klik **Lihat Rincian Stok** pada popup pin untuk menampilkan detail persediaan barang di gudang tersebut.
* **Resource Monitor**: Menampilkan data beban CPU server, RAM, dan waktu respon koneksi web server saat ini secara langsung (diperbarui otomatis setiap 3 detik via SSE).
* **Export PDF**: Klik **Export PDF Laporan** di kanan atas untuk memicu mode print cetak laporan ringkasan aset eksekutif yang ramah cetak/simpan PDF.

### C. Mengelola Produk (Galeri Multimedia)
1. Klik menu **Galeri Produk** di sidebar kiri.
2. Cari produk secara instan melalui kolom pencarian, atau filter menggunakan kategori dan supplier.
3. Untuk menambahkan produk baru (khusus Admin & Manager): klik **Tambah Produk**, isi data lengkap, unggah foto produk (format JPEG/PNG, maks 2MB), dan klik **Simpan Produk**. Foto produk akan langsung terkompresi dan tampil sebagai preview.

### D. Perhitungan Stok Otomatis (FIFO vs LIFO)
1. Klik menu **Transaksi Stok** di sidebar kiri.
2. Pada panel atas bertuliskan **FIFO vs LIFO Valuation Engine**, pilih salah satu produk dari menu drop-down.
3. Sistem secara otomatis menghitung riwayat mutasi masuk/keluar, lalu menampilkan perbandingan Nilai Akhir Inventaris dan Harga Pokok Penjualan (COGS) antara metode FIFO dan LIFO secara berdampingan.

### E. Transfer Barang Antar Gudang
1. Klik menu **Transfer Gudang** di sidebar kiri.
2. Pengguna (Admin/Manager/Staff) dapat mengeklik **Minta Transfer** untuk memicu modal. Pilih produk, gudang asal, gudang tujuan, jumlah unit, dan catatan keperluan. Klik **Kirim Permintaan**.
3. Status transfer akan berstatus **Pending** dan manajer gudang tujuan akan menerima notifikasi live.
4. Manajer/Admin dapat mengeklik tombol **Setujui** atau **Tolak** pada tabel transfer. Jika disetujui, saldo stok gudang asal akan berkurang dan gudang tujuan akan bertambah secara aman dan realtime dalam satu transaksi database tunggal.

---

## 2. Frequently Asked Questions (FAQ) - Minimal 10 Pertanyaan

1. **Q: Apa itu SmartStock Pro?**
   * *A: SmartStock Pro adalah website sistem manajemen inventaris real-time yang memonitor kapasitas gudang, melacak mutasi barang, menghitung valuasi stok (FIFO/LIFO), dan menyinkronkan data di 5 kota besar.*
2. **Q: Apa saja peran pengguna (roles) yang didukung?**
   * *A: Ada 4 tingkat peran: Admin (kontrol penuh), Manager Gudang (pengelolaan transaksi & persetujuan transfer), Staff Gudang (input transaksi & request transfer), dan Viewer (hanya melihat data).*
3. **Q: Bagaimana sistem melindung data dari serangan SQL Injection?**
   * *A: Sistem menggunakan library `better-sqlite3` yang otomatis menerapkan Prepared Statements (parameterized queries) pada setiap eksekusi query SQL.*
4. **Q: Apa itu session timeout otomatis?**
   * *A: Untuk mencegah penyalahgunaan akun saat komputer ditinggalkan, sistem akan otomatis logout jika pengguna tidak aktif melakukan klik/request selama 30 menit.*
5. **Q: Bagaimana cara kerja perhitungan valuasi FIFO dan LIFO di sistem ini?**
   * *A: Sistem memproses transaksi pembelian barang masuk secara kronologis. FIFO mengeluarkan barang yang dibeli pertama kali, sedangkan LIFO mengeluarkan barang yang dibeli terakhir kali untuk menghitung harga pokok penjualan (COGS).*
6. **Q: Mengapa saya mendapatkan pesan "Kapasitas gudang tidak mencukupi" saat input transaksi?**
   * *A: Setiap gudang memiliki batas maksimum kapasitas penyimpanan (contoh: Gudang Makassar: 2000 unit). Jika transaksi masuk melebihi sisa kapasitas, transaksi otomatis digagalkan.*
7. **Q: Bagaimana proses transfer barang diproses secara paralel?**
   * *A: Pengurangan stok di gudang asal dan penambahan di gudang tujuan dilakukan di dalam satu transaksi database SQLite (ACID compliant) menggunakan callback asinkron untuk menjamin konsistensi saldo.*
8. **Q: Bagaimana cara mengimpor produk secara batch menggunakan CSV?**
   * *A: Buka menu "Background Jobs", pilih file CSV Anda yang sesuai format pemetaan, lalu klik "Mulai Impor". Proses impor membagi data menjadi chunking parallel untuk efisiensi waktu.*
9. **Q: Apa fungsi dari menu "Background Jobs"?**
   * *A: Menu ini untuk melihat progres tugas berat seperti ekspor laporan aset besar dan sinkronisasi gudang yang dikerjakan oleh worker queue di latar belakang agar browser tidak macet.*
10. **Q: Mengapa peta Leaflet tidak muncul di dashboard saya?**
    * *A: Pastikan browser Anda memiliki koneksi internet aktif karena map tiles dimuat secara langsung dari OpenStreetMap server via internet.*

---

## 3. Dokumentasi Endpoint API (API Reference)

### A. Autentikasi
* **POST `/api/auth/login`**
  * *Request Body:* `{ "username": "admin", "password": "..." }`
  * *Response (Success):* `{ "success": true, "message": "...", "user": { ... }, "csrfToken": "..." }`
* **POST `/api/auth/logout`**
  * *Response:* `{ "success": true, "message": "Logout berhasil." }`

### B. Produk
* **GET `/api/products`**
  * *Query Params:* `search`, `categoryId`, `supplierId`, `page`, `limit`
  * *Response:* `{ "success": true, "data": [...], "pagination": { ... } }`
* **POST `/api/products`** (Wajib CSRF Token & Role Admin/Manager)
  * *Payload:* Multipart Form Data (termasuk file image).

### C. Transaksi Stok
* **POST `/api/transactions`**
  * *Request Body:* `{ "type": "in/out", "product_id": 1, "warehouse_id": 1, "quantity": 10, "price_per_unit": 50000 }`
  * *Response:* `{ "success": true, "message": "Transaksi TRX-... berhasil disimpan." }`

### D. Transfer Gudang
* **POST `/api/transfers/:id/approve`**
  * *Response:* `{ "success": true, "message": "Transfer berhasil disetujui..." }`

---

## 4. Panduan Pemecahan Masalah (Troubleshooting Guide)

* **Masalah 1: Muncul pesan error "Invalid CSRF Token" saat menyimpan data.**
  * *Solusi:* Ini terjadi jika token pelindung web tidak cocok atau sesi Anda habis. Silakan refresh browser Anda (`F5`) untuk memperbarui token CSRF dan coba kembali.
* **Masalah 2: Stok barang sudah dikurangi, tetapi dashboard tidak menunjukkan perubahan.**
  * *Solusi:* Pastikan koneksi SSE (Server-Sent Events) tidak terhalang firewall atau proxy perusahaan Anda. Dashboard secara otomatis diperbarui, tetapi Anda juga dapat memaksa refresh data dengan memuat ulang halaman browser.
* **Masalah 3: Berkas CSV gagal diimpor dan muncul pesan error.**
  * *Solusi:* Periksa kembali header kolom file CSV Anda. Pastikan pemisah kolom menggunakan tanda koma (`,`) dan tidak ada spasi di header kolom seperti `code,name,category_code,supplier_code,unit,price,min_stock`.
* **Masalah 4: Nilai CPU dan RAM server terus menunjukkan angka 0%.**
  * *Solusi:* Server web membutuhkan beberapa detik untuk melakukan sampel beban kerja CPU pertama kali. Jika terus berlanjut, pastikan proses Node.js memiliki hak akses membaca metrik sistem OS server.
---

## 5. Screenshot Web
<img width="1909" height="945" alt="image" src="https://github.com/user-attachments/assets/7a6ef852-c29a-4c61-95d7-e21983e8b3a7" /> -Halaman Login
<img width="1874" height="879" alt="image" src="https://github.com/user-attachments/assets/c6251113-36a9-47b0-b9b8-e1ff2eb4fa57" /> -Dashboard
<img width="1873" height="866" alt="image" src="https://github.com/user-attachments/assets/f4f0bae2-ec63-4cc8-8b23-b2bc4f87c2d5" /> -Galeri Produk
<img width="1866" height="866" alt="image" src="https://github.com/user-attachments/assets/3dcd15af-db94-4596-880b-7773060038b2" /> -Kategori Produk
<img width="1869" height="869" alt="image" src="https://github.com/user-attachments/assets/1c8181e5-40c9-43c0-b4ed-82e13893b598" /> -Gudang
<img width="1888" height="877" alt="image" src="https://github.com/user-attachments/assets/5882cfba-d9b9-45c6-b8a6-ae38218f015b" /> -Transaksi Stok








