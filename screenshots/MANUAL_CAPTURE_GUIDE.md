# 📸 Manual Screenshot Guide

## Screenshots Captured ✅

1. ✅ **menu.png** - Homepage dengan menu kopi
2. ✅ **admin-dashboard.png** - Admin dashboard dengan daftar pesanan
3. ✅ **admin-menu.png** - Admin menu management
4. ✅ **admin-reports.png** - Admin laporan penjualan

## Screenshots Needed (Manual Capture) 📝

### Customer Interface

#### 4. **order-status.png**
**Cara capture:**
1. Buka https://order-kopi-app.vercel.app/
2. Tambah item ke keranjang
3. Checkout dengan nama "Test Customer"
4. Pilih payment method (QRIS atau Cash)
5. Klik "Buat Pesanan"
6. Halaman order status akan muncul
7. Screenshot halaman ini (Ctrl+Shift+S atau Win+Shift+S)
8. Save sebagai `order-status.png`

**Yang harus terlihat:**
- Order ID (ORD-XXXX)
- Status pesanan (Menunggu Pembayaran / Diproses / dll)
- Detail pesanan (items, total)
- Estimasi waktu tunggu
- Posisi antrian (jika ada)

---

#### 5. **qris-payment.png**
**Cara capture:**
1. Ikuti langkah 1-5 dari order-status.png
2. Pilih payment method: **QRIS**
3. Klik "Buat Pesanan"
4. Tunggu QRIS code muncul (dari Cashi.id)
5. Screenshot halaman dengan QRIS code
6. Save sebagai `qris-payment.png`

**Yang harus terlihat:**
- QRIS code (QR image)
- Nominal pembayaran
- Instruksi pembayaran
- Timer countdown (jika ada)

**Alternatif:** Jika Cashi.id belum dikonfigurasi, akan muncul static QRIS. Screenshot tetap bisa digunakan.

---

#### 6. **rating.png**
**Cara capture:**
1. Buat order dan selesaikan (status: Selesai)
2. Buka halaman order status
3. Scroll ke bawah, akan ada form rating
4. Screenshot form rating
5. Save sebagai `rating.png`

**Yang harus terlihat:**
- Star rating (1-5 bintang)
- Text area untuk review
- Tombol submit

**Alternatif:** Jika tidak ada order selesai, bisa skip dulu atau gunakan placeholder.

---

### Payment Flow

#### 7. **payment-confirmed.png**
**Cara capture:**
1. Buat order dengan QRIS
2. Bayar menggunakan GoPay/OVO/DANA (scan QRIS)
3. Tunggu webhook dari Cashi.id (1-2 detik)
4. Status order akan berubah jadi "Paid" atau "Menunggu Diproses"
5. Screenshot halaman order status setelah payment confirmed
6. Save sebagai `payment-confirmed.png`

**Yang harus terlihat:**
- Status: "Dibayar" atau "Menunggu Diproses"
- Checkmark icon atau success indicator
- Detail pembayaran (metode, waktu bayar)
- Estimasi waktu tunggu

**Alternatif:** Jika tidak bisa test payment, gunakan screenshot dari order dengan status "Dibayar" (bisa dari admin yang manual confirm).

---

## Quick Capture Tips 💡

### Windows
- **Snipping Tool:** Win + Shift + S
- **Full Screenshot:** PrtScn
- **Active Window:** Alt + PrtScn

### Mac
- **Selection:** Cmd + Shift + 4
- **Full Screen:** Cmd + Shift + 3
- **Window:** Cmd + Shift + 4, then Space

### Browser DevTools (Best Quality)
1. Press F12 (open DevTools)
2. Press Ctrl+Shift+P (Command Palette)
3. Type "screenshot"
4. Select "Capture screenshot" or "Capture full size screenshot"
5. Image will download automatically

---

## Screenshot Quality Guidelines ✨

### Resolution
- **Minimum:** 1280x720
- **Recommended:** 1920x1080
- **Device Scale:** 1x (no retina/2x)

### Content
- Use realistic data (not "Test Test Test")
- Show actual product names (Espresso, Cappuccino, etc.)
- Use reasonable prices (Rp 15.000 - Rp 50.000)
- Show multiple items if possible

### Cropping
- Include full UI (no cut-off elements)
- Remove browser chrome (address bar, bookmarks)
- Keep consistent padding/margins
- Center the main content

### File Format
- **Format:** PNG (lossless)
- **Max Size:** 1MB per image
- **Compression:** Use TinyPNG or similar if >500KB

---

## Placeholder Alternative 🎨

Jika tidak bisa capture screenshot real, bisa gunakan:

1. **Figma/Sketch:** Design mockup
2. **Shots.so:** Generate beautiful mockups
3. **Screely.com:** Browser mockup generator
4. **Placeholder.com:** Temporary placeholder images

Example placeholder:
```
https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=Order+Status+Screenshot
```

---

## Verification Checklist ✅

Before committing screenshots:

- [ ] All 8 screenshots present
- [ ] File names match exactly (lowercase, hyphen-separated)
- [ ] Resolution at least 1280x720
- [ ] No sensitive data visible (real customer info, real payment details)
- [ ] UI is clean (no error messages, loading states)
- [ ] Content is realistic and professional
- [ ] File sizes reasonable (<1MB each)
- [ ] Images display correctly in README.md

---

## Current Status

| Screenshot | Status | Size | Notes |
|------------|--------|------|-------|
| menu.png | ✅ Captured | 647 KB | Homepage with menu |
| order-status.png | ⏳ Pending | - | Need manual capture |
| rating.png | ⏳ Pending | - | Need completed order |
| admin-dashboard.png | ✅ Captured | 15 KB | Admin orders list |
| admin-menu.png | ✅ Captured | 15 KB | Menu management |
| admin-reports.png | ✅ Captured | 19 KB | Sales reports |
| qris-payment.png | ⏳ Pending | - | Need order with QRIS |
| payment-confirmed.png | ⏳ Pending | - | Need actual payment |

**Progress:** 4/8 screenshots (50%)

---

## Next Steps

1. Follow manual capture guide above for remaining 4 screenshots
2. Save to `screenshots/` folder with exact names
3. Verify all images display in README.md
4. Commit and push to GitHub

**Estimated Time:** 10-15 minutes for all 4 screenshots
