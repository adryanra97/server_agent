# Dokumentasi TwinPeak

Panduan ini dibuat untuk dua kebutuhan: **menjalankan TwinPeak seperti sekarang** dan **menyiapkannya agar suatu hari bisa dipakai sebagai aplikasi internal perusahaan**. Keduanya sengaja dipisahkan supaya tim tidak keliru menganggap fitur demo sudah aman digunakan untuk data produksi.

TwinPeak adalah prototipe *simulation-based Digital Twin* untuk mengevaluasi kapasitas server, membandingkan skenario beban, serta mendokumentasikan keputusan teknis melalui alur lima peran. Model **Rules** menghitung kebutuhan terhadap kapasitas secara deterministik. Model **SimPy** mensimulasikan kedatangan request, penggunaan CPU, RAM, dan koneksi, lalu menghasilkan bukti eksekusi. Keduanya bukan sistem monitoring langsung dan tidak mengirim trafik pengujian ke server produksi.

> **Status dokumentasi:** Folder ini tersedia sebagai `docs/` di repository `adryanra97/server_agent`. Panduan migrasi database, autentikasi, dan deployment mandiri merupakan rancangan; fitur-fitur tersebut tidak otomatis terpasang hanya karena dokumennya tersedia.

## Mulai dari mana?

| Kalau kamu ingin… | Baca |
| --- | --- |
| Memahami sistem dan batasan demo | [01 — Gambaran sistem](01-gambaran-sistem.md) |
| Menjalankan aplikasi di laptop | [02 — Instalasi lokal](02-instalasi-lokal.md) |
| Memasang aplikasi di VM/server sendiri | [03 — Deploy ke server](03-deploy-server.md) |
| Menentukan kebutuhan awal database dan struktur datanya | [04 — Rencana database](04-rencana-database.md) |
| Membangun akun, login, hak akses, dan audit yang sungguhan | [05 — Rencana user management](05-rencana-user-management.md) |
| Mendemokan sistem sebagai QA, Lead, Engineer, Manager, atau Support | [06 — User guide](06-user-guide.md) |
| Menyusun tahapan implementasi dan cutover | [07 — Checklist migrasi](07-checklist-migrasi.md) |
| Mengoperasikan aplikasi dan mengelola risiko | [08 — Operasional dan keamanan](08-operasional-dan-keamanan.md) |
| Memanggil API atau mengatasi kendala umum | [09 — API dan troubleshooting](09-api-dan-troubleshooting.md) |

## Yang sudah ada dan yang masih direncanakan

| Kemampuan | Kondisi saat ini | Target pengembangan |
| --- | --- | --- |
| Simulasi kapasitas Rules dan SimPy | **Sudah ada** | Pengujian dan kalibrasi lebih luas |
| Perbandingan beban dan timeline SimPy | **Sudah ada** | Integrasi data beban yang tervalidasi |
| Demo lima peran dan alur release | **Sudah ada, berbasis browser** | Identitas dan otorisasi di backend |
| Ekspor laporan PDF/CSV | **Sudah ada pada alur yang didukung** | Arsip laporan terpusat |
| Database pengguna, release, dan insiden | **Belum ada** | PostgreSQL atau pilihan DB yang disepakati |
| Login perusahaan, session aman, MFA/SSO | **Belum ada** | OIDC/SSO + session server-side |
| Hak akses API berdasarkan role | **Belum ada** | RBAC yang diperiksa di backend |
| Audit trail terpusat | **Belum ada** | Event audit append-only dan retensi |
| Monitoring server produksi secara langsung | **Belum ada** | Integrasi telemetry setelah desain disetujui |
| Deploy di Vercel | **Sudah berjalan** | Bisa dipertahankan atau dipindah |
| Deploy mandiri di Linux | **Belum dikemas resmi** | Panduan contoh pada dokumen ini |

## Susunan repository yang disarankan

```text
server_agent/
├── README.md                 # README proyek yang sudah ada; tidak diganti
├── backend/                 # FastAPI, Rules, SimPy, pengujian
├── frontend/                # Next.js, halaman dan demo lima role
├── vercel.json              # Routing dua service di Vercel
└── docs/                    # Panduan instalasi, penggunaan, dan migrasi
    ├── README.md
    ├── 01-gambaran-sistem.md
    ├── 02-instalasi-lokal.md
    ├── 03-deploy-server.md
    ├── 04-rencana-database.md
    ├── 05-rencana-user-management.md
    ├── 06-user-guide.md
    ├── 07-checklist-migrasi.md
    ├── 08-operasional-dan-keamanan.md
    └── 09-api-dan-troubleshooting.md
```

## Aturan membaca dokumentasi ini

- **Saat ini** berarti sudah ditemukan dalam source code pada branch `main`, ditinjau pada **15 November 2026**.
- **Usulan** berarti desain atau langkah operasional yang masih harus dibuat, diuji, dan disetujui tim.
- **Contoh** berarti parameter awal atau konfigurasi referensi, **bukan** angka hasil pengujian kapasitas ataupun persyaratan resmi dari vendor.
- Nama proyek di UI adalah **TwinPeak**. Nama direktori, paket, dan modul masih menggunakan sebagian nama **ServerAgent/Copdash**. Jangan mengganti nama modul begitu saja karena dapat memutus import atau deployment.

## Catatan penting sebelum dipakai perusahaan

Pemilihan persona pada `/demo` dan login pada `/login` **bukan** sistem autentikasi perusahaan. Demo menyimpan record di `localStorage` browser serta persona dan konfigurasi LLM sementara di `sessionStorage`. Data antar perangkat tidak otomatis tersinkronisasi. Jangan memasukkan kredensial, nama pelanggan, atau data sensitif ke instalasi demo yang terbuka ke publik.

Kalau ingin memulai penerapan internal, urutan terbaik adalah: **pisahkan lingkungan → pastikan deploy stabil → tetapkan database → implementasikan login/session → terapkan hak akses backend → migrasi data → audit dan uji keamanan → baru cutover**. Detailnya ada pada [checklist migrasi](07-checklist-migrasi.md).