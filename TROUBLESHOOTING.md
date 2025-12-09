# 🔧 Troubleshooting Guide

## Common Issues

### ❌ Extension tidak muncul di YouTube Studio

**Solusi:**
1. Refresh halaman (Ctrl+R atau F5)
2. Pastikan URL adalah `studio.youtube.com`
3. Cek extension sudah enabled di `chrome://extensions/`
4. Reload extension (klik icon refresh)

### ❌ Error: "Cannot read properties of undefined"

**Penyebab:** Extension di-reload saat halaman terbuka

**Solusi:** Refresh halaman YouTube Studio

### ❌ API Rate Limit Error

**Penyebab:** Terlalu banyak request dalam waktu singkat

**Solusi:**
- Tunggu 1-2 menit
- Kurangi jumlah bahasa yang di-translate sekaligus
- Upgrade ke paid plan jika sering terjadi

### ❌ Invalid API Key Error

**Solusi:**
1. Buka popup extension
2. Cek API Key sudah benar
3. Pastikan tidak ada spasi di awal/akhir
4. Generate API Key baru jika perlu

### ❌ Translation gagal untuk beberapa bahasa

**Solusi:**
1. Klik "Retry Failed" untuk coba lagi
2. Cek apakah bahasa tersebut ada di YouTube
3. Pastikan ada konten (title/description) untuk di-translate

### ❌ Panel Multi-Language tidak muncul

**Penyebab:** Bukan di halaman Translations

**Solusi:** Buka halaman Translations di YouTube Studio:
`studio.youtube.com/video/[VIDEO_ID]/translations`

### ❌ Generate tidak mengisi field

**Solusi:**
1. Pastikan field input terlihat di layar
2. Klik pada field dulu sebelum generate
3. Refresh halaman dan coba lagi

## Debug Mode

Buka Console (F12 → Console) untuk melihat log:
- `[YT Assistant]` - Log dari extension
- Error messages dengan detail

## Reset Extension

Jika masalah berlanjut:
1. Buka `chrome://extensions/`
2. Klik "Remove" pada extension
3. Load ulang extension
4. Setup API Key lagi

## Contact

Jika masih ada masalah, buka issue di repository dengan:
- Screenshot error
- Console log
- Langkah untuk reproduce
