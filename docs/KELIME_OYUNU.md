# Mindmash Kelime — Günlük Türkçe Kelime Bulmacası

**Tasarım dokümanı v1.2** (Harfiyen v1.0'dan devralındı)

> Bu oyun önce ayrı bir uygulama olarak (Harfiyen) yazıldı. Artık Mindmash'in **Kelime** sekmesidir.
> Mindmash'in genel tasarımı `docs/TASARIM.md` dosyasında. Bu dosya yalnızca kelime oyununu anlatır.
>
> **Mindmash'teki farklar:**
> - Oyun `#/kelime` rotasında açılır (`src/views/KelimeEkrani.tsx`).
> - **Oyun durumu Supabase'de değil:** Tahminler cihazda (`src/lib/kelimeDepo.ts`) ve Google ile giriş yapılmışsa Firebase'de tutulur (`docs/FIREBASE.md`). Supabase kullanıcıyı tanımaz; tahminler durumsuz `kb_degerlendir` fonksiyonunda değerlendirilir (Bölüm 9.5). Bölüm 9.1–9.3'teki `kb_denemeler` ve `kb_tahmin` yalnızca eski sürümler için duruyor.
> - Genel dağılım ("seninle aynı denemede bulanlar") kaldırıldı; istatistikler kullanıcının kendi oyunlarından hesaplanır.
> - Ayarlar (zor mod, renk körü modu) Mindmash'in Ayarlar ekranındadır. Ayrı hatırlatma yoktur; Mindmash'in günlük bildirimi kelimeyi de duyurur.
> - Zor mod, günün ilk tahmininde sabitlenir. Oyun ortasında ayarı değiştirmek o günü etkilemez.
> - **Günde 3 kelime:** Her Mindmash videosunun bir kelimesi vardır (sabah 08:00, öğlen 12:00, akşam 19:00). Kelime videoyla aynı saatte açılır ve o videoda geçer (Bölüm 9.4 ve Bölüm 10). Her kelime ayrı bir oyundur: 6 deneme, kendi sonucu.
> - Paylaşım metni: `Mindmash Kelime #42 Sabah 4/6` ve uygulama bağlantısı.
> - Harfler karo ve klavyede Mindmash'in dar yazı tipiyle (Barlow Condensed) yazılır. Renkler `src/styles.css` içindeki `--karo-*` değişkenlerinden gelir.

---

## 1. Özet

Herkes her gün aynı üç 5 harfli Türkçe kelimeyi (her videoya bir kelime) ayrı ayrı 6 denemede bulmaya çalışır. Her tahminden sonra harfler renklenir:

- 🟩 Doğru harf, doğru yer
- 🟨 Kelimede var, yeri yanlış
- ⬛ Kelimede yok

Kelime bulununca anlamı ve örnek cümlesi gösterilir. Sonuç, harfleri ele vermeyen emoji ızgarasıyla paylaşılabilir.

Uygulama web'de (GitHub Pages) ve Android'de (Capacitor ile Google Play) yayınlanır. Veriler Supabase'de durur. Claude zamanlanmış görevi şunları otomatik yapar:

- Günlük kelimeleri (günde 3) 14 gün önceden, o saatteki videonun seslendirmesinden seçer.
- Anlam ve örnek cümle yazar.
- Sözlüğü inceleyip cevap havuzunu büyütür.
- Kullanıcıların "bu kelime geçerli olmalı" önerilerini işler.

**Neden otomasyona uygun?** Oyun mekaniği sabittir. Değişen tek şey günlük veridir. Uygulama hiç güncellenmeden yıllarca yeni bulmaca sunar.

---

## 2. Hedef kitle ve farklılaşma

- **Hedef kitle:** Günde 3–5 dakikalık zihin egzersizi isteyen, sonucunu WhatsApp ve sosyal medyada paylaşan kullanıcılar.
- **Farklılaşma:**
  - Tam Türkçe klavye ve doğru İ/ı davranışı
  - Kelime bulununca anlam ve örnek cümle (öğretici)
  - Hile yapılamayan sunucu taraflı kontrol: Cevap istemciye gönderilmez.
  - Faz 2'de ek modlar (Bağlantılar, Kelime Merdiveni)

---

## 3. Tasarım ilkeleri

1. **Cevap istemcide yoktur:** Tahmin kontrolü bir Postgres fonksiyonunda (RPC) yapılır. Cevap yalnızca oyun bitince döner.
2. **Tampon:** 14 günlük bulmaca (günde 3) önceden hazırdır. Görev bir hafta çalışmasa bile oyun sürer.
3. **Sözlük ikiye ayrılır:** *Geçerli tahminler* (geniş) ve *cevap adayları* (Claude'un incelediği yaygın kelimeler).
4. **Türkçe karakterler istemcide normalleştirilir:** Veritabanı yalnızca büyük Türkçe harflerle çalışır. Postgres'in `upper()` fonksiyonu İ/ı'yı yanlış çevirebilir, bu yüzden kullanılmaz.
5. **Sunucu kodu yoktur:** Mantık RLS ve iki üç SQL fonksiyonundan ibarettir.
6. **Kullanıcı geri bildirimi otomasyona bağlıdır:** "Geçerli kelime değil" uyarısı alan oyuncu kelimeyi önerebilir, Claude inceler.

---

## 4. Oyun kuralları

- 5 harf, 6 deneme.
- Tahmin, sözlükte bulunan geçerli bir kelime olmalıdır. Geçersiz tahmin deneme hakkı tüketmez.
- **Tekrarlanan harfler:** Önce yeşiller işaretlenir. Kalan harflerden, cevapta o harften kaç tane kaldıysa o kadar sarı verilir, fazlası gri olur.
  - Örnek: Cevap KALEM, tahmin KAKAO → K🟩 A🟩 K⬛ A⬛ O⬛
- **Türk alfabesi (29 harf):** A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z. Q, W, X kullanılmaz.
- **Şapkalı harfler:** Klavyede yoktur. Sözlükte â→A, î→İ, û→U olarak saklanır (KÂĞIT → KAĞIT).
- **Zor mod (isteğe bağlı):** Bulunan yeşil ve sarı harfler sonraki tahminlerde kullanılmak zorundadır. İstemci tarafında uygulanır.
- **Açılış:** Sabah kelimesi 08:00'de, öğlen kelimesi 12:00'de, akşam kelimesi 19:00'da (Türkiye saati), videosuyla birlikte açılır. Açılmış kelimeler gün bitene kadar oynanabilir.
- **Gün değişimi:** Türkiye saatiyle 00:00. Bulmaca numarası = başlangıç tarihinden bu yana geçen gün + 1; aynı günün üç kelimesi aynı numarayı taşır, paylaşımda slot adı yazar.

---

## 5. Özellikler

| Faz | Özellik |
|---|---|
| **MVP** | Günlük 5 harfli kelime, 6 deneme, renkli geri bildirim |
| MVP | Türkçe ekran klavyesi ve harf durum renkleri; fiziksel klavye desteği (web) |
| MVP | Sunucu taraflı tahmin kontrolü (RPC) ve oyun durumunun sunucuda saklanması |
| MVP | Oyun sonunda anlam, örnek cümle |
| MVP | Emoji ızgarasıyla paylaşım |
| MVP | Kişisel istatistikler: oynanan, kazanma %, seri, en uzun seri, deneme dağılımı |
| MVP | Günün genel dağılımı ("Oyuncuların %38'i 4. denemede buldu") |
| MVP | "Bu kelime geçerli olmalı" önerisi |
| MVP | Zor mod, renk körü modu (turuncu/mavi), açık/koyu tema |
| MVP | Günlük yerel hatırlatma bildirimi |
| **Faz 2** | Günlük ve haftalık sıralama, 90 saniyelik süreli oyun (yapıldı; Bölüm 13.1) |
| Faz 2 | **Bağlantılar** modu: 16 kelime, 4 gizli grup (Claude günlük üretir) |
| Faz 2 | Geçmiş bulmacalar arşivi (kaçırılan günleri oynama, seriye sayılmaz) |
| **Faz 3** | **Kelime Merdiveni** modu (TAŞ → ... → KUŞ, her adımda bir harf değişir) |
| Faz 3 | 6 harfli haftalık "Pazar bulmacası" |
| Faz 3 | Haftalık özet: "Haftanın en zor kelimesi" (Claude yazar) |

**Kapsam dışı (bilerek):** Çok oyunculu anlık düello, e-posta ile üyelik, reklam (MVP).

---

## 6. Ekranlar

### 6.1 Oyun (ana ekran)
Gazetenin bulmaca köşesi görünümündedir (Mindmash'in almanak düzeni). Yukarıdan aşağıya:
- **Manşet:** "Kelime" başlığı, altında tarih ("19 Ekim · her videoya bir kelime"); yanlarda yardım ❓ ve istatistik 📊.
- **Günün programı:** Sabah · Öğlen · Akşam kartları. Her kart videonun saatini ve durumunu yazar: "Seni bekliyor", "2/6 deneme", "Buldun · 3/6", "Bulunamadı". Sıradaki kilitli kart açılışa kalan süreyi sayar ("02:04:55 sonra"), sonrakiler "Kilitli" yazar. Açılışta en yeni açılmış ve bitmemiş kelime seçilir.
- **Sıradaki kelime satırı:** "Sıradaki kelime akşam videosuyla 19:00'da açılıyor." Üç kelime de açıksa yarının ilk kelimesinin saatini yazar. Kısa ekranlarda gizlenir (geri sayım programda kalır).
- **Tahta:** 6×5 bulmaca kutuları, solda satır numarası. Etkin satır kırmızı numarayla, sıradaki kutu kırmızı alt çizgiyle gösterilir. Kutular kalan yüksekliğe göre ölçeklenir.
  - Harf yazılırken küçük "pop" animasyonu
  - Değerlendirmede kutular soldan sağa sırayla çevrilir
- **Kilitli kelime:** Tahtanın yerinde videonun saati ve kalan süre ("Akşam kelimesi · 19:00 · 02:04:55 kaldı").
- **Deneme sayacı:** "Deneme 2/6 · öğlen videosunda geçiyor" (kelime videodan geldiyse).
- **Gönder düğmesi:** Klavyenin üstünde, tam genişlikte. Beş harf girilene kadar pasiftir; beşinci harfle etkinleşir. Fiziksel klavyede Enter da gönderir.
- **Bitmiş kelime:** Klavyenin yerine özet gelir: "3. denemede buldun", kelime ve anlamı, "Sonucu gör" ve varsa açık başka kelimeye geçiş ("Öğlen kelimesine geç").
- Geçersiz kelimede satır sallanır, "Sözlükte yok" uyarısı çıkar ve "Önerilsin mi?" linki gösterilir.
- **Ekran klavyesi (Türkçe Q düzeni):** Gönderme klavyede değil, Gönder düğmesindedir.
  ```
  E R T Y U I O P Ğ Ü
  A S D F G H J K L Ş İ
  Z C V B N M Ö Ç ⌫
  ```
  - Tuşlar o güne kadarki en iyi durumuna göre renklenir (yeşil > sarı > gri).

### 6.2 Sonuç penceresi
Pencere telefonda kaydırma gerektirmeden sığar. Yukarıdan aşağıya:
- Başlık ("Buldun" / "Bu sefer olmadı"), kelimenin karoları ve skor ("2/6", bulunamadıysa "X/6")
- Anlam ve örnek cümle, satır sınırıyla (ekran yüksekliğine göre 5/3, 3/2 veya 2/1 satır); taşarsa "Devamını oku"
- Kelimenin geçtiği video tek satırda ve "Videoyu izle"
- Kişisel istatistikler (oynanan, kazanma, seri, en iyi seri)
- Deneme dağılımı: 6 kısa sütun, bu kelimenin sütunu vurgulu; yanında "Seninle aynı: %33" (en az 5 oyuncu varsa)
- Sonraki kelimeye geri sayım (bugünün açılmamış videosu, yoksa yarın 08:00) ve "Sonucu paylaş"

### 6.3 Nasıl oynanır
- Üç örnek satırla kurallar (ilk açılışta otomatik gösterilir)

### 6.4 Ayarlar
- Mindmash Ayarlar ekranının "Kelime oyunu" bölümü: zor mod, renk körü modu
- Tema, bildirim, gizlilik ve hakkında Mindmash'in genel ayarlarıdır

### 6.5 Paylaşım metni

```
Mindmash Kelime #42 Sabah 4/6
⬛🟨⬛⬛⬛
⬛🟩🟨⬛⬛
🟩🟩⬛🟩🟩
🟩🟩🟩🟩🟩
https://mdtokat.github.io/takvim-yapragi/#/kelime
```
- Zor modda "4/6*". Renk körü modunda 🟧🟦 kullanılır.

---

## 7. Mimari

```
┌─────────────────────────────────────┐
│ Claude zamanlanmış görev (02:00)    │
│  bulmaca tamponu, anlam/örnek,      │
│  sözlük inceleme, öneri işleme      │
└──────────────────┬──────────────────┘
                   │ Supabase bağlayıcısı (execute_sql) — tam yetki
                   ▼
┌─────────────────────────────────────┐
│ Supabase                            │
│  kb_sozluk, kb_bulmacalar (KAPALI)  │
│  kb_denemeler (yalnız kendi)        │
│  kb_kelime_onerileri (yalnız ekle)  │
│  RPC: kb_tahmin, kb_bitis_bilgisi,  │
│       kb_dagilim                    │
│  Auth: anonim oturum                │
└──────────────────┬──────────────────┘
                   │ anon anahtar + anonim oturum
           ┌───────┴────────┐
           ▼                ▼
      Web (PWA)        Android (Capacitor)
```

- **Ortak altyapı:** Üç uygulama tek Supabase projesinde çalışır. Bu uygulamanın öneki `kb_`. `gorev_kayitlari` tablosu ortaktır (Takvim Yaprağı dokümanı, Bölüm 7).
- **Supabase Dashboard → Authentication** altında **Anonymous sign-ins** açılır. CAPTCHA (ör. Cloudflare Turnstile) önerilir.
- **Neden anonim oturum?** Oyun durumu, istatistikler ve 6 deneme sınırı sunucuda kullanıcıya bağlanır. Kullanıcı hiçbir form doldurmaz.

---

## 8. Sözlük kaynağı (tek seferlik kurulum)

Claude'un sıfırdan eksiksiz bir sözlük üretmesi güvenilir değildir. Bu yüzden başlangıçta hazır bir kelime listesi içe aktarılır:

1. Açık kaynaklı bir Türkçe kelime listesi bul (GitHub'da birçok liste var). **Lisansını kontrol et**, ticari kullanıma izin veren bir lisans seç.
2. Yalnızca **madde başı** (yalın) kelimeleri al. Çekimli biçimler (EVLER, GELDİ) cevap olmamalıdır. Bunların tahmin olarak kabul edilip edilmeyeceğine karar ver (öneri: kabul edilmesin, kurallar sade kalsın).
3. Küçük bir betikle (Claude Code yazabilir) şu işlemleri yap:
   - `toLocaleUpperCase('tr-TR')` ile büyüt
   - Şapkaları kaldır
   - Tam 5 harf ve yalnızca Türk alfabesi olanları süz
   - Tekrarları sil
4. CSV olarak Supabase Table Editor'den `kb_sozluk` tablosuna içe aktar (`kelime` sütunu).
5. Listede eksik kalan kelimeleri zamanla "öneri" mekanizması tamamlar.

---

## 9. Veritabanı şeması

```sql
-- ===== Sözlük =====
create table kb_sozluk (
  kelime       text primary key
                 check (kelime ~ '^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{5}$'),
  incelendi    boolean not null default false,  -- Claude cevap uygunluğunu değerlendirdi mi
  cevap_uygun  boolean not null default false,  -- günlük cevap olabilir mi
  zorluk       smallint check (zorluk between 1 and 3),  -- 1 kolay, 3 zor
  eklenme      timestamptz not null default now()
);
create index kb_sozluk_aday_idx on kb_sozluk (zorluk) where cevap_uygun;

-- ===== Günlük bulmacalar (istemciye KAPALI) =====
create table kb_bulmacalar (
  tarih        date primary key,
  cevap        text not null unique references kb_sozluk(kelime),
  zorluk       smallint not null check (zorluk between 1 and 3),
  anlam        text not null check (char_length(anlam) <= 300),
  ornek_cumle  text not null check (char_length(ornek_cumle) <= 200),
  olusturma    timestamptz not null default now()
);

-- ===== Oyuncu denemeleri =====
create table kb_denemeler (
  kullanici_id  uuid not null,
  tarih         date not null,
  sira          smallint not null check (sira between 1 and 6),
  tahmin        text not null,
  sonuc         jsonb not null,                -- ["yesil","gri","sari","gri","gri"]
  dogru         boolean not null,
  zaman         timestamptz not null default now(),
  primary key (kullanici_id, tarih, sira)
);
create index kb_denemeler_tarih_idx on kb_denemeler (tarih) where dogru;

-- ===== Kelime önerileri =====
create table kb_kelime_onerileri (
  id            bigint generated always as identity primary key,
  kelime        text not null check (kelime ~ '^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{5}$'),
  kullanici_id  uuid default auth.uid(),
  durum         text not null default 'yeni' check (durum in ('yeni','eklendi','reddedildi')),
  olusturma     timestamptz not null default now()
);
```

### 9.1 RLS

```sql
alter table kb_sozluk           enable row level security;  -- politika yok: kapalı
alter table kb_bulmacalar       enable row level security;  -- politika yok: kapalı
alter table kb_denemeler        enable row level security;
alter table kb_kelime_onerileri enable row level security;

-- Oyuncu yalnızca kendi denemelerini okur (oyun durumunu geri yüklemek için).
-- Ekleme yalnızca kb_tahmin fonksiyonu üzerinden yapılır (insert politikası yok).
create policy kb_deneme_kendi on kb_denemeler for select to authenticated
  using (kullanici_id = auth.uid());

create policy kb_oneri_ekle on kb_kelime_onerileri for insert to authenticated
  with check (kullanici_id = auth.uid() and durum = 'yeni');
```

### 9.2 Tahmin fonksiyonu (oyunun kalbi)

```sql
create or replace function kb_tahmin(p_tahmin text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_tarih    date := (now() at time zone 'Europe/Istanbul')::date;
  v_b        kb_bulmacalar%rowtype;
  v_adet     int;
  v_cozuldu  boolean;
  v_sonuc    text[] := array['gri','gri','gri','gri','gri'];
  v_kalan    text[] := array[]::text[];
  v_harf     text;
  v_dogru    boolean;
  i int; j int;
begin
  if auth.uid() is null then
    raise exception 'oturum_gerekli';
  end if;
  if p_tahmin !~ '^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{5}$' then
    raise exception 'gecersiz_bicim';
  end if;

  select * into v_b from kb_bulmacalar where tarih = v_tarih;
  if not found then
    raise exception 'bulmaca_yok';
  end if;

  select count(*), coalesce(bool_or(dogru), false)
    into v_adet, v_cozuldu
    from kb_denemeler where kullanici_id = auth.uid() and tarih = v_tarih;
  if v_cozuldu or v_adet >= 6 then
    raise exception 'oyun_bitti';
  end if;

  -- Sözlükte yoksa deneme hakkı tüketmeden dön
  if not exists (select 1 from kb_sozluk where kelime = p_tahmin) then
    return jsonb_build_object('gecerli', false);
  end if;

  -- 1. geçiş: yeşiller
  for i in 1..5 loop
    if substr(p_tahmin, i, 1) = substr(v_b.cevap, i, 1) then
      v_sonuc[i] := 'yesil';
    else
      v_kalan := v_kalan || substr(v_b.cevap, i, 1);
    end if;
  end loop;

  -- 2. geçiş: sarılar (her kalan harf yalnızca bir kez kullanılır)
  for i in 1..5 loop
    if v_sonuc[i] <> 'yesil' then
      v_harf := substr(p_tahmin, i, 1);
      j := array_position(v_kalan, v_harf);
      if j is not null then
        v_sonuc[i] := 'sari';
        v_kalan := v_kalan[1:j-1] || v_kalan[j+1:];
      end if;
    end if;
  end loop;

  v_dogru := (p_tahmin = v_b.cevap);

  insert into kb_denemeler (kullanici_id, tarih, sira, tahmin, sonuc, dogru)
  values (auth.uid(), v_tarih, v_adet + 1, p_tahmin, to_jsonb(v_sonuc), v_dogru);

  return jsonb_build_object(
    'gecerli', true,
    'sonuc',   to_jsonb(v_sonuc),
    'dogru',   v_dogru,
    'deneme',  v_adet + 1,
    'bitti',   v_dogru or v_adet + 1 >= 6,
    'cevap',   case when v_dogru or v_adet + 1 >= 6 then v_b.cevap end,
    'anlam',   case when v_dogru or v_adet + 1 >= 6 then v_b.anlam end,
    'ornek',   case when v_dogru or v_adet + 1 >= 6 then v_b.ornek_cumle end
  );
end;
$$;
revoke all on function kb_tahmin(text) from public, anon;
grant execute on function kb_tahmin(text) to authenticated;
```

> Aynı anda iki istek gelirse `primary key (kullanici_id, tarih, sira)` ikinci eklemeyi reddeder. İstemci hatayı yakalayıp durumu yeniden yükler.

### 9.3 Yardımcı fonksiyonlar

```sql
-- Oyun bitmişse (veya geçmiş bir günse) cevap bilgisini döndürür; uygulama yeniden açıldığında kullanılır
create or replace function kb_bitis_bilgisi(p_tarih date)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_bitti boolean;
  v_b kb_bulmacalar%rowtype;
begin
  select coalesce(bool_or(dogru), false) or count(*) >= 6 into v_bitti
    from kb_denemeler where kullanici_id = auth.uid() and tarih = p_tarih;
  if not v_bitti and p_tarih >= v_bugun then
    return null;
  end if;
  select * into v_b from kb_bulmacalar where tarih = p_tarih;
  return jsonb_build_object('cevap', v_b.cevap, 'anlam', v_b.anlam, 'ornek', v_b.ornek_cumle);
end;
$$;
revoke all on function kb_bitis_bilgisi(date) from public, anon;
grant execute on function kb_bitis_bilgisi(date) to authenticated;

-- Günün genel deneme dağılımı (kimlik açmadan)
create or replace function kb_dagilim(p_tarih date)
returns table (deneme smallint, oyuncu bigint)
language sql stable security definer set search_path = public
as $$
  select sira, count(*) from kb_denemeler
  where tarih = p_tarih and dogru and p_tarih <= (now() at time zone 'Europe/Istanbul')::date
  group by sira
  union all
  select 0::smallint, count(*) from (       -- 0 = bulamayanlar
    select kullanici_id from kb_denemeler where tarih = p_tarih
    group by kullanici_id having count(*) = 6 and not bool_or(dogru)
  ) x;
$$;
grant execute on function kb_dagilim(date) to anon, authenticated;
```

### 9.4 Video bağlantısı ve günde 3 kelime (Mindmash)

Göçler: `supabase/migrations/20261017130000_mindmash_videolar.sql` (video sütunları) ve `supabase/migrations/20261019120000_mindmash_kelime_uc_slot.sql` (günde 3 kelime).

```sql
alter table kb_bulmacalar
  add column slot         text not null check (slot in ('sabah','oglen','aksam')),
  add column acilis       timestamptz not null,   -- videonun yayın saati: 08:00, 12:00, 19:00
  add column video_baslik text check (char_length(video_baslik) <= 120),
  add primary key (tarih, slot);                  -- eskiden yalnızca tarih
-- video_slot sütunu eskidir (günde tek kelime dönemi), kullanılmaz.

alter table kb_denemeler
  add column slot text not null check (slot in ('sabah','oglen','aksam')),
  add primary key (kullanici_id, tarih, slot, sira);
```

- Bölüm 9.2 ve 9.3'teki fonksiyonlar slot alır: `kb_tahmin(p_tahmin, p_slot)`, `kb_bitis_bilgisi(p_tarih, p_slot)`, `kb_dagilim(p_tarih, p_slot)`. Mantık aynıdır; denemeler ve bitiş kontrolü (tarih, slot) için yapılır.
- `kb_tahmin` yalnızca bugünün ve `acilis <= now()` olan kelimesini kabul eder; açılmamış kelime için `bulmaca_yok` döner.
- `kb_bugun()` bugünün kelimelerini döndürür: `slotlar: [{slot, acilis, acik, video_baslik}]`. Cevap dönmez; `video_baslik` yalnızca açılmış kelimede dolu.
- `video_baslik` boşsa kelime videodan gelmemiştir (plan okunamadı). O zaman ipucu ve sonuçtaki video satırı gösterilmez.
- Eski istemciler için tek argümanlı imzalar (`kb_tahmin(text)` vb.) sabah kelimesine yönlendirilir; `kb_bugun()` eski `hazir` alanını sabah kelimesine göre doldurur.
- İstatistik: her kelime ayrı oyundur (oynanan, kazanma oranı, dağılım). Seri, en az bir kelimenin bulunduğu art arda günlerdir.

### 9.5 Durumsuz değerlendirme (Firebase dönemi)

Göç: `supabase/migrations/20261019150000_mindmash_durumsuz_kelime.sql`.

- `kb_degerlendir(p_tarih, p_slot, p_tahminler text[])`: `anon` çağırabilir. O kelimenin bütün tahminleri (1–6, yenisi sonda) gönderilir.
  - Yalnızca bugünün veya geçmiş günlerin, `acilis <= now()` olan kelimesi değerlendirilir; yoksa `bulmaca_yok`.
  - Sözlükte olmayan tahmin varsa `{gecerli: false, gecersiz: sıra}` döner (hak harcatmaz).
  - Doğru tahminden sonra tahmin gelirse `oyun_bitti`.
  - Aksi halde `{gecerli, sonuclar: [[...renkler]], dogru, bitti}`; oyun bittiyse (doğru veya 6 tahmin) `cevap`, `anlam`, `ornek`, `video_baslik` da döner.
- Hiçbir şey kaydetmez. 6 hak sınırı istemcide uygulanır; kötü niyetli biri istediği kadar deneyebilir (anonim hesaplarla bu zaten mümkündü).
- `kb_kelime_onerileri` için `anon` ekleme politikası eklendi (`kullanici_id` boş).

### 9.6 Sıralı kelime (90 saniye)

Göç: `supabase/migrations/20261019180000_mindmash_siralama.sql` (tam tablo ve fonksiyon listesi `docs/TASARIM.md` Bölüm 7.2).

```sql
create table kb_puanlar (
  uid        text not null references tt_oyuncular(uid) on delete cascade,  -- Firebase kullanıcı kimliği
  tarih      date not null,
  slot       text not null check (slot in ('sabah','oglen','aksam')),
  baslangic  timestamptz not null default now(),
  bitis      timestamptz,
  tahminler  text[] not null default '{}',
  durum      text not null default 'devam' check (durum in ('devam','kazandi','kaybetti')),
  puan       smallint not null default 0,
  primary key (uid, tarih, slot)
);
```

- `kb_sirali_durum(p_tarih, p_slot, p_baslat)`: oyunu döndürür (tahminler, renkler, kalan süre, puan; bittiyse cevap, anlam, örnek). `p_baslat` ile yalnızca bugünün açılmış kelimesi başlatılır. 92 saniyeyi geçmiş oyun `kaybetti` olur.
- `kb_sirali_tahmin(p_tarih, p_slot, p_tahmin)`: süre içindeyse tahmini ekler. Renkler `kb_renkler(tahmin, cevap)` ile hesaplanır (`kb_degerlendir` ile aynı kural). Doğru tahminde puan yazılır.
- Kullanıcı Firebase oturum anahtarından tanınır (`tt_firebase_uid()`); anahtar yoksa `giris_gerekli`.

---

## 10. Claude zamanlanmış görevi — Günlük bakım (her gün 09:51)

Güncel ayarlar ve talimatın tamamı `docs/gorevler/kelime-bakim.md` dosyasında. Özet:

- **Bulmaca tamponu:** 14 gün × 3 kelime. Her tarih için `sabah`, `oglen` ve `aksam` satırları yazılır; `acilis` videonun saatidir (08:00, 12:00, 19:00). Kelime yalnızca o slotun seslendirmesinden seçilir. Plan yoksa yedek kelime seçilir (`video_baslik` boş) ve plan sonradan gelirse açılıştan önce videodan kelimeyle değiştirilir. Açılmış kelime değiştirilmez.
- **Sözlük inceleme:** Günde 3 kelime harcandığı için her çalışmada 150 (aday azsa 300) kelime incelenir.
- **Kelime önerileri** işlenir.
- Cevaplar hiçbir kayda veya özete yazılmaz.

> **İlk dolum:** Sözlüğü içe aktardıktan sonra görevi elle 5–6 kez çalıştır. Böylece birkaç yüz kelime incelenir ve ilk 14 günün (42 kelime) bulmacası hazır olur.

---

## 11. İstemci (frontend) teknik detaylar

**Teknoloji:** Vite + React, `@supabase/supabase-js`, Capacitor.

```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL,
                                     import.meta.env.VITE_SUPABASE_ANON_KEY)

export const ALFABE = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'

// Fiziksel klavye ve yapıştırma için normalleştirme
export function harfNormalle(ch) {
  const sapkasiz = ch.replace('â','a').replace('Â','A')
                     .replace('î','i').replace('Î','İ')
                     .replace('û','u').replace('Û','U')
  const buyuk = sapkasiz.toLocaleUpperCase('tr-TR')   // i → İ, ı → I
  return ALFABE.includes(buyuk) ? buyuk : null
}

export async function oturumHazirla() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) await supabase.auth.signInAnonymously()
}

// Türkiye saatine göre bugünün tarihi (YYYY-MM-DD)
export const bugunTR = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())

// Açılışta tahta durumunu geri yükle
export async function bugununDenemeleri() {
  const { data } = await supabase.from('kb_denemeler')
    .select('sira, tahmin, sonuc, dogru').eq('tarih', bugunTR()).order('sira')
  return data ?? []
}

export async function tahminEt(kelime) {
  const { data, error } = await supabase.rpc('kb_tahmin', { p_tahmin: kelime })
  // error.message: 'oyun_bitti' | 'bulmaca_yok' | 'gecersiz_bicim' | çakışma
  return { data, error }
}

export const bitisBilgisi = (tarih) => supabase.rpc('kb_bitis_bilgisi', { p_tarih: tarih })
export const dagilim      = (tarih) => supabase.rpc('kb_dagilim', { p_tarih: tarih })
export const kelimeOner   = (kelime) => supabase.from('kb_kelime_onerileri').insert({ kelime })
```

**Kişisel istatistikler:**
- Kullanıcının kendi `kb_denemeler` satırlarından (`select tarih, slot, sira, dogru`) istemcide hesaplanır: oynanan kelime, kazanılan, seri (en az bir kelimenin bulunduğu art arda günler), dağılım.
- Anonim oturum cihaz değişince kaybolur. Faz 2'de isteğe bağlı e-posta bağlama (Supabase `linkIdentity` / e-posta güncelleme) eklenebilir.

**Klavye renkleri:** Her harf için en iyi durum tutulur: yeşil > sarı > gri.

**Gece yarısı ve video saatleri:**
- Ekran dakikada bir ve uygulama öne gelince kontrol eder. TR saatiyle 00:00 geçtiyse veya seçili kelimenin açılış saati geldiyse ekran yeniden yüklenir; başka bir kelimenin saati geldiyse yalnızca sekmeler güncellenir.
- Tahmin her zaman bugünün ve seçili slotun kelimesiyle karşılaştırılır. Bu yüzden istemci gün değişiminde tahtayı sıfırlar.

**Çevrimdışı:** Tahmin sunucu gerektirir. Çevrimdışıyken klavye devre dışı kalır ve "Bağlantı yok" uyarısı çıkar.

**Erişilebilirlik:** Renk körü modu, kart durumları için `aria-label` ("K, doğru yerde").

---

## 12. Bildirimler

- **Android:** `@capacitor/local-notifications`.
  - Kullanıcının seçtiği saatte "Bugünkü Harfiyen seni bekliyor 🔤" bildirimi gönderilir.
  - O günün bulmacası zaten çözüldüyse o günün bildirimi iptal edilir.
- **Web:** MVP'de bildirim yok.

---

## 13. Faz 2 ayrıntıları

### 13.1 Sıralama (yapıldı)

Takma ad yerine Instagram kullanıcı adı veya Facebook'taki ad kullanılır ve sıralama günlük ve haftalıktır; kelime ve sorular ayrı listelenir. Ayrıntılar `docs/TASARIM.md` Bölüm 5.7 ve 7.2.

- Sıralamaya katılan oyuncu bugünün kelimelerini 90 saniyede oynar. Süre "Başla"ya basınca `kb_sirali_durum` ile sunucuda başlar; tahminler durumlu `kb_sirali_tahmin` fonksiyonunda değerlendirilir ve `kb_puanlar` tablosunda tutulur (durumsuz `kb_degerlendir` sıralama dışında kullanılmaya devam eder).
- **Puan:** 1. denemede 100, sonra 80, 60, 40, 25, 10; bulunamazsa veya süre dolarsa 0. Bulunursa kalan sürenin her 3 saniyesi için 1 puan eklenir (en çok 30).
- Cihazda süresiz oynanmaya başlanmış kelime sıralamaya girmez. Geçmiş günler puan getirmez.
- Adlar kelime bakım görevinde denetlenir (`docs/gorevler/kelime-bakim.md` ADIM 4).

### 13.2 Bağlantılar modu
- **Tablo:** `kb_baglantilar (tarih pk, gruplar jsonb)`
  - `gruplar`: `[{baslik, kelimeler:[4], zorluk 1-4}]`
- Claude 14 gün tamponla üretir. Grupların başka bir gruba da uyabilecek "tuzak" kelimeler içermesi istenir, ama her kelimenin tek doğru grubu olmalıdır.
- Hile riski kelime oyunundan düşüktür. İstersen yine RPC ile kontrol edilebilir (`kb_grup_dene(kelimeler text[])`).

---

## 14. Yayınlama

- **Web:** GitHub Actions → GitHub Pages, PWA, `gizlilik.html`.
- **Android:** Capacitor → imzalı AAB → Play Console.
  - Yeni kişisel hesaplarda kapalı test şartı olabilir, güncel şartı kontrol et.
  - **Veri güvenliği formu:** Anonim kullanıcı kimliği ve oyun ilerlemesi (uygulama işlevi için), kelime önerileri. Satış veya reklam amaçlı paylaşım yok.
  - **İçerik derecelendirme anketi:** Herkes.
  - Faz 2 liderlik tablosunda kullanıcı içeriği (takma ad) olduğu için "Bildir" seçeneği eklenmelidir.

---

## 15. Maliyet

| Kalem | Maliyet |
|---|---|
| Supabase | Ücretsiz plan. Deneme satırları küçüktür. Çok büyük kullanıcı sayısında eski denemeler (ör. 1 yıldan eski) özetlenip silinebilir. |
| GitHub Pages | Ücretsiz |
| Claude zamanlanmış görev | Mevcut aboneliğin, günde 1 çalışma |
| Google Play | Tek seferlik geliştirici hesabı ücreti |

> Güncel Supabase ücretsiz plan sınırlarını (veritabanı boyutu, aylık aktif kullanıcı, hareketsizlikte duraklatma) fiyatlandırma sayfasından kontrol et.

---

## 16. Riskler ve önlemler

| Risk | Önlem |
|---|---|
| Cevabın sızması (ağ trafiği, kaynak kod) | Cevap yalnızca RPC'de, oyun bitince döner. Tablolar istemciye kapalıdır. Görev cevapları kayda yazmaz. |
| Kaba kuvvet (çok sayıda anonim hesap) | CAPTCHA. Düşük riskli bir oyun, kabul edilebilir. |
| Eksik veya hatalı sözlük | Öneri mekanizması ve Claude doğrulaması. Geçersiz tahmin hak tüketmez. |
| Uygunsuz veya moral bozucu günlük kelime | Claude incelemesinde açık ret kuralları |
| İ/ı hataları | İstemcide `tr-TR` normalleştirme, veritabanında `upper()` kullanılmaz, regex kontrolü |
| Görev uzun süre çalışmaz | 14 günlük tampon. `bulmaca_yok` durumunda ekran "Bugünün bulmacası hazırlanıyor" der ve geçmiş bir bulmacayı oynatır. |
| Aday havuzunun tükenmesi | Görev aday sayısını izler ve inceleme hızını otomatik artırır. Gerekirse 6 harfli moda geçiş. |
| Sözlük lisansı | İçe aktarmadan önce lisans kontrolü |

---

## 17. Uygulama adımları (Claude Code için yapılacaklar listesi)

- [ ] Kelime listesi bul, lisansı kontrol et, normalleştirme betiğiyle 5 harfli CSV üret.
- [ ] Supabase: Anonymous sign-ins'i aç, Bölüm 9'daki SQL'i çalıştır, CSV'yi `kb_sozluk`'e aktar.
- [ ] SQL Editor'de `kb_tahmin` için birim testleri: tekrarlanan harf örnekleri (KAKAO/KALEM, ELLER/KALEM), 6 deneme sınırı, geçersiz kelime.
- [ ] Günlük bakım görevini kur, elle 5–6 kez çalıştır.
- [ ] Vite + React: ızgara, Türkçe klavye, animasyonlar, sonuç penceresi, istatistikler, yardım, ayarlar.
- [ ] Anonim oturum, durum geri yükleme, RPC entegrasyonu, hata durumları, gece yarısı geçişi.
- [ ] Paylaşım metni (Web Share API / Capacitor Share), zor mod, renk körü modu.
- [ ] PWA ve GitHub Pages dağıtımı, gizlilik sayfası.
- [ ] Capacitor Android, yerel bildirim, ikon ve açılış ekranı.
- [ ] Play Console: mağaza kaydı, veri güvenliği, içerik derecelendirme, kapalı test.
- [ ] İlk 2 hafta `gorev_kayitlari`'nı ve günlük dağılımları izle, zorluk ayarını gerekirse görev talimatında düzelt.
