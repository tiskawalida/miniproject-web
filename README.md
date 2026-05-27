# SmartStock Pro

SmartStock Pro — Sistem manajemen inventaris sederhana yang dibuat untuk tugas BNSP.

Fitur yang tersedia pada workspace ini:
- Autentikasi berbasis session dengan password yang di-hash
- Proteksi CSRF dan pengelolaan session yang aman
- Tampilan dashboard (vanilla JavaScript) dengan dukungan real-time SSE
- Background job queue dan endpoint export PDF

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

Isi Repository

- index.js - File utama aplikasi Express
- public/ - Asset frontend statis
- routes/ - Route API Express
- database/ - Inisialisasi database dan helper
