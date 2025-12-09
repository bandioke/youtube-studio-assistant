# 🎬 YouTube Studio Assistant

Asisten bertenaga AI untuk kreator YouTube. Generate judul, deskripsi, tag, dan terjemahkan otomatis ke 110+ bahasa.

**Dikembangkan oleh Bandi - PT. HOYBEE CREATIVS DIGITAL**

## ✨ Fitur

### 🎯 Pembuatan Konten
- **Generator Judul** - Generate 5 judul viral, SEO-optimized dengan gaya yang bisa disesuaikan
  - Gaya penulisan: Viral, Clickbait, SEO, Profesional, Santai
  - Pemilih bahasa judul (18+ bahasa atau deteksi otomatis)
  - Target audiens: Umum, Anak-anak, Remaja, Dewasa
  - Kontrol panjang: Otomatis, Pendek, Sedang, Panjang
  - Opsi emoji
- **Generator Deskripsi** - Buat deskripsi menarik dengan hashtag dan CTA
- **Generator Tag** - Generate tag relevan (10-50) dalam bahasa campuran atau tunggal

### 🌍 Terjemahan Multi-Bahasa Otomatis
- **110+ Bahasa** - Mendukung semua bahasa yang didukung YouTube
- **Terjemahan Massal** - Terjemahkan ke banyak bahasa dalam satu klik
- **Bahasa Kustom** - Tambah/hapus/atur ulang bahasa sesuai kebutuhan
- **Pelacakan Progress** - Progress real-time dengan ETA dan pelacakan waktu
- **Jeda/Lanjut/Berhenti** - Kontrol penuh atas proses terjemahan
- **Coba Ulang Gagal** - Otomatis coba ulang terjemahan yang gagal

### 🎨 UI Modern
- **Tema Light & Dark Pro** - Beralih antara mode terang dan gelap
- **Panel Bisa Digeser** - Geser panel ke mana saja di layar
- **Desain Responsif** - Menyesuaikan berbagai ukuran layar
- **13 Bahasa UI** - English, Indonesia, Melayu, Vietnam, Filipino, Hindi, Nepali, Urdu, Spanyol, Prancis, Italia, Jepang, Korea
- **Tombol Oranye Rounded** - Gaya tombol gradien modern
- **Dropdown Tema** - Ganti tema mudah dari header popup

### ⚙️ Pengaturan
- **Multi-Provider AI** - Gemini, OpenAI, DeepSeek
- **Ekspor/Impor** - Cadangkan dan pulihkan semua pengaturan
- **Tes Koneksi** - Verifikasi API key sebelum digunakan

## 🚀 Instalasi

1. Download atau clone repository ini
2. Buka Chrome → `chrome://extensions/`
3. Aktifkan "Developer mode" (pojok kanan atas)
4. Klik "Load unpacked"
5. Pilih folder `youtube-studio-assistant-multi`

## 🔑 Setup API Key

### Google Gemini (Direkomendasikan - GRATIS)
1. Buka https://aistudio.google.com/apikey
2. Login dengan akun Google
3. Klik "Create API Key"
4. Copy dan paste ke pengaturan extension

**Batas Free Tier:**
- 15 request/menit
- 1.500 request/hari
- Cukup untuk ~1000+ judul/hari

### OpenAI
1. Buka https://platform.openai.com/api-keys
2. Buat API key baru
3. Copy dan paste ke pengaturan extension

### DeepSeek
1. Buka https://platform.deepseek.com/
2. Buat akun dan dapatkan API key
3. Copy dan paste ke pengaturan extension

## 📖 Cara Penggunaan

### Generate Judul/Deskripsi/Tag
1. Buka YouTube Studio → Edit video
2. Temukan panel AI Assistant di bawah setiap field
3. Sesuaikan pengaturan (gaya, audiens, panjang)
4. Klik tombol "Generate"
5. Pilih dari saran atau generate ulang

### Terjemahan Multi-Bahasa
1. Buka YouTube Studio → Video → Subtitles → Translations
2. Panel Multi-Language muncul di sebelah kanan
3. Pilih bahasa target (centang)
4. Klik "Mulai Terjemahan Otomatis"
5. Tunggu selesai atau jeda/berhenti kapan saja

### Geser Panel
- Klik dan tahan header oranye
- Geser ke posisi mana saja di layar
- Panel kembali ke posisi default saat halaman di-reload

## 💰 Perbandingan Harga

| Provider | Model | Input | Output | Catatan |
|----------|-------|-------|--------|---------|
| Gemini | 2.0 Flash | GRATIS | GRATIS | Direkomendasikan |
| Gemini | 1.5 Flash | GRATIS | GRATIS | Stabil |
| OpenAI | GPT-4o-mini | $0.15/1M | $0.60/1M | Murah & bagus |
| OpenAI | GPT-4o | $2.50/1M | $10/1M | Kualitas terbaik |
| DeepSeek | Chat | $0.14/1M | $0.28/1M | Berbayar termurah |

## 🔧 Troubleshooting

### Extension tidak berfungsi
- Refresh halaman YouTube Studio
- Periksa apakah extension aktif
- Coba nonaktifkan extension lain

### Error API
- Verifikasi API key benar
- Periksa rate limit (tunggu beberapa menit)
- Tes koneksi di pengaturan

### Terjemahan macet
- Klik "Berhenti" lalu "Coba Ulang Gagal"
- Periksa koneksi internet
- Beberapa bahasa mungkin tidak tersedia untuk video tersebut

## 📊 Analytics

Extension mengumpulkan data penggunaan anonim untuk meningkatkan fitur:
- Statistik penggunaan fitur
- Laporan error
- Status lisensi (bukan key-nya)

**Kamu bisa opt-out** di Settings → Toggle Analytics off.

Lihat [PRIVACY-POLICY.md](PRIVACY-POLICY.md) untuk detail lengkap.

## 📁 Struktur File

```
youtube-studio-assistant-multi/
├── manifest.json       # Konfigurasi extension
├── popup.html          # Popup pengaturan
├── popup.js            # Logika popup
├── content.js          # Fungsionalitas utama
├── background.js       # Service worker
├── styles.css          # Style UI
├── ui-builder.js       # Komponen UI
├── locales.js          # Terjemahan (13 bahasa)
├── translations.js     # Helper terjemahan
├── license.js          # Manajemen lisensi
├── analytics.js        # GA4 analytics
├── icons/              # Ikon extension
├── README.md           # Dokumentasi English
├── README-ID.md        # File ini
├── PRIVACY-POLICY.md   # Kebijakan privasi
├── CHANGELOG.md        # Riwayat versi
└── TROUBLESHOOTING.md  # Masalah umum
```

## 📝 Changelog

### v1.3.0 (Desember 2025)
- Tema Light & Dark Pro dengan pengalih tema
- Pemilih bahasa judul (18+ bahasa)
- Opsi gaya penulisan Clickbait
- UI lebih baik dengan tombol rounded
- Dukungan dark mode penuh untuk semua panel
- Label lebih mudah dibaca

### v1.2.0 (Desember 2025)
- Integrasi Google Analytics 4
- In-memory license cache untuk performa
- Privacy Policy document
- Dokumentasi lengkap

### v1.1.0 (Desember 2025)
- Sistem lisensi dengan LemonSqueezy
- Trial 7 hari gratis
- Aktivasi/Deaktivasi lisensi

### v1.0.0 (Desember 2025)
- Rilis awal
- Dukungan multi-provider AI (Gemini, OpenAI, DeepSeek)
- Dukungan terjemahan 110+ bahasa
- Manajemen bahasa kustom
- Panel bisa digeser (draggable)
- Desain responsif
- 13 bahasa UI
- Ekspor/Impor pengaturan
- Pelacakan progress dengan ETA
- Kontrol Jeda/Lanjut/Berhenti

## 📄 Lisensi

MIT License - Bebas digunakan dan dimodifikasi.

## 🤝 Dukungan

Untuk masalah atau permintaan fitur, silakan hubungi:
- Developer: Bandi
- Perusahaan: PT. HOYBEE CREATIVS DIGITAL
