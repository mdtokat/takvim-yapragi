# Mindmash: Firebase (Google ile giriş ve kullanıcı verisi)

## Görev dağılımı

| | Firebase | Supabase |
|---|---|---|
| Ne tutar | Google ile giriş; kullanıcının kelime oyunları ve quiz cevapları | İçerik: günün bilgisi, olaylar, sorular, kelimeler, sözlük; kelime önerileri, hata bildirimleri |
| Kullanıcıyı tanır mı | Evet | Hayır. Uygulama yalnızca publishable anahtarla istek atar, oturum açmaz |
| Kim yazar | Uygulama (yalnızca kullanıcının kendi kayıtları) | Zamanlanmış görevler (içerik); uygulama yalnızca öneri ve hata bildirimi ekler |

İkisi birbirini tanımaz; bağlantıyı uygulama kurar. Firebase'de Cloud Functions yoktur, ücretsiz (Spark) plan yeter.

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

## Yapılandırma

Web yapılandırma değerleri gizli değildir (Supabase publishable anahtarı gibi). Uygulama şu ortam değişkenlerini okur; biri eksikse giriş özelliği gizlenir ve oyun girişsiz çalışır:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

GitHub Actions bunları depo değişkenlerinden (Settings > Secrets and variables > Actions > Variables) alır.

## Firebase projesini kurma (bir kez, Firebase Console'da)

1. **Proje:** https://console.firebase.google.com → "Proje oluştur" → ad: `mindmash`. Google Analytics gerekmez. Ücretsiz Spark planında kal.
2. **Herkese açık ad:** Proje ayarları → Genel → "Herkese açık ad": `Mindmash`, destek e-postası seç. Google giriş ekranında bu ad görünür.
3. **Google girişi:** Authentication → "Başlayın" → Sign-in method → Google → Etkinleştir → destek e-postası → Kaydet.
4. **Yetkili alan adı:** Authentication → Settings → Yetkilendirilmiş alanlar → "Alan adı ekle": `mdtokat.github.io`. (`localhost` zaten ekli.)
5. **Firestore:** Firestore Database → "Veritabanı oluştur" → konum: `europe-west1` (Belçika) veya `eur3` → "Üretim modunda başlat". Sonra Kurallar sekmesine `firebase/firestore.rules` dosyasının içeriğini yapıştır → Yayınla.
6. **Web uygulaması:** Proje ayarları → Genel → Uygulamalarınız → Web (`</>`) → takma ad `Mindmash web` → Kaydet (Firebase Hosting'i işaretleme). Çıkan `firebaseConfig` içindeki `apiKey`, `authDomain`, `projectId`, `appId` değerlerini al.
7. **Değerleri uygulamaya ver:** GitHub deposunda Settings → Secrets and variables → Actions → Variables → dört değişkeni `VITE_FIREBASE_…` adlarıyla ekle; ya da değerleri koda varsayılan olarak yazdır. Sonraki yayında giriş görünür.

### Android (sonra)

Android uygulamasında Google girişi tarayıcı penceresiyle çalışmaz; yerel eklenti (`@capacitor-firebase/authentication`) gerekir. Eklenti `google-services.json` olmadan uygulamayı açılışta çökertebileceği için dosya gelmeden eklenmez. Şimdilik Android'de Ayarlar "yakında" notu gösterir, oyun girişsiz çalışır.

1. Proje ayarları → Genel → Uygulama ekle → Android → paket adı `io.github.mdtokat.mindmash`.
2. SHA-1 parmak izlerini ekle: yükleme anahtarının (`keytool -list -v -keystore <dosya>`) ve Play Console → Uygulama bütünlüğü → Uygulama imzalama anahtarının.
3. `google-services.json` dosyasını indir; `android/app/` altına konacak.
