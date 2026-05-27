# Test Plan

## 1. Lingkup
Menguji fungsionalitas utama SmartStock Pro pada level API dan UI.

## 2. Test cases

### 2.1 Auth
- TC1: Login dengan kredensial valid harus berhasil.
- TC2: Login dengan password salah harus ditolak.
- TC3: Logout harus menghapus session dan menolak akses API yang terlindungi.
- TC4: Permintaan POST tanpa CSRF token harus gagal dengan 403.

### 2.2 Produk dan gallery
- TC5: Admin dapat membuat produk baru dengan upload gambar.
- TC6: Produk dapat dicari berdasarkan nama/kode.
- TC7: Produk dapat diupdate dan gambar lama dihapus jika diganti.

### 2.3 Transfer antar gudang
- TC8: Staff dapat membuat request transfer pending.
- TC9: Manager/Admin dapat menyetujui transfer dan stok berpindah atomik.
- TC10: Persetujuan transfer menolak jika kapasitas gudang tujuan tidak mencukupi.

### 2.4 FIFO/LIFO
- TC11: Endpoint valuasi produk harus menghitung FIFO dan LIFO secara berbeda.
- TC12: Perhitungan FIFO menggunakan batch stok lebih awal, LIFO menggunakan batch terakhir.

### 2.5 Background jobs
- TC13: Job queue harus menerima enqueued report jobs.
- TC14: CSV import harus memproses data dalam chunk paralel dan menghasilkan laporan sukses/gagal.

### 2.6 Monitoring dan notifikasi
- TC15: SSE `/api/monitoring/events` harus terhubung dan menerima data metrik.
- TC16: Notifikasi stok kritis harus muncul di `notifications`.
- TC17: Audit log dapat difilter berdasarkan severity dan action.

## 3. Acceptance criteria
Semua TC di atas harus lulus tanpa error fatal, dengan status response 200 pada skenario valid dan error handling tepat pada skenario invalid.

## 4. Praktik
- Gunakan `npm run dev` lalu buka browser.
- Jalankan request API menggunakan Postman atau browser devtools.
- Verifikasi log dan database conformance dengan schema.
