# Mindmash: Claude Code için proje notları

Tasarımın tamamı `docs/TASARIM.md` dosyasında; kelime oyunu `docs/KELIME_OYUNU.md` dosyasında. Bir değişiklik yapmadan önce ilgili bölümü oku. (Uygulamanın önceki adı Takvim Yaprağı; kelime oyunu Harfiyen'den taşındı.)

## Kurallar
- Arayüz metinleri Türkçe, sade ve cümle düzeninde (yalnızca ilk harf büyük). Hata mesajı ne olduğunu ve ne yapılacağını söyler.
- Kod içi adlar Türkçe (ör. `gunuGetir`, `OlayListesi`). Bu düzeni koru.
- İstemci veritabanına yazmaz; istisnalar `tt_hata_bildirimleri` ekleme, `kb_kelime_onerileri` ekleme ve `kb_tahmin` RPC'si. Yeni yazma ihtiyacı RLS politikasıyla birlikte tasarlanmalı.
- **Kelime cevabı istemciye gelmez.** `kb_bulmacalar` ve `kb_sozluk` tablolarını istemciye açacak politika, görünüm veya fonksiyon ekleme. Tahmin yalnızca `kb_tahmin` RPC'sinde değerlendirilir.
- **Videosu yayınlanmamış soru istemciye gelmez.** `tt_quiz` okuma politikası `acilis <= now()` koşulunu taşır; kilitli sorular için yalnızca `tt_quiz_takvimi` (sıra, slot, saat) döner.
- Kelime harfleri `harfNormalle` (`src/lib/harfler.ts`) ile büyük Türkçe harfe çevrilir. Veritabanında `upper()` kullanma; İ/ı'yı yanlış çevirir.
- Supabase `service_role` anahtarı hiçbir dosyaya girmez. Publishable anahtarın istemcide olması normaldir.
- Tarihler yerel saatle `YYYY-MM-DD` (`src/lib/tarih.ts` → `tarihMetni`). `toISOString()` kullanma; gece yarısı UTC'ye kayar. Kelime oyununun günü Türkiye saatine göredir (`trBugun`); sunucu tarafında `(now() at time zone 'Europe/Istanbul')::date` kullanılır.
- `localStorage` erişimi her zaman `src/lib/depo.ts` üzerinden (hata yakalar).
- Renk ve yazı tipleri `src/styles.css` başındaki değişkenlerden gelir; yeni sabit renk ekleme. Açık ve koyu temayı birlikte güncelle; kelime karolarının (`--karo-*`) renk körü varyantı (`data-renk="koru"`) da var.
- Hareket yalnızca kullanıcı eylemine yanıt olarak; `prefers-reduced-motion` kuralı korunmalı.

## Komutlar
- `npm run dev`: geliştirme sunucusu
- `npm test`: birim testleri
- `npm run build`: tip kontrolü + derleme (commit'ten önce test ve build çalıştır)
- `npx cap sync android`: web derlemesini Android projesine kopyalar

## Supabase
- Proje: `qjiurxkgzzlqqemkzgli` (otomatik-uygulamalar). Bu uygulamanın tabloları `tt_` ve `kb_` öneklerini taşır; `gorev_kayitlari` diğer uygulamalarla paylaşılır.
- Şema değişikliği gerekirse `supabase/migrations/` altına göç olarak ekle ve `docs/TASARIM.md` Bölüm 7'yi (kelime için `docs/KELIME_OYUNU.md` Bölüm 9'u) güncelle.
- Anonim girişler açık olmalı (kelime oyunu).

## Video kaynağı
- Sorular ve kelime `mdtokat/insta-face-youtube` deposundaki `daily-plans/kaynak/YYYY-AA-GG.yaml` planlarından gelir. Bu depoyu uygulama okumaz; zamanlanmış görevler okur. O depoda değişiklik yapma.

## Android
- `android/` Capacitor tarafından üretildi; paket adı `io.github.mdtokat.mindmash`. İmza ayarları `android/app/build.gradle` başında ortam değişkenlerinden okunur.
- `SCHEDULE_EXACT_ALARM` izni bilerek kaldırıldı (Play politikası beyanı gerektirmesin diye). Bildirimler yaklaşık zamanlı çalışır.
- İkonlar `assets/` içindeki SVG'lerden üretildi.
