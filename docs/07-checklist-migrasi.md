# 07 — Rencana Migrasi ke Lingkungan Perusahaan

Dokumen ini adalah **rencana kerja bertahap**, bukan bukti bahwa migrasi sudah dilakukan. Targetnya adalah memindahkan prototipe TwinPeak dari demo berbasis browser menjadi aplikasi internal dengan penyimpanan data terpusat, akun nyata, kontrol akses backend, dan riwayat keputusan yang dapat diaudit.

## 1. Target akhir migrasi

Sebuah deployment baru dinyatakan siap untuk pilot internal jika:

- Pengguna masuk melalui akun organisasi yang dapat diverifikasi, bukan memilih persona bebas.
- Data release/insiden dapat diakses dari perangkat lain sesuai izin, tidak bergantung pada `localStorage`.
- Hak mengubah record dicek di backend, bukan hanya dari menu frontend.
- Keputusan memiliki actor ID, waktu server, alasan, dan histori perubahan.
- Semua hasil SimPy yang disimpan memiliki input, engine, versi, dan evidence yang bisa dilacak.
- Restore backup, pemeriksaan keamanan, dan prosedur rollback pernah diuji.
- Fitur yang belum ada tidak dipasarkan seolah-olah sudah live, misalnya telemetry realtime atau deployment otomatis.

## 2. Tahapan pekerjaan

<details>
<summary><strong>Tahap 0 — Tetapkan ruang lingkup</strong></summary>

- [ ] Tentukan siapa pemilik sistem dan siapa yang berhak menyetujui keputusan arsitektur.
- [ ] Catat kebutuhan use case, jumlah user, role, service, volume data, dan kebutuhan compliance.
- [ ] Pisahkan environment: development, staging, dan production.
- [ ] Tentukan target SLO/SLA, RPO, RTO, dan kebijakan retensi.
- [ ] Bekukan daftar fitur demo yang tidak boleh dijanjikan sebagai kontrol produksi.

**Selesai ketika:** ada dokumen keputusan arsitektur dan prioritas yang disetujui.
</details>

<details>
<summary><strong>Tahap 1 — Infrastruktur dasar dan CI/CD</strong></summary>

- [ ] Putuskan tetap di Vercel atau self-hosted/managed internal.
- [ ] Tetapkan domain, TLS, firewall, secret management, monitoring, backup, dan akses admin.
- [ ] Pastikan Next.js dan FastAPI berjalan di belakang satu domain.
- [ ] Jalankan pemeriksaan yang sudah ada: Pytest, TypeScript, build, browser E2E, Bandit, dan dependency audit.
- [ ] Siapkan proses deployment terkontrol serta rollback ke versi sebelumnya.

**Selesai ketika:** staging bisa di-deploy ulang secara konsisten dan health check berhasil.
</details>

<details>
<summary><strong>Tahap 2 — Database bersama</strong></summary>

- [ ] Pilih database dan konfigurasi high availability sesuai kebutuhan.
- [ ] Tambahkan koneksi DB backend dengan secret yang dikelola aman.
- [ ] Buat skema awal dan migration versioning.
- [ ] Implementasikan record `users`, `roles`, `services`, `release_cycles`, `simulation_runs`, `incidents`, `approvals`, dan `audit_events` sesuai keputusan desain.
- [ ] Tambahkan indeks, constraint, transaksi, retensi, backup dan restore test.
- [ ] Buat API baca/tulis terpusat untuk menggantikan record lokal browser.

**Selesai ketika:** dua perangkat mengakses record yang sama sesuai izin, dan tes transaksi/restore lulus.
</details>

<details>
<summary><strong>Tahap 3 — Identitas dan role permissions</strong></summary>

- [ ] Integrasikan SSO/OIDC atau sistem akun lokal yang disetujui.
- [ ] Gunakan session aman, logout/revocation, timeout, dan proteksi CSRF yang sesuai.
- [ ] Implementasikan RBAC di setiap endpoint yang relevan.
- [ ] Batasi akses berdasarkan service/project, tidak sekadar nama role.
- [ ] Nonaktifkan password demo serta pemilihan persona bebas di lingkungan internal.
- [ ] Tambahkan admin workflow untuk provisioning, perubahan role, dan penonaktifan akun.

**Selesai ketika:** pengujian API membuktikan user yang tidak berwenang benar-benar ditolak.
</details>

<details>
<summary><strong>Tahap 4 — Migrasi data demo bila diperlukan</strong></summary>

- [ ] Tentukan apakah data browser perlu diimpor, hanya diarsipkan, atau dibuang.
- [ ] Jika diimpor, buat fitur ekspor terkontrol yang disetujui pengguna pada browser sumber.
- [ ] Validasi format, tanggal, ID, relasi, dan duplikasi. Jangan mempercayai `createdBy` dari browser sebagai bukti identitas.
- [ ] Tandai semua data hasil import sebagai **demo/unverified** bila tidak punya audit sumber.
- [ ] Jangan mengimpor API key dari `sessionStorage`.
- [ ] Lakukan dry run lalu cocokkan jumlah record dan checksum.

**Selesai ketika:** hasil impor bisa direkonsiliasi dan tidak membuat approval palsu.
</details>

<details>
<summary><strong>Tahap 5 — Audit, keamanan, dan acceptance test</strong></summary>

- [ ] Pastikan event audit menyimpan actor, action, object, versi, waktu server, dan request ID.
- [ ] Uji akses lintas service/tenant, IDOR, session expiry, perubahan role, dan direct API calls.
- [ ] Uji input numerik ekstrem dan batas koneksi pada engine.
- [ ] Uji report PDF/CSV untuk tidak membocorkan informasi di luar scope user.
- [ ] Uji backup/restore, restart layanan, masalah koneksi database, serta provider LLM tidak tersedia.
- [ ] Lakukan penilaian security dan pengujian pengguna dengan pemilik proses.

**Selesai ketika:** acceptance criteria dan temuan kritis ditangani atau punya persetujuan risiko yang formal.
</details>

<details>
<summary><strong>Tahap 6 — Pilot dan cutover</strong></summary>

- [ ] Pilih kelompok pilot dengan scope data yang terbatas.
- [ ] Jalankan skenario QA → Lead → Manager dan Support → Engineer dari perangkat berbeda.
- [ ] Pastikan tidak ada keputusan release yang otomatis diterapkan ke produksi.
- [ ] Siapkan prosedur rollback aplikasi dan, jika ada, skema database.
- [ ] Lakukan cutover terjadwal, pantau error, kinerja, dan audit event.
- [ ] Pastikan dokumentasi dan kontak support tersedia.

**Selesai ketika:** pilot diterima pemilik proses dan kontrol operasional sudah terbukti.
</details>

## 3. Matriks tanggung jawab yang bisa disepakati

| Area | Penanggung jawab awal yang disarankan | Bukti selesai |
| --- | --- | --- |
| Arsitektur dan integrasi | Technical Lead / Backend Lead | ADR, diagram, API contract |
| DB dan backup | DBA / Platform Engineering | Skema, migration, restore test |
| Identitas dan keamanan | IAM / Security / Backend | Threat model, RBAC tests, SSO test |
| Perilaku aplikasi dan UX | Frontend + QA | E2E real-user flows |
| Model kapasitas | Backend/model owner | Regression tests, dataset assumptions |
| Release dan observability | DevOps/SRE | Deployment runbook, dashboard, alert |
| Keputusan bisnis | PM / Process Owner | UAT dan sign-off kebutuhan |

Nama penanggung jawab ditetapkan tim, bukan otomatis diambil dari lima persona demo.

## 4. Rencana pemindahan data dari browser

**Jangan mengklaim dapat memindahkan data seluruh user dari satu komputer**: record sekarang berada di storage masing-masing browser. Aplikasi server tidak dapat otomatis membaca localStorage milik perangkat lain.

Pilihan yang lebih aman:

1. **Tidak perlu migrasi** untuk lingkungan perusahaan: buat database kosong dan generate data dummy baru yang diberi label demo.
2. **Impor selektif untuk arsip**: pemilik browser mengekspor record secara sadar, file divalidasi dan dikonversi di staging, lalu diberi flag `origin=browser_demo` dan `verified=false`.
3. **Perpindahan sebagian yang sudah diverifikasi**: hanya bila ada bukti eksternal yang dapat ditandatangani/diperiksa kembali. Jangan gunakan label approval resmi untuk sign-off yang berasal dari penyimpanan browser lama.

## 5. Contoh checklist sebelum go-live

```text
[ ] Semua API sensitif memeriksa session dan permission di backend
[ ] Tidak ada password demo atau tombol 'pilih siapa saja' pada environment internal
[ ] Data yang masuk punya service scope dan actor ID sah
[ ] Semua perubahan approval masuk audit event
[ ] TLS, DNS, secret storage, dan firewall sudah ditinjau
[ ] Backup DB berjalan dan restore dicoba
[ ] Tests, build, dan security gates lulus pada commit yang akan di-deploy
[ ] UAT lima role dari perangkat berbeda lulus
[ ] Alur error, timeout, dan 'Tidak Dapat Dinilai' tidak menghasilkan verdict palsu
[ ] Prosedur rollback aplikasi dan skema data telah diuji
[ ] Pemilik aplikasi menandatangani keputusan go-live
```

Setiap baris checklist harus punya **bukti**, tanggal, dan penanggung jawab. Centang tanpa evidence tidak cukup untuk kebutuhan audit perusahaan.