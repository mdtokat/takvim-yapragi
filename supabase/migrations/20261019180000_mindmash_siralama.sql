-- Mindmash: günlük ve haftalık sıralama (kelime ve sorular ayrı).
-- Kullanıcı hesabı Firebase'dedir. Supabase'de Firebase projesi (mindmash-takvim) üçüncü taraf giriş
-- olarak tanımlıdır: istemci sıralama isteklerine Firebase oturum anahtarını ekler, Supabase anahtarı
-- doğrular. Anahtarda role talebi olmadığı için istek anon rolüyle çalışır; kullanıcı kimliği aşağıdaki
-- fonksiyonlarda anahtarın sub alanından okunur.
-- İstemci bu tablolara doğrudan erişemez (politika yok); yazma ve okuma yalnızca security definer
-- fonksiyonlarla yapılır. Süre ve puan sunucuda ölçülür.
-- Silme fonksiyonu (tt_oyuncu_sil) ayrı göçtedir: 20261019180100_mindmash_siralama_oyuncu_sil.sql.

-- Firebase oturum anahtarındaki kullanıcı kimliği. Anahtar yoksa veya başka bir projeden ya da
-- Supabase'in kendi (eski anonim) oturumundan geliyorsa null döner.
create function tt_firebase_uid()
returns text
language sql stable set search_path = public
as $$
  select case
    when auth.jwt() ->> 'iss' = 'https://securetoken.google.com/mindmash-takvim'
     and auth.jwt() ->> 'aud' = 'mindmash-takvim'
    then nullif(auth.jwt() ->> 'sub', '')
  end;
$$;
revoke all on function tt_firebase_uid() from public, anon, authenticated;

-- ===== Oyuncular: sıralamada görünen ad =====
create table tt_oyuncular (
  uid         text primary key check (char_length(uid) between 1 and 128), -- Firebase kullanıcı kimliği
  ad          text not null check (char_length(ad) between 2 and 41),       -- '@kullanici' veya 'Ad Soyad'
  ad_turu     text not null check (ad_turu in ('instagram','facebook')),
  ad_anahtar  text not null unique,   -- karşılaştırma için küçük harfe indirilmiş ad; aynı ad iki kez alınamaz
  durum       text not null default 'yeni' check (durum in ('yeni','onayli','red')), -- red: sıralamada görünmez
  ad_degisim  timestamptz not null default now(),
  olusturma   timestamptz not null default now()
);
alter table tt_oyuncular enable row level security;

-- ===== Sıralamaya giren sorular (30 saniye) =====
create table tt_quiz_puanlari (
  uid           text not null references tt_oyuncular(uid) on delete cascade,
  tarih         date not null,
  sira          smallint not null check (sira between 1 and 3),
  baslangic     timestamptz not null default now(),
  cevap_zamani  timestamptz,                                -- null: soru açık, süre işliyor
  secim         smallint check (secim between 0 and 3),     -- cevap_zamani dolu ve secim null: süre doldu
  dogru         boolean,
  puan          smallint not null default 0,
  primary key (uid, tarih, sira)
);
create index tt_quiz_puanlari_tarih_idx on tt_quiz_puanlari (tarih);
alter table tt_quiz_puanlari enable row level security;

-- ===== Sıralamaya giren kelimeler (90 saniye) =====
create table kb_puanlar (
  uid        text not null references tt_oyuncular(uid) on delete cascade,
  tarih      date not null,
  slot       text not null check (slot in ('sabah','oglen','aksam')),
  baslangic  timestamptz not null default now(),
  bitis      timestamptz,
  tahminler  text[] not null default '{}',
  durum      text not null default 'devam' check (durum in ('devam','kazandi','kaybetti')),
  puan       smallint not null default 0,
  primary key (uid, tarih, slot)
);
create index kb_puanlar_tarih_idx on kb_puanlar (tarih);
alter table kb_puanlar enable row level security;

-- Politika olmadığı için RLS zaten kapatır; Supabase'in varsayılan tablo hakları da geri alınır.
revoke all on tt_oyuncular, tt_quiz_puanlari, kb_puanlar from anon, authenticated;

-- ===== Oyuncu adı =====
create function tt_oyuncu()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid text := public.tt_firebase_uid();
  v_o   public.tt_oyuncular%rowtype;
begin
  if v_uid is null then
    raise exception 'giris_gerekli';
  end if;
  select * into v_o from public.tt_oyuncular where uid = v_uid;
  if not found then
    return null;
  end if;
  return jsonb_build_object('ad', v_o.ad, 'ad_turu', v_o.ad_turu, 'durum', v_o.durum,
                            'ad_degisim', v_o.ad_degisim, 'olusturma', v_o.olusturma);
end;
$$;

-- Instagram: '@' ile başlar, küçük harf, rakam, nokta, alt çizgi (en çok 30). Facebook: 3–40 karakter,
-- harf, boşluk, nokta, kesme işareti, tire. Ad haftada bir değişebilir (ilk 15 dakika ve reddedilen ad hariç).
create function tt_oyuncu_kaydet(p_ad text, p_tur text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     text := public.tt_firebase_uid();
  v_ad      text := regexp_replace(btrim(coalesce(p_ad, '')), '\s+', ' ', 'g');
  v_anahtar text;
  v_o       public.tt_oyuncular%rowtype;
begin
  if v_uid is null then
    raise exception 'giris_gerekli';
  end if;
  if p_tur = 'instagram' then
    v_ad := lower(v_ad);
    if left(v_ad, 1) <> '@' then
      v_ad := '@' || v_ad;
    end if;
    if v_ad !~ '^@[a-z0-9._]{1,30}$' then
      raise exception 'ad_gecersiz';
    end if;
  elsif p_tur = 'facebook' then
    if v_ad !~ '^[A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû][A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû .''-]{1,38}[A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû.]$' then
      raise exception 'ad_gecersiz';
    end if;
  else
    raise exception 'ad_gecersiz';
  end if;
  -- Türkçe büyük harfler lower()'dan önce elle çevrilir (lower('İ') noktalı i'ye dönüşmez).
  v_anahtar := p_tur || ':' || lower(translate(v_ad, 'İIÇĞÖŞÜÂÎÛ', 'iıçğöşüâîû'));

  select * into v_o from public.tt_oyuncular where uid = v_uid for update;
  if found then
    if v_o.ad = v_ad and v_o.ad_turu = p_tur then
      return public.tt_oyuncu();
    end if;
    if v_o.durum <> 'red'
       and v_o.olusturma < now() - interval '15 minutes'
       and v_o.ad_degisim > now() - interval '7 days' then
      raise exception 'ad_degisim_siniri';
    end if;
  end if;
  if exists (select 1 from public.tt_oyuncular where ad_anahtar = v_anahtar and uid <> v_uid) then
    raise exception 'ad_alinmis';
  end if;

  insert into public.tt_oyuncular (uid, ad, ad_turu, ad_anahtar)
    values (v_uid, v_ad, p_tur, v_anahtar)
  on conflict (uid) do update
    set ad = excluded.ad, ad_turu = excluded.ad_turu, ad_anahtar = excluded.ad_anahtar,
        durum = 'yeni', ad_degisim = now();
  return public.tt_oyuncu();
exception
  when unique_violation then
    raise exception 'ad_alinmis';
end;
$$;

-- ===== Sorular: 30 saniye =====
-- Doğru cevap 50 puan ve kalan her saniye için 1 puan (en çok 80). Ağ gecikmesi için 2 saniye tolerans.
create function tt_quiz_puan_sonucu(p public.tt_quiz_puanlari, p_dogru_index smallint)
returns jsonb
language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'basladi',     true,
    'kalan_ms',    case when p.cevap_zamani is null
                     then greatest(0, 30000 - floor(extract(epoch from now() - p.baslangic) * 1000))::int end,
    'cevaplandi',  p.cevap_zamani is not null,
    'secim',       p.secim,
    'sure_doldu',  p.cevap_zamani is not null and p.secim is null,
    'dogru',       p.dogru,
    'dogru_index', case when p.cevap_zamani is not null then p_dogru_index end,
    'puan',        p.puan
  );
$$;
revoke all on function tt_quiz_puan_sonucu(public.tt_quiz_puanlari, smallint) from public, anon, authenticated;

-- Sıralamaya giren sorunun durumu. p_baslat: soru henüz başlamadıysa süreyi başlatır (yalnızca bugünün,
-- açılmış sorusu). Süresi dolmuş ve cevaplanmamış soru burada sonuçlanır.
create function tt_quiz_durum(p_tarih date, p_sira int, p_baslat boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   text := public.tt_firebase_uid();
  v_q     public.tt_quiz%rowtype;
  v_p     public.tt_quiz_puanlari%rowtype;
begin
  if v_uid is null then
    raise exception 'giris_gerekli';
  end if;
  if not exists (select 1 from public.tt_oyuncular where uid = v_uid) then
    raise exception 'oyuncu_yok';
  end if;
  select * into v_q from public.tt_quiz
    where tarih = p_tarih and sira = p_sira
      and tarih <= (now() at time zone 'Europe/Istanbul')::date
      and (acilis is null or acilis <= now());
  if not found then
    raise exception 'soru_yok';
  end if;

  select * into v_p from public.tt_quiz_puanlari
    where uid = v_uid and tarih = p_tarih and sira = p_sira for update;
  if not found then
    if not p_baslat then
      return jsonb_build_object('basladi', false);
    end if;
    -- Puan yalnızca o gün başlatılan sorulara verilir.
    if p_tarih <> (now() at time zone 'Europe/Istanbul')::date then
      raise exception 'gun_disi';
    end if;
    insert into public.tt_quiz_puanlari (uid, tarih, sira) values (v_uid, p_tarih, p_sira)
      returning * into v_p;
  elsif v_p.cevap_zamani is null and now() > v_p.baslangic + interval '32 seconds' then
    update public.tt_quiz_puanlari
      set cevap_zamani = baslangic + interval '30 seconds', secim = null, dogru = false, puan = 0
      where uid = v_uid and tarih = p_tarih and sira = p_sira
      returning * into v_p;
  end if;
  return public.tt_quiz_puan_sonucu(v_p, v_q.dogru_index);
end;
$$;

-- Cevabı değerlendirir. Sıralamada başlatılmış soru varsa süre ve puan kaydedilir (p_secim null: süre
-- doldu); yoksa yalnızca doğru cevap döner. Böylece istemci doğru cevabı önceden almaz.
create function tt_quiz_cevapla(p_tarih date, p_sira int, p_secim int)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   text := public.tt_firebase_uid();
  v_q     public.tt_quiz%rowtype;
  v_p     public.tt_quiz_puanlari%rowtype;
  v_gecen numeric;
begin
  if p_secim is not null and (p_secim < 0 or p_secim > 3) then
    raise exception 'gecersiz_bicim';
  end if;
  select * into v_q from public.tt_quiz
    where tarih = p_tarih and sira = p_sira
      and tarih <= (now() at time zone 'Europe/Istanbul')::date
      and (acilis is null or acilis <= now());
  if not found then
    raise exception 'soru_yok';
  end if;

  if v_uid is not null then
    select * into v_p from public.tt_quiz_puanlari
      where uid = v_uid and tarih = p_tarih and sira = p_sira for update;
    if found then
      if v_p.cevap_zamani is null then
        v_gecen := extract(epoch from now() - v_p.baslangic);
        if p_secim is null or v_gecen > 32 then
          update public.tt_quiz_puanlari
            set cevap_zamani = least(now(), baslangic + interval '30 seconds'), secim = null, dogru = false, puan = 0
            where uid = v_uid and tarih = p_tarih and sira = p_sira
            returning * into v_p;
        else
          update public.tt_quiz_puanlari
            set cevap_zamani = now(), secim = p_secim, dogru = (p_secim = v_q.dogru_index),
                puan = case when p_secim = v_q.dogru_index then 50 + greatest(0, floor(30 - v_gecen))::int else 0 end
            where uid = v_uid and tarih = p_tarih and sira = p_sira
            returning * into v_p;
        end if;
      end if;
      return public.tt_quiz_puan_sonucu(v_p, v_q.dogru_index) || jsonb_build_object('sirali', true);
    end if;
  end if;

  if p_secim is null then
    raise exception 'gecersiz_bicim';
  end if;
  return jsonb_build_object('sirali', false, 'cevaplandi', true, 'secim', p_secim, 'sure_doldu', false,
                            'dogru', p_secim = v_q.dogru_index, 'dogru_index', v_q.dogru_index, 'puan', null);
end;
$$;

-- ===== Kelime: 90 saniye =====
-- Tek tahminin renkleri (kb_degerlendir ile aynı kural: önce yeşiller, kalan harflerden sarılar).
create function kb_renkler(p_tahmin text, p_cevap text)
returns text[]
language plpgsql immutable set search_path = public
as $$
declare
  v_sonuc text[] := array['gri','gri','gri','gri','gri'];
  v_kalan text[] := array[]::text[];
  i int; j int;
begin
  for i in 1..5 loop
    if substr(p_tahmin, i, 1) = substr(p_cevap, i, 1) then
      v_sonuc[i] := 'yesil';
    else
      v_kalan := v_kalan || substr(p_cevap, i, 1);
    end if;
  end loop;
  for i in 1..5 loop
    if v_sonuc[i] <> 'yesil' then
      j := array_position(v_kalan, substr(p_tahmin, i, 1));
      if j is not null then
        v_sonuc[i] := 'sari';
        v_kalan := v_kalan[1:j-1] || v_kalan[j+1:];
      end if;
    end if;
  end loop;
  return v_sonuc;
end;
$$;
revoke all on function kb_renkler(text, text) from public, anon, authenticated;

create function kb_puan_sonucu(k public.kb_puanlar, b public.kb_bulmacalar)
returns jsonb
language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'basladi',      true,
    'gecerli',      true,
    'kalan_ms',     case when k.durum = 'devam'
                      then greatest(0, 90000 - floor(extract(epoch from now() - k.baslangic) * 1000))::int end,
    'tahminler',    to_jsonb(k.tahminler),
    'sonuclar',     coalesce((select jsonb_agg(to_jsonb(public.kb_renkler(t, b.cevap)) order by n)
                              from unnest(k.tahminler) with ordinality as x(t, n)), '[]'::jsonb),
    'durum',        k.durum,
    'dogru',        k.durum = 'kazandi',
    'bitti',        k.durum <> 'devam',
    'puan',         k.puan,
    'cevap',        case when k.durum <> 'devam' then b.cevap end,
    'anlam',        case when k.durum <> 'devam' then b.anlam end,
    'ornek',        case when k.durum <> 'devam' then b.ornek_cumle end,
    'video_baslik', case when k.durum <> 'devam' then b.video_baslik end
  );
$$;
revoke all on function kb_puan_sonucu(public.kb_puanlar, public.kb_bulmacalar) from public, anon, authenticated;

-- Sıralamaya giren kelimenin durumu. p_baslat: kelime henüz başlamadıysa süreyi başlatır (yalnızca
-- bugünün, açılmış kelimesi). Süresi dolmuş oyun burada sonuçlanır.
create function kb_sirali_durum(p_tarih date, p_slot text, p_baslat boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid text := public.tt_firebase_uid();
  v_b   public.kb_bulmacalar%rowtype;
  v_k   public.kb_puanlar%rowtype;
begin
  if v_uid is null then
    raise exception 'giris_gerekli';
  end if;
  if not exists (select 1 from public.tt_oyuncular where uid = v_uid) then
    raise exception 'oyuncu_yok';
  end if;
  select * into v_b from public.kb_bulmacalar
    where tarih = p_tarih and slot = p_slot and acilis <= now()
      and p_tarih <= (now() at time zone 'Europe/Istanbul')::date;
  if not found then
    raise exception 'bulmaca_yok';
  end if;

  select * into v_k from public.kb_puanlar
    where uid = v_uid and tarih = p_tarih and slot = p_slot for update;
  if not found then
    if not p_baslat then
      return jsonb_build_object('basladi', false);
    end if;
    if p_tarih <> (now() at time zone 'Europe/Istanbul')::date then
      raise exception 'gun_disi';
    end if;
    insert into public.kb_puanlar (uid, tarih, slot) values (v_uid, p_tarih, p_slot)
      returning * into v_k;
  elsif v_k.durum = 'devam' and now() > v_k.baslangic + interval '92 seconds' then
    update public.kb_puanlar
      set durum = 'kaybetti', bitis = baslangic + interval '90 seconds', puan = 0
      where uid = v_uid and tarih = p_tarih and slot = p_slot
      returning * into v_k;
  end if;
  return public.kb_puan_sonucu(v_k, v_b);
end;
$$;

-- Sıralamaya giren kelimeye tahmin. Puan: bulunan denemeye göre 100, 80, 60, 40, 25, 10; üstüne kalan
-- sürenin üçte biri (en çok 30). Süre dolduysa oyun kaybedilir. Sözlükte olmayan tahmin hak harcatmaz,
-- ama süre işlemeye devam eder.
create function kb_sirali_tahmin(p_tarih date, p_slot text, p_tahmin text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   text := public.tt_firebase_uid();
  v_b     public.kb_bulmacalar%rowtype;
  v_k     public.kb_puanlar%rowtype;
  v_gecen numeric;
  v_adet  int;
  v_hak   int[] := array[100, 80, 60, 40, 25, 10];
begin
  if v_uid is null then
    raise exception 'giris_gerekli';
  end if;
  if p_tahmin is null or p_tahmin !~ '^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{5}$' then
    raise exception 'gecersiz_bicim';
  end if;
  select * into v_b from public.kb_bulmacalar where tarih = p_tarih and slot = p_slot and acilis <= now();
  if not found then
    raise exception 'bulmaca_yok';
  end if;
  select * into v_k from public.kb_puanlar
    where uid = v_uid and tarih = p_tarih and slot = p_slot for update;
  if not found then
    raise exception 'baslamadi';
  end if;
  if v_k.durum <> 'devam' then
    return public.kb_puan_sonucu(v_k, v_b);
  end if;

  v_gecen := extract(epoch from now() - v_k.baslangic);
  if v_gecen > 92 then
    update public.kb_puanlar
      set durum = 'kaybetti', bitis = baslangic + interval '90 seconds', puan = 0
      where uid = v_uid and tarih = p_tarih and slot = p_slot
      returning * into v_k;
    return public.kb_puan_sonucu(v_k, v_b);
  end if;

  if not exists (select 1 from public.kb_sozluk where kelime = p_tahmin) then
    return jsonb_build_object('gecerli', false, 'gecersiz', coalesce(array_length(v_k.tahminler, 1), 0) + 1);
  end if;

  v_adet := coalesce(array_length(v_k.tahminler, 1), 0) + 1;
  update public.kb_puanlar
    set tahminler = tahminler || p_tahmin,
        durum = case when p_tahmin = v_b.cevap then 'kazandi' when v_adet >= 6 then 'kaybetti' else 'devam' end,
        bitis = case when p_tahmin = v_b.cevap or v_adet >= 6 then now() end,
        puan  = case when p_tahmin = v_b.cevap
                  then v_hak[v_adet] + floor(greatest(0, 90 - v_gecen) / 3)::int else 0 end
    where uid = v_uid and tarih = p_tarih and slot = p_slot
    returning * into v_k;
  return public.kb_puan_sonucu(v_k, v_b);
end;
$$;

-- ===== Sıralama =====
-- p_oyun: 'kelime' | 'quiz'; p_donem: 'gun' | 'hafta' (pazartesi–pazar, Türkiye saatine göre).
-- İlk 50 oyuncu ve isteği yapanın kendi sırası döner. Eşit puanda toplam süresi kısa olan öndedir.
-- Adı reddedilen oyuncular listelenmez. Giriş gerekmez; anahtar varsa kendi sırası da döner.
create function tt_siralama(p_oyun text, p_donem text, p_tarih date default null)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid   text := public.tt_firebase_uid();
  v_gun   date := least(coalesce(p_tarih, (now() at time zone 'Europe/Istanbul')::date),
                        (now() at time zone 'Europe/Istanbul')::date);
  v_bas   date;
  v_son   date;
  v_sonuc jsonb;
begin
  if p_oyun not in ('kelime','quiz') or p_donem not in ('gun','hafta') then
    raise exception 'gecersiz_bicim';
  end if;
  v_bas := case when p_donem = 'gun' then v_gun else date_trunc('week', v_gun)::date end;
  v_son := case when p_donem = 'gun' then v_gun else v_bas + 6 end;

  with oyunlar as (
    select uid, puan, extract(epoch from coalesce(cevap_zamani, now()) - baslangic) as sure
      from public.tt_quiz_puanlari
      where p_oyun = 'quiz' and tarih between v_bas and v_son
    union all
    select uid, puan, extract(epoch from coalesce(bitis, now()) - baslangic)
      from public.kb_puanlar
      where p_oyun = 'kelime' and tarih between v_bas and v_son
  ), toplam as (
    select o.uid, sum(o.puan)::int as puan, sum(o.sure) as sure, count(*)::int as oyun
      from oyunlar o join public.tt_oyuncular y on y.uid = o.uid
      where y.durum <> 'red'
      group by o.uid
  ), sirali as (
    select t.*, rank() over (order by t.puan desc, t.sure asc) as sira from toplam t
  )
  select jsonb_build_object(
    'baslangic', v_bas,
    'bitis',     v_son,
    'oyuncu_sayisi', (select count(*) from sirali),
    'liste', coalesce((
      select jsonb_agg(jsonb_build_object('sira', s.sira, 'ad', y.ad, 'ad_turu', y.ad_turu, 'puan', s.puan,
                                          'oyun', s.oyun, 'ben', coalesce(s.uid = v_uid, false)) order by s.sira, y.ad)
        from (select * from sirali order by sira limit 50) s join public.tt_oyuncular y on y.uid = s.uid
    ), '[]'::jsonb),
    'ben', (select jsonb_build_object('sira', s.sira, 'puan', s.puan, 'oyun', s.oyun) from sirali s where s.uid = v_uid)
  ) into v_sonuc;
  return v_sonuc;
end;
$$;

-- İstemcinin çağırabildiği fonksiyonlar (Firebase anahtarlı istekler de anon rolüyle gelir). Yardımcı
-- fonksiyonlar yukarıda anon ve authenticated rollerinden de geri alındı (Supabase varsayılan olarak verir).
revoke all on function tt_oyuncu() from public;
revoke all on function tt_oyuncu_kaydet(text, text) from public;
revoke all on function tt_quiz_durum(date, int, boolean) from public;
revoke all on function tt_quiz_cevapla(date, int, int) from public;
revoke all on function kb_sirali_durum(date, text, boolean) from public;
revoke all on function kb_sirali_tahmin(date, text, text) from public;
revoke all on function tt_siralama(text, text, date) from public;
grant execute on function tt_oyuncu() to anon, authenticated;
grant execute on function tt_oyuncu_kaydet(text, text) to anon, authenticated;
grant execute on function tt_quiz_durum(date, int, boolean) to anon, authenticated;
grant execute on function tt_quiz_cevapla(date, int, int) to anon, authenticated;
grant execute on function kb_sirali_durum(date, text, boolean) to anon, authenticated;
grant execute on function kb_sirali_tahmin(date, text, text) to anon, authenticated;
grant execute on function tt_siralama(text, text, date) to anon, authenticated;
