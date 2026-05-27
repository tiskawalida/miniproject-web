# SmartStock Pro

SmartStock Pro — Sistem manajemen inventaris berbasis web untuk tugas BNSP.

Fitur utama yang tersedia:
- Autentikasi session dengan password hashed menggunakan bcrypt
- Proteksi CSRF pada semua endpoint non-GET
- Manajemen pengguna, kategori, supplier, gudang, produk, dan stok
- Dashboard KPI real-time dengan grafik Chart.js dan peta Leaflet
- Monitoring server resource via SSE (CPU, RAM, response time, uptime)
- Audit log dan notifikasi internal untuk error, transfer, dan stok kritis
- Transfer antar gudang dengan validasi kapasitas dan stok
- Background job queue untuk laporan PDF, sinkronisasi gudang, dan impor CSV paralel
- Upload gambar produk ke galeri multimedia
- FIFO / LIFO valuation engine untuk perhitungan stok otomatis
- Pencarian, filter, dan pengurutan data produk

Cara Menjalankan

1. Install dependencies:

npm install

2. Jalankan aplikasi:

npm run dev

3. Buka http://localhost:3000 lalu login menggunakan akun demo berikut:

- Username: admin / Password: Admin@123
- Username: manager1 / Password: Manager@123
- Username: staff1 / Password: Staff@123
- Username: viewer1 / Password: Viewer@123

Dokumentasi Tersedia

- docs/architecture.md
- docs/migration_plan.md
- docs/security_risk_analysis.md
- docs/user_guide.md
- docs/requirements_spec.md
- docs/system_design.md
- docs/database_schema.md
- docs/api_reference.md
- docs/test_plan.md
- docs/developer_guide.md
- docs/deployment_guide.md
- docs/operations_manual.md

Isi Repository

- index.js - File utama aplikasi Express
- public/ - Asset frontend statis
- routes/ - Route API Express
- database/ - Inisialisasi database dan helper
- docs/ - Dokumentasi proyek dan spesifikasi
