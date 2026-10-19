# Mindmash: Firebase (Google ile giriş ve kullanıcı verisi)

## Görev dağılımı

| | Firebase | Supabase |
|---|---|---|
| Ne tutar | Google ile giriş; kullanıcının kelime oyunları ve quiz cevapları | İçerik: günün bilgisi, olaylar, sorular, kelimeler, sözlük; kelime önerileri, hata bildirimleri; sıralama (ad, sıralı oyunlar, puanlar) |
| Kullanıcıyı tanır mı | Evet | Yalnızca sıralama fonksiyonları: Firebase oturum anahtarını doğrular (üçüncü taraf giriş). Uygulama Supabase'de oturum açmaz |
| Kim yazar | Uygulama (yalnızca kullanıcının kendi kayıtları) | Zamanlanmış görevler (içerik); uygulama öneri ve hata bildirimi ekler, sıralama kayıtlarını yalnızca sunucu fonksiyonları yazar |

Firebase'de Cloud Functions yoktur, ücretsiz (Spark) plan yeter. Supabase, sıralama için Firebase'in oturum anahtarlarını tanır (aşağıda "Supabase'de Firebase girişi"); başka bağlantı yoktur.

## Oyun durumu: önce cihaz, sonra hesap

- Kelime oyunu ve quiz her zaman önce cihazdaki depoya yazar (`src/lib/kelimeDepo.ts`, `src/lib/quizDepo.ts`). Giriş yapmadan oynanır.
- Kelime tahmini durumsuz `kb_degerlendir(tarih, slot, tahminler[])` fonksiyonunda değerlendirilir: uygulama o kelimenin bütün tahminlerini gönderir, sunucu renkleri döner; cevap yalnızca oyun bitince (doğru tahmin veya 6 geçerli tahmin) döner. 6 hak sınırı uygulamada uygulanır.
- Giriş yapılınca (`src/lib/hesap.ts`):
  - Her kayıt değişikliği ayrıca Firestore'a yazılır.
  - Açılışta ve girişte eşitleme yapılır: son eşitlemeden beri buluta yazılmış kayıtlar çekilir (`sunucuZamani` alanına göre), cihazdakilerle birleştirilir. Oyunlar yalnızca ilerlediği için daha çok tahmini/cevabı olan kayıt kalır. Cihazda daha ileri olan kayıtlar buluta gönderilir.
  - Firebase kütüphanesi yalnızca gerekince yüklenir: bu cihazda giriş yapılmışsa açılışta, yapılmamışsa "Google ile giriş yap" basılınca.
- Çıkışta cihazdaki kayıtlar silinir (hesapta kalır). "Hesabımı sil" bulut kayıtlarını ve Firebase hesabını siler (Google Play şartı).

## Firestore düzeni

```
kullanicilar/{uid}/kelime/{2026-10-19_sabah}
  tarih, slot, tahminler[], sonuclar[][] , durum ('devam'|'kazandi'|'kaybetti'),
  zorMod, bitis {cevap, anlam, ornek, videoBaslik} | null, guncelleme (ms), sunucuZamani
kullanicilar/{uid}/quiz/{2026-10-19}
  cevaplar[], dogru, cozulme, guncelleme (ms), sunucuZamani
```

Güvenlik kuralları: `firebase/firestore.rules` (her kullanıcı yalnızca kendi kayıtlarını okur ve yazar).

## Supabase'de Firebase girişi (sıralama için, bir kez)

Sıralama istekleri (`src/lib/siralama.ts`) Firebase oturum anahtarıyla gider. Supabase anahtarı ancak Firebase projesi tanımlıysa kabul eder:

1. Supabase Dashboard → proje `qjiurxkgzzlqqemkzgli` → Authentication → Sign In / Providers → **Third-Party Auth** → "Add provider" → **Firebase** → Firebase Project ID: `mindmash-takvim` → kaydet.
2. `role: 'authenticated'` özel talebi **gerekmez**: talep olmadığı için istekler `anon` rolüyle çalışır, sıralama fonksiyonları `anon`'a açıktır ve kullanıcıyı anahtarın `sub` alanından tanır (`tt_firebase_uid()`). Bu yüzden Cloud Functions ve Blaze planı gerekmez.

Tanımlı değilse giriş yapan kullanıcı Ayarlar > Sıralama'da "Sıralamaya şu an bağlanılamadı" görür; oyunlar süresiz ve puansız oynanır, içerik etkilenmez.

## Yapılandırma

Firebase projesi: `mindmash-takvim`. Web yapılandırma değerleri gizli değildir (Supabase publishable anahtarı gibi) ve `src/lib/firebase.ts` içinde varsayılan olarak durur. Başka bir projeye geçmek için şu ortam değişkenleri verilebilir:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

GitHub Actions bunları tanımlıysa depo değişkenlerinden (Settings > Secrets and variables > Actions > Variables) alır.

## Firebase projesini kurma (bir kez, Firebase Console'da)

1. **Proje:** https://console.firebase.google.com → "Proje oluştur" → ad: `mindmash`. Google Analytics gerekmez. Ücretsiz Spark planında kal.
2. **Herkese açık ad:** Proje ayarları → Genel → "Herkese açık ad": `Mindmash`, destek e-postası seç. Google giriş ekranında bu ad görünür.
3. **Google girişi:** Authentication → "Başlayın" → Sign-in method → Google → Etkinleştir → destek e-postası → Kaydet.
4. **Yetkili alan adı:** Authentication → Settings → Yetkilendirilmiş alanlar → "Alan adı ekle": `mdtokat.github.io`. (`localhost` zaten ekli.)
5. **Firestore:** Firestore Database → "Veritabanı oluştur" → konum: `europe-west1` (Belçika) veya `eur3` → "Üretim modunda başlat". Sonra Kurallar sekmesine `firebase/firestore.rules` dosyasının içeriğini yapıştır → Yayınla.
6. **Web uygulaması:** Proje ayarları → Genel → Uygulamalarınız → Web (`</>`) → takma ad `Mindmash web` → Kaydet (Firebase Hosting'i işaretleme). Çıkan `firebaseConfig` içindeki `apiKey`, `authDomain`, `projectId`, `appId` değerlerini al.
7. **Değerleri uygulamaya ver:** Değerler `src/lib/firebase.ts` içine varsayılan olarak yazılır (yapıldı: `mindmash-takvim`).

### Android (sonra)

Android uygulamasında Google girişi tarayıcı penceresiyle çalışmaz; yerel eklenti (`@capacitor-firebase/authentication`) gerekir. Eklenti `google-services.json` olmadan uygulamayı açılışta çökertebileceği için dosya gelmeden eklenmez. Şimdilik Android'de Ayarlar "yakında" notu gösterir, oyun girişsiz çalışır.

1. Proje ayarları → Genel → Uygulama ekle → Android → paket adı `io.github.mdtokat.mindmash`.
2. SHA-1 parmak izlerini ekle: yükleme anahtarının (`keytool -list -v -keystore <dosya>`) ve Play Console → Uygulama bütünlüğü → Uygulama imzalama anahtarının.
3. `google-services.json` dosyasını indir; `android/app/` altına konacak.
