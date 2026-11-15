# 03 — Memasang TwinPeak di Server Sendiri

Dokumen ini menjelaskan **contoh instalasi mandiri** di satu VM Linux: Next.js dan FastAPI dijalankan sebagai dua layanan, sementara Nginx menerima request dari satu domain. Konfigurasi ini **belum merupakan deployment resmi yang sudah diuji pada server milik perusahaan**. Uji dahulu di staging.

Kalau tidak perlu pindah server, deployment Vercel saat ini sudah memakai dua layanan (`frontend` dan `backend`) yang diarahkan oleh `vercel.json`. Panduan berikut berlaku jika tim memutuskan berpindah ke VM/on-premise.

## 1. Kebutuhan awal server

**Estimasi perencanaan untuk demo/staging satu mesin**, bukan hasil benchmark atau angka kapasitas produksi:

| Komponen | Saran awal | Catatan |
| --- | --- | --- |
| OS | Ubuntu Server 24.04 LTS (atau Linux setara yang didukung tim) | Contoh perintah di bawah memakai Ubuntu |
| CPU | 2 vCPU | Model SimPy dan build Next.js memerlukan CPU |
| RAM | 4 GB minimum untuk percobaan, 8 GB lebih nyaman | Pisahkan build dari jam pemakaian jika RAM terbatas |
| Disk | 20 GB SSD untuk aplikasi, cache, dan log awal | Sisakan ruang untuk update, backup, dan artefak |
| Python | 3.12+ | Sesuai konfigurasi proyek |
| Node.js | 22 | Sesuai pengujian CI saat ini |
| Port publik | 80/443 | Buka hanya di reverse proxy |
| Port internal | 3000 dan 8000 | Bind ke `127.0.0.1`, tidak perlu dibuka publik |
| Database | **Tidak diperlukan untuk demo sekarang** | Direncanakan terpisah di [dokumen 04](04-rencana-database.md) |

Untuk produksi sungguhan, sizing harus ditentukan kembali setelah pengukuran jumlah user, request API, ukuran report, retensi, dan beban SimPy. Jangan menyimpulkan server 2 vCPU mampu menangani jumlah RPS tertentu tanpa load test terhadap **aplikasi TwinPeak sendiri**.

## 2. Persiapan server

Contoh berikut diasumsikan dijalankan oleh admin yang memiliki akses `sudo`. Pasang Git, Python, Nginx, dan sertifikat CA:

```bash
sudo apt update
sudo apt install -y git python3 python3-venv python3-pip nginx ca-certificates curl
python3 --version
```

Pasang **Node.js 22** dari sumber paket tepercaya yang disetujui tim operasional. Verifikasi:

```bash
node --version
npm --version
```

Siapkan folder instalasi:

```bash
sudo mkdir -p /opt/twinpeak
sudo chown "$USER":"$USER" /opt/twinpeak
git clone https://github.com/adryanra97/server_agent.git /opt/twinpeak
```

Jika repository privat, gunakan mekanisme deploy key atau token read-only sesuai kebijakan organisasi; jangan menempelkan personal access token dalam command yang disimpan shell history.

## 3. Siapkan backend FastAPI

```bash
cd /opt/twinpeak/backend
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Dari terminal kedua, cek:

```bash
curl --fail http://127.0.0.1:8000/health
```

Hentikan proses manual dengan `Ctrl+C` setelah berhasil.

## 4. Siapkan frontend Next.js

```bash
cd /opt/twinpeak/frontend
npm install
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Buka terminal baru, lalu cek:

```bash
curl -I http://127.0.0.1:3000/
```

Hentikan proses manual ketika siap mengubahnya menjadi layanan systemd.

## 5. Jalankan sebagai layanan systemd

Buat akun service tanpa akses login interaktif dan pindahkan kepemilikan source setelah seluruh dependency selesai dipasang:

```bash
sudo useradd --system --home-dir /opt/twinpeak --shell /usr/sbin/nologin twinpeak
sudo chown -R twinpeak:twinpeak /opt/twinpeak
```

Kalau akun `twinpeak` sudah ada, lewati perintah `useradd`. Untuk pembaruan aplikasi berikutnya, lakukan lewat proses deploy terkontrol, bukan mengedit file secara langsung saat layanan berjalan.

Buat `/etc/systemd/system/twinpeak-api.service`:

```ini
[Unit]
Description=TwinPeak FastAPI service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=twinpeak
Group=twinpeak
WorkingDirectory=/opt/twinpeak/backend
ExecStart=/opt/twinpeak/backend/.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=3
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

Buat `/etc/systemd/system/twinpeak-web.service`:

```ini
[Unit]
Description=TwinPeak Next.js frontend
After=network-online.target twinpeak-api.service
Wants=network-online.target

[Service]
Type=simple
User=twinpeak
Group=twinpeak
WorkingDirectory=/opt/twinpeak/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/env npm run start -- --hostname 127.0.0.1 --port 3000
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`/usr/bin/env npm` mengandalkan Node/npm tersedia di `PATH` layanan systemd. Jika Node dipasang menggunakan `nvm` per-user, path tersebut mungkin tidak tersedia bagi user service. Untuk server, lebih mudah menggunakan instalasi Node sistem atau menentukan path executable secara eksplisit.

Aktifkan layanan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now twinpeak-api twinpeak-web
sudo systemctl status twinpeak-api --no-pager
sudo systemctl status twinpeak-web --no-pager
```

Lihat log jika tidak mau hidup:

```bash
sudo journalctl -u twinpeak-api -n 100 --no-pager
sudo journalctl -u twinpeak-web -n 100 --no-pager
```

## 6. Atur Nginx agar browser hanya memakai satu domain

Buat `/etc/nginx/sites-available/twinpeak`:

```nginx
server {
    listen 80;
    server_name twinpeak.example.com;
    client_max_body_size 2m;

    # Semua request diteruskan dengan host dan protokol asal yang benar.
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;

    # Route API dari Next.js: jangan tertukar dengan API FastAPI.
    location = /api/reasoning {
        proxy_pass http://127.0.0.1:3000;
    }

    # Endpoint asli FastAPI.
    location ~ ^/(health|engines|verdict|docs|openapi\.json|redoc)$ {
        proxy_pass http://127.0.0.1:8000;
    }

    # Endpoint tambahan FastAPI, misalnya /api/v1/simpy/inspect.
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:8000;
    }

    # Semua halaman lain dan aset Next.js.
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

Ubah `twinpeak.example.com` menjadi domain sebenarnya. Aktifkan konfigurasi:

```bash
sudo ln -s /etc/nginx/sites-available/twinpeak /etc/nginx/sites-enabled/twinpeak
sudo nginx -t
sudo systemctl reload nginx
```

**Wajib pasang HTTPS** dengan sertifikat sah dan redirect HTTP ke HTTPS sebelum sistem dipakai di luar jaringan staging. Gunakan proses sertifikat yang disetujui tim (misalnya ACME/Certbot), atur DNS ke IP reverse proxy, dan verifikasi tanggal kedaluwarsa sertifikat. Contoh konfigurasi di atas hanya titik awal HTTP untuk pengujian routing, **bukan kondisi akhir untuk akses internet publik**.

## 7. Pemeriksaan setelah deploy

Setelah HTTPS berfungsi, uji dari komputer lain:

```bash
curl --fail https://twinpeak.example.com/health
curl --head https://twinpeak.example.com/
curl --head https://twinpeak.example.com/docs
```

Lanjutkan dengan menguji langsung dari browser:

- Landing page terbuka dan tombol demo berjalan.
- `/demo` dapat memilih persona.
- Skenario SimPy benar-benar menghasilkan verdict dan timeline.
- Perbandingan 1×/2×/3× berjalan tanpa kesalahan request ke `/verdict`.
- `/api/reasoning` tetap ditangani Next.js, bukan FastAPI.
- Tidak ada port 3000/8000 yang bisa diakses langsung dari luar VM.

## 8. Kewajiban keamanan dan batasan instalasi ini

**Sangat penting:** aplikasi saat ini belum memiliki login backend maupun RBAC sungguhan. Jangan membuka aplikasi dengan data perusahaan ke internet publik hanya karena Nginx dan HTTPS sudah hidup. Untuk staging, batasi akses dengan VPN, allowlist IP, atau SSO di reverse proxy yang dikelola tim (sebagai lapisan proteksi sementara). Perlindungan ini tidak menggantikan fitur user management di aplikasi.

Variabel `API_KEY` pada FastAPI bersifat opsional dan, jika diaktifkan, frontend sekarang tidak otomatis menambahkan Bearer token ke request. Implementasi autentikasi terpadu harus dirancang terlebih dahulu. Juga periksa ulang konfigurasi CORS, reverse proxy, dokumentasi API yang terbuka, logging, dan aturan keamanan sesuai kebijakan perusahaan.

## 9. Cara update tanpa kehilangan arah

Pada staging: ambil source versi yang telah ditinjau, jalankan `pip install -r requirements.txt`, `npm install`, dan `npm run build`, lalu restart layanan. Untuk produksi: pakai tag/commit terverifikasi, backup konfigurasi, catat rollback point, lakukan tes, deploy dengan prosedur terkontrol, dan pantau log beberapa waktu setelah perubahan.

Untuk sekarang **belum ada database aplikasi yang perlu dimigrasikan**. Setelah skema database ditambahkan, setiap deployment harus menyertakan strategi migration/rollback seperti pada [dokumen 07](07-checklist-migrasi.md).