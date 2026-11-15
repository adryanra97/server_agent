# 02 — Instalasi Lokal (untuk Developer dan Demo)

Panduan ini ditujukan untuk orang yang baru menerima repository TwinPeak dan ingin menjalankannya di laptop. **Dua proses berbeda perlu hidup:** FastAPI untuk engine dan Next.js untuk antarmuka.

## 1. Prasyarat

- **Git** untuk mengambil source.
- **Python 3.12 atau lebih baru**, `pip`, dan kemampuan membuat virtual environment.
- **Node.js 22** dan `npm`.
- Koneksi internet saat pertama kali mengunduh dependency.
- Dua terminal, satu untuk backend dan satu untuk frontend.

Periksa instalasi:

```bash
git --version
python3 --version
node --version
npm --version
```

> Repository saat ditinjau belum menyediakan `frontend/package-lock.json`. Karena itu contoh memakai `npm install`, bukan `npm ci`. Jika tim nanti menambahkan lockfile yang dipelihara, gunakan `npm ci` untuk instalasi terulang yang lebih konsisten.

## 2. Ambil source

```bash
git clone https://github.com/adryanra97/server_agent.git
cd server_agent
```

Repository saat ini masih memakai nama `server_agent`. Produk yang ditampilkan ke pengguna bernama **TwinPeak**.

## 3. Jalankan backend (Terminal 1)

macOS/Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Windows PowerShell, untuk membuat dan mengaktifkan environment:

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Uji endpoint di terminal baru atau browser:

```bash
curl http://127.0.0.1:8000/health
```

Respons yang diharapkan:

```json
{"status":"ok"}
```

Dokumentasi API otomatis ada di `http://127.0.0.1:8000/docs`.

**Tentang `API_KEY`:** `backend/.env.example` hanya berisi variabel `API_KEY=`. Secara default endpoint API dapat dipanggil tanpa token. Jika `API_KEY` diberi nilai, endpoint evaluasi akan memerlukan Bearer token, sedangkan UI demo yang sekarang **belum mengirim token tersebut**. Jadi jangan mengaktifkan `API_KEY` secara sepihak lalu mengira UI tetap bekerja. Proteksi pengguna sesungguhnya termasuk pekerjaan migrasi.

## 4. Jalankan frontend (Terminal 2)

Dari root repository, buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:3000/`.

**Catatan penting:** request di frontend saat ini memakai URL relatif seperti `/verdict` dan `/api/v1/simpy/inspect`. Ketika Next.js dijalankan langsung pada port `3000`, permintaan tersebut **tidak otomatis** diteruskan ke FastAPI pada port `8000`. Kamu mungkin dapat melihat halaman, tetapi tombol simulasi gagal karena routing belum diproksi.

Pilih salah satu cara di bawah untuk pengujian **end-to-end** lokal:

- Jalankan dari root dengan `vercel dev`, sesuai konfigurasi `vercel.json` (perlu Vercel CLI dan konfigurasi project yang sesuai); **atau**
- Gunakan reverse proxy lokal yang mengirim halaman ke `3000` dan endpoint FastAPI ke `8000`, mengikuti pola [deploy server](03-deploy-server.md).

Jangan menambahkan endpoint API palsu demi membuat UI terlihat berhasil. Hasil harus berasal dari proses FastAPI sungguhan.

## 5. Verifikasi sederhana

Setelah frontend dan backend berada di belakang satu origin/proxy:

1. Akses `/` dan pastikan halaman utama muncul.
2. Akses `/health` dan cek `{"status":"ok"}`.
3. Akses `/demo`, pilih QA Tester, dan masuk ke workspace.
4. Buka **SimPy Workbench**, jalankan contoh bawaan, dan periksa verdict beserta resource utilization.
5. Buka `/methodology`, lihat asumsi input dan keterbatasan model.
6. Buka `/quality` untuk laporan GitHub Actions; halaman ini membutuhkan koneksi ke sumber evidence eksternal.

## 6. Menjalankan pengujian

Backend (dari direktori `backend`):

```bash
python -m pip install pytest httpx pytest-cov black ruff
pytest -q --cov=app --cov=main --cov-branch --cov-report=term-missing
black --check app main.py tests
ruff check app main.py tests
```

Frontend (dari direktori `frontend`):

```bash
npm run lint
npm run build
npm run test:unit
npm run test:coverage
```

Untuk browser E2E:

```bash
npx playwright install chromium
npm run test:e2e
```

Tes browser mengharuskan environment yang sesuai dengan konfigurasi Playwright. Bacalah `frontend/playwright.config.ts` jika web server pengujian belum berjalan. Hasil E2E yang benar berasal dari browser sesungguhnya, bukan sekadar pemeriksaan komponen.

## 7. Menutup aplikasi

Tekan `Ctrl+C` di kedua terminal. Data demo yang telah tersimpan di `localStorage` browser masih bisa bertahan setelah proses berhenti, sedangkan data tab di `sessionStorage` hanya bertahan sesuai siklus tab/sesi browser.