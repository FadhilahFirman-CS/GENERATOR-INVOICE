# Generator Invoice — PHP Native + MySQL

Aplikasi invoice berbasis PHP Native, MySQL, Bootstrap, dan JavaScript dengan login session serta dukungan multi-toko.

## Menjalankan aplikasi

Atur koneksi MySQL melalui environment variable atau `config/database.php`, import `generator_invoice.sql`, lalu jalankan:

```bash
php -S 127.0.0.1:8000
```

Kemudian buka `http://127.0.0.1:8000/`. `index.php` adalah entry point utama; `dashboard-template.html` hanya template internal yang dimuat setelah login.

## GitHub Pages dan Vercel

`index.html` dan `dashboard-template.html` adalah versi static yang dapat dipublikasikan ke GitHub Pages atau Vercel. Pada mode static, invoice tersimpan di browser melalui localStorage; PHP session dan database MySQL tidak berjalan di GitHub Pages.

Untuk Vercel, import repository tanpa build command dan atur konfigurasi deployment langsung di dashboard Vercel. Untuk GitHub Pages, deploy branch repository dari folder root.

Jika membutuhkan login, sinkronisasi antarperangkat, dan penyimpanan MySQL, backend harus dijalankan pada hosting yang mendukung PHP.

## Menjalankan tanpa mengetik perintah

Buka folder ini di VS Code, tekan `Ctrl+Shift+P`, pilih **Tasks: Run Task**, lalu pilih **Generator Invoice: Jalankan Server**. Extension **PHP Built-in Server** juga direkomendasikan melalui `.vscode/extensions.json`; PHP tetap harus terpasang di komputer.

## Isi folder

| File | Fungsi |
| --- | --- |
| `index.php` | Entry point, proteksi session, dan dashboard |
| `dashboard-template.html` | Template internal dashboard |
| `style.css` | Tampilan, termasuk mode terang dan gelap |
| `app.js` | Logika: perhitungan, terbilang, template, PDF, riwayat |

## Cara pakai

1. Jalankan server PHP, lalu buka `http://127.0.0.1:8000/`.
2. Isi profil usaha, data pelanggan, dan barang atau jasa.
3. Pilih template, lihat pratinjau, lalu tekan **Simpan** atau **Unduh PDF**.

Butuh koneksi internet saat pertama dibuka, karena pustaka PDF (jsPDF) dan font dimuat dari CDN.

## Struktur aplikasi

- `index.php` — proteksi session dan dashboard.
- `auth/` — login, register, proses autentikasi, dan logout.
- `config/database.php` — koneksi PDO ke MySQL.
- `generator_invoice.sql` — struktur database siap import.
- `app.js` dan `style.css` — fitur serta tampilan invoice.

## Mengubah template

- Warna dan gaya lembar pratinjau: bagian `.paper` dan `.t-modern`, `.t-minimal` di `style.css`.
- Tampilan PDF: objek `TPL` dan fungsi `buildPdf` di `app.js`.
