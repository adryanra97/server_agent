# 09 — Referensi API Ringkas dan Troubleshooting

Dokumen ini memudahkan developer atau tim operasional memahami route yang sebenarnya digunakan TwinPeak. Kontrak lengkap tetap mengacu ke **`/openapi.json` dan `/docs` dari FastAPI pada commit yang terpasang**.

## 1. Daftar endpoint

| Method | Path | Fungsi |
| --- | --- | --- |
| GET | `/health` | Liveness backend |
| GET | `/engines` | Daftar engine (`rules`, `simpy`) |
| POST | `/verdict` | Evaluasi input server + workload |
| POST | `/api/v1/simpy/inspect` | Hasil SimPy plus detail/timeline dari event |
| GET | `/api/v1/quality` | Status job dan evidence GitHub Actions |
| GET | `/api/v1/quality/tests` | Report tes JUnit-derived yang dipublikasikan |
| GET | `/docs` | Swagger UI FastAPI |
| GET | `/openapi.json` | Skema API OpenAPI FastAPI |
| POST | `/api/reasoning` | Route **Next.js**, penjelasan LLM opsional |

`/api/reasoning` **bukan** endpoint FastAPI. Pada Vercel maupun reverse proxy sendiri, route ini harus dikirim ke frontend Next.js, sedangkan `/api/v1/*` harus dikirim ke backend FastAPI.

## 2. Contoh mengevaluasi kapasitas

Gunakan domain yang sudah memiliki routing benar atau backend langsung pada `127.0.0.1:8000`:

```bash
curl --fail-with-body -X POST http://127.0.0.1:8000/verdict \
  -H 'Content-Type: application/json' \
  -d '{
    "engine": "simpy",
    "spec": {
      "cpu": {"cores": 4, "clock_ghz": 2.5},
      "ram": {"total_mb": 8192},
      "network": {"bandwidth_mbps": 1000, "max_connections": 10000}
    },
    "load": {
      "rps": 100,
      "avg_cpu_ms_per_req": 10,
      "avg_mem_mb_per_req": 5,
      "concurrent_connections": 100,
      "payload_kb": 10
    }
  }'
```

Ganti path ke `/api/v1/simpy/inspect` untuk mendapatkan detail SimPy. Respons inspeksi memuat `result` yang kompatibel dengan verdict asli dan `simulation` berisi metadata serta timeline. Untuk GET/POST lain, cek field dan respons terkini di OpenAPI karena contoh ini tidak menggantikan spesifikasi.

## 3. Kesalahan umum

### Website terbuka, tetapi tombol simulasi gagal

**Kemungkinan terbesar:** frontend Next.js berjalan pada `:3000`, sedangkan `/verdict` tidak diteruskan ke backend `:8000`. Periksa reverse proxy atau jalankan `vercel dev` sesuai `vercel.json`.

Cek respons yang benar-benar diterima browser melalui tab Network; jangan menebak dari tampilan loading.

### `/api/reasoning` menghasilkan 404 atau respons yang salah

Periksa urutan route pada reverse proxy. `/api/reasoning` harus ke Next.js, sedangkan `/api/v1/simpy/inspect` dan `/api/v1/quality` ke FastAPI. Jika membuat aturan umum `/api/*` tanpa pengecualian, fitur LLM bisa rusak.

### `401 Unauthorized` muncul setelah memberi `API_KEY`

FastAPI punya opsi Bearer token, sedangkan UI demo saat ini tidak menambahkan header tersebut ke request evaluasi. Jangan menonaktifkan keamanan secara sembarangan di production. Untuk staging, tentukan strategi proxy/akses terisolasi dan implementasikan autentikasi terpadu sebelum menggunakan data nyata.

### `422 Unprocessable Entity` saat mengevaluasi

Periksa spesifikasi dan workload: core, RAM, serta bandwidth harus positif; RPS dan demand terkait tidak boleh negatif; input numerik `NaN` atau Infinity ditolak. Untuk SimPy, memori yang diminta **satu request** tidak boleh melebihi total RAM yang tersedia jika RPS positif.

### Hasil Rules berbeda dari SimPy

Ini bisa terjadi karena Rules memakai `concurrent_connections` yang dinyatakan user, sedangkan SimPy mengukur okupansi koneksi secara aktual berdasarkan request yang tiba. Pada batas koneksi sangat kecil, SimPy bisa menunjukkan risiko walaupun Rules tidak. Lihat `/methodology` dan dokumentasi `backend/docs/simpy-dataset.md`. Jangan mengganti hasil simulasi hanya agar kedua verdict sama.

### RPS sangat kecil menghasilkan sedikit atau nol kedatangan

Untuk SimPy, jumlah kedatangan direncanakan dari jendela nominal 30 detik dan dibatasi maksimum 20.000 request. Jika RPS positif tetapi sangat rendah, jumlah request yang diharapkan bisa kurang dari satu dan simulasi sekarang menghasilkan **nol kedatangan**, bukan membuat timestamp tak hingga. Periksa `planned_arrivals`, `arrived`, dan `completed` pada hasil inspeksi.

### Report / keputusan hilang ketika ganti perangkat

Saat ini record demo disimpan di `localStorage` browser. Aplikasi tidak otomatis sinkron antarkomputer, dan sign-off belum menggunakan database server. Untuk migrasi ke shared DB, lihat [rencana database](04-rencana-database.md).

### Quality dashboard tidak menampilkan hasil tes

Halaman quality membaca informasi GitHub Actions dan laporan yang dipublikasikan. Periksa apakah CI sudah selesai, apakah backend bisa mengakses GitHub, dan apakah report tersedia untuk run yang dipilih. Ketiadaan evidence harus ditampilkan sebagai **tidak tersedia**, bukan nol kegagalan.

### LLM gagal tersambung

Periksa apakah provider dan endpoint termasuk daftar yang diizinkan, model ID sesuai, API key sah, dan akses outbound ke provider tersedia. API key sesi hanya berlaku di tab browser tersebut. Pilih tombol clear session jika ingin menghapus konfigurasi dari tab.

## 4. Checklist saat membuat tiket bug

Sertakan informasi yang **tidak rahasia**:

- URL/halaman tempat kesalahan terjadi.
- Peran demo yang digunakan (jika relevan).
- Waktu kejadian, timezone, dan versi/commit aplikasi.
- Langkah reproduksi singkat.
- Input simulasi yang sudah disanitasi.
- Status HTTP dan pesan error yang aman dibagikan.
- Perilaku yang diharapkan dibanding hasil aktual.

Jangan menempelkan API key, token session, data pelanggan, atau respons provider yang sensitif ke issue publik.

## 5. Sumber utama untuk verifikasi

- Source asli: `https://github.com/adryanra97/server_agent`
- GitHub Actions: `.github/workflows/quality.yml`
- Pydantic request schema: `backend/app/schemas.py`
- Endpoint FastAPI: `backend/app/main.py`, `backend/main.py`
- UI data dan session: `frontend/lib/model.ts`, `frontend/lib/demo.ts`, `frontend/lib/llm-session.ts`
- Routing deployment: `vercel.json`

Dokumentasi akan perlu diperbarui saat backend mulai memiliki koneksi DB, endpoint pengguna, session autentikasi, dan policy akses yang sungguhan.