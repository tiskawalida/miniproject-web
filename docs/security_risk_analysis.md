# Analisis Risiko Keamanan Informasi - SmartStock Pro

Dokumen ini menjelaskan risiko keamanan utama pada sistem SmartStock Pro dan langkah mitigasi yang diterapkan.

## 1. Risiko Autentikasi dan Akses

- Risiko: Pengguna tidak sah dapat mengakses data sensitif jika autentikasi tidak kuat.
- Mitigasi:
  - Password hashing menggunakan `bcrypt`.
  - Validasi kekuatan password (minimal 8 karakter, huruf besar, huruf kecil, angka, karakter spesial).
  - Multi-level role-based access control (`admin`, `manager`, `staff`, `viewer`).
  - Session timeout otomatis 30 menit.

## 2. Risiko CSRF (Cross-Site Request Forgery)

- Risiko: Form atau request dapat dikirim dari domain lain atas nama pengguna yang sudah login.
- Mitigasi:
  - Implementasi token CSRF yang disimpan di sesi dan dipasang pada header `x-csrf-token`.
  - Middleware `verifyCsrfToken` memverifikasi token untuk semua request non-GET.
  - Token dihasilkan saat login dan dikirim kembali ke klien.

## 3. Risiko XSS (Cross-Site Scripting)

- Risiko: Input pengguna dapat disuntikkan ke halaman web dan mengeksekusi kode jahat.
- Mitigasi:
  - Sanitasi input request `req.body` menggunakan pembersihan karakter khusus (HTML escaping).
  - Semua string input pengguna diubah menjadi bentuk aman sebelum diproses.
  - Konten antar muka tidak menampilkan data mentah tanpa penyaringan terlebih dahulu.

## 4. Risiko SQL Injection

- Risiko: Perintah SQL berbahaya dapat dieksekusi melalui input pengguna.
- Mitigasi:
  - Semua query SQL menggunakan prepared statements dengan parameter binding.
  - Tidak ada query yang dibuat dengan concatenation langsung dari input pengguna.

## 5. Risiko Manajemen Sesi dan Kebocoran Data

- Risiko: Sesi aktif dapat diretas atau disalahgunakan.
- Mitigasi:
  - Cookie `httpOnly` diaktifkan sehingga JavaScript tidak dapat membaca token sesi.
  - `sameSite: 'lax'` untuk mencegah permintaan lintas situs tidak sah.
  - `secure` disarankan diaktifkan pada lingkungan HTTPS produksi.

## 6. Risiko Logging dan Audit

- Risiko: Aktivitas pengguna dan error sistem dapat hilang atau tidak terdeteksi.
- Mitigasi:
  - Log audit menyimpan siapa, kapan, dan tindakan apa yang dilakukan.
  - Severity `critical`, `warning`, `info` mencatat insiden penting.
  - Error server ditangkap dalam middleware global dan dicatat ke tabel `notifications`.

## 7. Risiko Kerentanan Operasional dan Kinerja

- Risiko: Beban berat proses pelaporan dan impor data dapat memengaruhi ketersediaan sistem.
- Mitigasi:
  - Job queue menjalankan tugas berat di background tanpa memblokir request pengguna.
  - Monitoring real-time CPU/RAM/response time mendeteksi masalah performa.
  - Notifikasi otomatis dikirim saat rata-rata response time melebihi threshold.

## 8. Risiko Backup dan Rollback

- Risiko: Perubahan data besar atau migrasi gagal dapat menyebabkan kehilangan data.
- Mitigasi:
  - Proses migrasi CSV dirancang untuk memvalidasi data sebelum penyimpanan.
  - Dokumen rollback plan menjelaskan pemulihan dari snapshot basis data.
  - Cutover plan memastikan fase migrasi terkontrol dan dapat diverifikasi.

## 9. Dokumentasi Mitigasi

Sistem ini menyertakan dokumen:
- `docs/architecture.md` untuk topologi dan infrastruktur.
- `docs/migration_plan.md` untuk strategi migrasi, cutover, dan pembaharuan.
- `docs/security_risk_analysis.md` untuk analisis risiko keamanan dan mitigasi.
