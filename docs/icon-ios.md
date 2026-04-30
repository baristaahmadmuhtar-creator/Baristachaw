# BaristaChaw iOS App Icon

Asset app icon utama dibuat dari `resources/icon-source/baristachaw-imagegen-source.png`, yaitu source ImageGen baru bergaya Liquid Glass yang tetap mengikuti arah visual `IMG_7090.PNG`. Generator juga menyimpan salinan aktif ke `resources/icon-source/baristachaw-source.png` saat `npm run generate:icons` dijalankan.

## File Siap Pakai

- `apps/mobile/assets/icon.png` untuk Expo `icon`.
- `apps/mobile/assets/ios-appicon/AppIcon-Light-1024.png` untuk varian terang.
- `apps/mobile/assets/ios-appicon/AppIcon-Dark-1024.png` untuk varian gelap.
- `apps/mobile/assets/ios-appicon/AppIcon-Tinted-Mono-1024.png` untuk varian tinted/monochrome.
- `apps/web/public/icons/icon-light.svg` dan `icon-light-1024.png` untuk light mode.
- `apps/web/public/icons/icon-dark.svg` dan `icon-dark-1024.png` untuk dark mode.
- `apps/web/public/icons/brand-mark-transparent.png` untuk logo login dan brand mark di UI.
- `apps/web/public/icons/icon-composer-layers/background.svg`
- `apps/web/public/icons/icon-composer-layers/foreground.svg`
- `apps/web/public/icons/icon-composer-layers/highlight.svg`
- `apps/web/public/icons/icon-composer-layers/mono.svg`

## Cara Masuk ke Xcode

1. Jalankan `npm run generate:icons` dari root repo.
2. Buka project iOS di Xcode.
3. Buka `Images.xcassets`.
4. Buat atau pilih AppIcon set.
5. Masukkan `AppIcon-Light-1024.png` sebagai icon utama.
6. Untuk iOS yang mendukung dark/tinted app icon, gunakan layer SVG di `icon-composer-layers` sebagai bahan Apple Icon Composer.
7. Preview hasil di Apple Icon Composer, export package/icon final, lalu import ke Xcode Asset Catalog.

## Catatan Liquid Glass

Liquid Glass asli tidak bisa dipaksa dari PWA. Untuk native iOS, preview depth, highlight, tinted, dan dark appearance sebaiknya dilakukan di Apple Icon Composer lalu dimasukkan ke Xcode. Repo ini sudah menyediakan layer background, foreground, highlight, dan mono supaya prosesnya aman dan konsisten.

Jangan edit file Xcode generated secara manual kalau tidak perlu. Untuk Expo/EAS, source paling aman tetap `apps/mobile/assets/icon.png` dan konfigurasi `app.config.ts`.
