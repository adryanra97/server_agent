# 06 — User Guide TwinPeak

Panduan ini menjelaskan cara menggunakan **fitur yang sudah tersedia dalam demo saat ini**. Alurnya bisa dipakai untuk presentasi dosen, sesi internal, atau uji coba tanpa mengakses sistem produksi.

## 1. Mulai dari homepage

1. Buka URL TwinPeak, misalnya deployment demo yang sudah disiapkan tim.
2. Di homepage kamu akan melihat pesan **“What if your infrastructure had a Digital Twin?”** dan contoh evaluasi kapasitas.
3. Klik **Explore the Digital Twin** atau buka `/demo` secara langsung.
4. Pilih satu dari lima role. Sistem akan membuka halaman **Overview** dari perspektif role tersebut.

**Penting:** `/demo` adalah jalur presentasi langsung tanpa password. `/login` masih tersedia sebagai jalur login demo lama dengan password bersama `demo123`. Keduanya **bukan** proses login akun perusahaan.

Pada kunjungan awal, halaman demo menyiapkan contoh **QRIS Payment — Cycle 03** berdasarkan panggilan SimPy yang sebenarnya. Jika engine tidak tersedia, aplikasi tidak boleh mengarang verdict; coba kembali saat service sudah sehat.

## 2. Mengenal lima persona

| Persona | Tanggung jawab yang dicontohkan | Halaman kerja utama |
| --- | --- | --- |
| **QA / Performance Tester** | Menjalankan simulasi dan menyerahkan bukti kesiapan release | SimPy Workbench, Release Alignment |
| **Technical Lead** | Meninjau evidence QA, melanjutkan kandidat atau mengembalikan ke Dev | Release Alignment |
| **Integration Engineer** | Mereproduksi kondisi insiden dan menguji mitigasi | Incident Response, SimPy Workbench |
| **Project Manager** | Menyetujui atau menolak kandidat setelah review teknis | Sign-Off |
| **Support & Monitoring** | Mencatat insiden, eskalasi, dan menelusuri riwayat | Incident Response, Report |

Menu yang tampak bisa berbeda antar role. Semua persona dapat membuka bagian **Platform Showcase** dan kemampuan teknis yang memang ditandai sebagai materi demonstrasi bersama. Ini pengaturan navigasi demo, bukan role permission API yang aman.

## 3. Panduan QA: menjalankan simulasi

1. Masuk ke `/demo`, pilih **QA Tester**.
2. Buka **SimPy Workbench** atau menu **Release Alignment** sesuai tujuan.
3. Masukkan parameter server: jumlah CPU core, RAM, bandwidth, dan batas koneksi.
4. Masukkan workload: **RPS** (request per second), waktu CPU per request, memori per request, jumlah koneksi, dan payload.
5. Jalankan evaluasi. Tunggu respons engine: verdict, bottleneck, utilisasi CPU/RAM/network, alasan, dan bila tersedia timeline.
6. Gunakan timeline untuk melihat pola kedatangan, completion, resource occupancy, dan antrean. Grafik ini berasal dari event simulasi, **bukan data monitoring produksi**.
7. Jika ingin mengetahui pengaruh pertumbuhan trafik, buka **Compare Loads** atau skenario Normal / 2× / 3× pada alignment.
8. Setelah yakin terhadap input dan sumber asumsi, gunakan fitur submit/release alignment yang tersedia untuk menyertakan evidence ke alur demo.

**Membaca verdict:**

- **Lolos / will_survive:** puncak utilisasi model di bawah 80%.
- **Lolos Bersyarat / at_risk:** ada resource pada kisaran 80–100%.
- **Tidak Lolos / will_crash:** ada resource melampaui 100% kapasitas menurut model.
- **Tidak Dapat Dinilai:** evaluasi gagal atau bukti belum tersedia. Jangan memaksakan verdict sukses.

Gunakan kata **asumsi simulasi** apabila RPS atau spesifikasi belum bersumber dari pengukuran aktual.

## 4. Panduan Technical Lead: review alignment

1. Kembali ke `/demo` atau buka **Access & Roles** untuk mengganti perspektif ke **Technical Lead** dalam browser yang sama.
2. Buka **Release Alignment**.
3. Cari kandidat release yang dibuat QA. Buka item untuk melihat input, hasil Normal/2×/3×, bottleneck, dan alasan verdict.
4. Bandingkan evidence terhadap risiko keputusan. Periksa apakah kandidat membutuhkan pengujian tambahan.
5. Catat keputusan: lanjut ke tahap sign-off atau kembalikan ke Development. Isi alasan/catatan tindak lanjut sesuai form yang tersedia.
6. Simpan keputusan dan periksa status record.

Keputusan di layar ini adalah catatan demo, bukan tindakan otomatis pada pipeline deployment.

## 5. Panduan Project Manager: sign-off

1. Pilih persona **Project Manager**.
2. Buka **Sign-Off**.
3. Cari kandidat yang sudah diteruskan Technical Lead.
4. Buka detail evidence, alasan review, dan riwayat skenario.
5. Pilih setuju atau tolak berdasarkan pertimbangan yang disajikan; tulis alasan dan informasi versi/tanggal sesuai form.
6. Simpan keputusan, kemudian cek apakah record masuk ke bagian report/history.

Pada aplikasi perusahaan sungguhan, langkah ini harus memverifikasi akun penanda tangan dan menyimpan audit yang tidak mudah dimanipulasi. **Fitur demo sekarang belum menyediakan jaminan tersebut.**

## 6. Panduan Support & Integration Engineer: insiden

**Sebagai Support:**

1. Pilih **Support & Monitoring**, buka **Incident Response**.
2. Catat service, gejala, jenis insiden, waktu deteksi, dan perkiraan beban saat kejadian.
3. Simpan/eskalasi record agar dapat ditinjau dari perspektif Engineer.

**Sebagai Integration Engineer:**

1. Pindah ke persona **Integration Engineer** menggunakan browser yang sama.
2. Buka **Incident Response** dan pilih record yang ditangani.
3. Jalankan simulasi kondisi *before* menggunakan parameter yang tersedia.
4. Uji skenario mitigasi, misalnya penambahan kapasitas CPU pada model.
5. Bandingkan hasil *before vs after* dan catat temuan/risiko tersisa.
6. Simpan hasil analisis untuk ditelusuri pada laporan.

Mitigasi di sini mengubah **parameter model**, bukan CPU server produksi yang sebenarnya.

## 7. Laporan PDF/CSV

1. Buka **Report / Reports & History** dari persona yang memiliki akses menu tersebut.
2. Gunakan filter sesuai kebutuhan, seperti jenis record, service, cycle, atau tanggal.
3. Buka record untuk melihat bukti, catatan review, dan keputusan.
4. Pilih ekspor **CSV** untuk rekap atau **PDF** untuk laporan yang lebih mudah dibagikan pada fitur yang mendukung.
5. Setelah mengunduh, cek isi laporan. Jangan menganggap seluruh hasil yang tidak tampil di browser otomatis ada di PDF.

Hasil ekspor mengacu pada data yang tersedia di browser saat itu. Tidak ada arsip PDF terpusat otomatis di backend.

## 8. Platform Showcase dan Engineering Quality

- **Platform Showcase:** titik masuk untuk mencoba modul teknis, melihat alur demonstrasi, dan membuka sumber bukti.
- **Engineering Quality:** menampilkan pemeriksaan seperti Pytest, Vitest, Playwright, Black, Ruff, TypeScript, Next.js build, Bandit, npm audit, dan pip-audit. Buka tiap item untuk melihat tujuan, command, dan tautan CI job.
- **Model Methodology:** baca asumsi, batasan engine, ambang keputusan, serta alasan Rules/SimPy dapat berbeda pada kondisi tertentu.
- **API Explorer:** contoh request/response backend dan inspeksi SimPy; gunakan data dummy yang tidak rahasia.

Angka coverage yang muncul harus dibaca sesuai cakupan modul yang benar-benar diukur; **100% pada modul tertentu bukan berarti seluruh aplikasi 100%**.

## 9. LLM Settings (opsional)

Pada `/settings`, pengguna dapat memilih provider yang didukung, model, dan API key sementara untuk membantu membuat penjelasan laporan. Kunci disimpan di `sessionStorage` tab dan akan dibersihkan ketika menggunakan fitur **Clear Session** atau **Sign Out**; tidak disimpan sebagai user record di database. Browser tetap memiliki risiko XSS, sehingga hindari memakai API key organisasi yang punya hak luas dan jangan kirim data sensitif ke provider tanpa izin.

Jika tidak mengatur LLM, beberapa penjelasan tetap bisa muncul sebagai panduan berbasis aturan. **LLM tidak boleh mengganti verdict yang dihitung engine.**

## 10. Hal penting tentang penyimpanan demo

- **History dan record alur** ada di `localStorage`: browser berbeda = data berbeda.
- **Persona aktif** ada di `sessionStorage`: scope-nya tab/sesi browser.
- Saat berpindah persona pada browser yang sama, record workflow bisa tetap terlihat.
- Logout **tidak sama dengan menghapus seluruh record demo**; beberapa record tetap tersimpan di localStorage.
- Jangan mengandalkan record browser sebagai audit perusahaan atau backup resmi.

## 11. Contoh alur demo 10–15 menit

1. **Pembukaan (1 menit):** tunjukkan mengapa server perlu model Digital Twin sebelum perubahan kapasitas.
2. **QA (3 menit):** jalankan SimPy, baca verdict, tunjukkan timeline dan skenario 2×/3×.
3. **Technical Lead (2 menit):** buka record QA, baca bottleneck, lanjutkan atau kembalikan ke Dev.
4. **Manager (2 menit):** periksa decision trail dan lakukan sign-off demo.
5. **Support & Engineer (3 menit):** catat insiden dan bandingkan mitigasi CPU.
6. **Engineering (2 menit):** buka source CI, 10 quality checks, dan API Explorer.
7. **Penutup (1 menit):** jelaskan perbedaan fungsi yang sudah ada dengan roadmap database + user management.

Jangan khawatir bila durasi presentasi berubah; urutannya lebih penting daripada angka menitnya.