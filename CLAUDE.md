# Takvim Yaprağı: Claude Code için proje notları

Tasarımın tamamı `docs/TASARIM.md` dosyasında. Bir değişiklik yapmadan önce ilgili bölümü oku.

## Kurallar
- Arayüz metinleri Türkçe, sade ve cümle düzeninde (yalnızca ilk harf büyük). Hata mesajı ne olduğunu ve ne yapılacağını söyler.
- Kod içi adlar Türkçe (ör. `gunuGetir`, `OlayListesi`). Bu düzeni koru.
- İstemci veritabanına yazmaz; tek istisna `tt_hata_bildirimleri` ekleme. Yeni yazma ihtiyacı RLS politikasıyla birlikte tasarlanmalı.
- Supabase `service_role` anahtarı hiçbir dosyaya girmez. Publishable anahtarın istemcide olması normaldir.
- Tarihler yerel saatle `YYYY-MM-DD` (`src/lib/tarih.ts` → `tarihMetni`). `toISOString()` kullanma; gece yarısı UTC'ye kayar.
- `localStorage` erişimi her zaman `src/lib/depo.ts` üzerinden (hata yakalar).
- Renk ve yazı tipleri `src/styles.css` başındaki değişkenlerden gelir; yeni sabit renk ekleme. Açık ve koyu temayı birlikte güncelle.
- Hareket yalnızca kullanıcı eylemine yanıt olarak; `prefers-reduced-motion` kuralı korunmalı.

## Komutlar
- `npm run dev`: geliştirme sunucusu
- `npm run build`: tip kontrolü + derleme (commit'ten önce çalıştır)
- `npx cap sync android`: web derlemesini Android projesine kopyalar

## Supabase
- Proje: `qjiurxkgzzlqqemkzgli` (otomatik-uygulamalar). Tablolar `tt_` öneki taşır; `gorev_kayitlari` ve `kb_` tabloları diğer uygulamalarla paylaşılır, dokunma.
- Şema değişikliği gerekirse migration olarak ekle ve `docs/TASARIM.md` Bölüm 7'yi güncelle.

## Android
- `android/` Capacitor tarafından üretildi; imza ayarları `android/app/build.gradle` başında ortam değişkenlerinden okunur.
- `SCHEDULE_EXACT_ALARM` izni bilerek kaldırıldı (Play politikası beyanı gerektirmesin diye). Bildirimler yaklaşık zamanlı çalışır.
- İkonlar `assets/` içindeki SVG'lerden üretildi.
