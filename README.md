# Mindmash

Mindmash sosyal medya hesaplarının uygulaması. Her gün tarihte o gün olanları, günün bilgisini, günün kelimesini (6 denemede 5 harfli Türkçe kelime) ve o günün üç Reels videosundan hazırlanan soruları gösterir. Her soru kendi videosunun yayın saatinde açılır. Web'de GitHub Pages üzerinden, Android'de Google Play üzerinden yayınlanır. İçeriği Claude zamanlanmış görevleri `mdtokat/insta-face-youtube` deposundaki günlük planlardan üretir ve Supabase'e yazar; uygulama yalnızca okur (kelime oyunu tahminleri RPC ile değerlendirilir).

Önceki adı Takvim Yaprağı. Kelime oyunu Harfiyen'den taşındı.

Ayrıntılı tasarım: [docs/TASARIM.md](docs/TASARIM.md) · Kelime oyunu: [docs/KELIME_OYUNU.md](docs/KELIME_OYUNU.md)

## Yapı

| Klasör | İçerik |
|---|---|
| `src/views` | Ekranlar: Bugün, olay detayı, takvim, quiz, kelime, ayarlar |
| `src/components` | Yaprak, olay listesi, kategori seçici, alt menü; `kelime/` altında ızgara, klavye ve pencereler |
| `src/lib` | Supabase istemcisi, veri erişimi, tarih yardımcıları, bildirimler, ayarlar, kelime oyunu (`kelimeOyunu.ts`, `harfler.ts`, `istatistik.ts`) |
| `supabase` | Göçler (`migrations/`) ve `kb_tahmin` testleri (`tests/`) |
| `tests` | Harf kuralları ve tarih yardımcıları testleri (`npm test`) |
| `public` | İkonlar ve `gizlilik.html` |
| `android` | Capacitor Android projesi |
| `.github/workflows` | Web yayını ve Android derlemesi |

Teknoloji: React + TypeScript + Vite, Supabase, Capacitor 8, vite-plugin-pwa.

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # birim testleri
npm run build      # tip kontrolü + üretim derlemesi (dist/)
```

Supabase adresi ve publishable anahtar `src/lib/supabase.ts` içinde varsayılan olarak tanımlıdır. Başka bir projeye bağlamak için `.env.example` dosyasını `.env` olarak kopyalayıp değerleri değiştir.

## Yayınlama

### Web (GitHub Pages)
1. Repo **Public** olmalı (ücretsiz planda Pages yalnızca herkese açık repolarda çalışır).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions** seç.
3. `main` dalına her push'ta site otomatik yayınlanır: `https://mdtokat.github.io/takvim-yapragi/`

### Android
1. **Actions → Android derlemesi → Run workflow**.
2. İmza anahtarı yoksa yalnızca **test-apk** üretilir; telefona indirip doğrudan kurabilirsin.
3. Play için imzalı AAB üretmek üzere repo ayarlarında **Settings → Secrets and variables → Actions** altına şu gizli değerleri ekle:
   - `ANDROID_KEYSTORE_BASE64`: `upload-key.jks` dosyasının base64 hâli
   - `KEYSTORE_PASSWORD`, `KEY_ALIAS` (`upload`), `KEY_PASSWORD`
4. İş akışını yeniden çalıştır; **play-aab** çıktısını Play Console'a yükle. Sürüm numarası her derlemede otomatik artar.

İmza anahtarı oluşturma:
```bash
keytool -genkeypair -v -keystore upload-key.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
base64 -i upload-key.jks        # Mac
# Windows PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-key.jks")) | Set-Clipboard
```

## Veritabanı

Supabase projesi: `otomatik-uygulamalar` (`qjiurxkgzzlqqemkzgli`). Takvim ve soru tabloları `tt_`, kelime oyunu tabloları `kb_` önekiyle başlar; şemalar `docs/TASARIM.md` Bölüm 7'de ve `docs/KELIME_OYUNU.md` Bölüm 9'da. İstemci `tt_` tablolarını yalnızca okur; `tt_hata_bildirimleri` tablosuna yalnızca ekleme yapabilir. Kelime oyunu tahminleri `kb_tahmin` RPC'siyle değerlendirilir; cevap istemciye oyun bitmeden gelmez.

Kelime oyunu için **Authentication → Sign In / Providers → Anonymous sign-ins** açık olmalı.

## İçerik

İçerik Claude zamanlanmış görevleriyle gelir (`docs/TASARIM.md` Bölüm 8, `docs/KELIME_OYUNU.md` Bölüm 10). Sorular ve kelime `mdtokat/insta-face-youtube` deposundaki `daily-plans/kaynak/YYYY-AA-GG.yaml` planlarından yazılır; bu yüzden görevlerin o depoyu okuyabilmesi gerekir. Görevler kurulup ilk kez çalıştırılana kadar uygulama "Bu günün yaprağı henüz hazırlanıyor" durumunu gösterir.
