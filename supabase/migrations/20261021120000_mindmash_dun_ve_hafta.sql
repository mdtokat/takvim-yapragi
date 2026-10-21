-- Mindmash: dünün içeriği puanlı, hafta cuma başlar, geçen haftanın şampiyonları, oyuncu sayfası ve
-- iki haftalık saklama.
-- * Her günün soruları ve kelimeleri o gün ve ertesi gün (Türkiye saati) süreli ve puanlı oynanır. Puan
--   içeriğin gününe yazılır: dünün kelimesi dünün listesine ve o haftaya sayılır.
-- * Hafta cuma 00:00'da başlar, perşembe biter. Perşembenin içeriği cuma da oynanabildiği için bir haftanın
--   sonuçları ertesi cumartesi 00:00'da kesinleşir.
-- * Oyuncu sayfası: sıralamadaki ada dokununca oyuncunun haftalık sonuçları açılır. Tahminler ve seçilen
--   şıklar gösterilmez (dünün içeriği hâlâ oynanabilir). Bağlantı Firebase kimliğiyle değil, rastgele
--   `kimlik` ile kurulur.
-- İkinci kısım ayrı göçtedir: 20261021120100_mindmash_dun_ve_hafta_silme.sql.

-- ===== Yardımcılar =====
create function tt_bugun()
returns date
language sql stable set search_path = public
as $$
  select (now() at time zone 'Europe/Istanbul')::date;
$$;

-- Tarihin içinde olduğu haftanın ilk günü (cuma).
create function tt_hafta_basi(p_tarih date)
returns date
language sql immutable set search_path = public
as $$
  select p_tarih - ((extract(isodow from p_tarih)::int + 2) % 7);
$$;

-- Saklanan en eski gün: geçen haftanın cuması.
create function tt_saklama_basi()
returns date
language sql stable set search_path = public
as $$
  select public.tt_hafta_basi(public.tt_bugun()) - 7;
$$;

-- Bu günün sorusu ve kelimesi bu oyuncu için şimdi puanlı başlatılabilir mi: bugünün ve dünün içeriği,
-- o içerikten sonra sıralamadan çıkmamışsa (çıkıp yeniden katılan, cevabını bildiği oyunu yeniden puanlı
-- oynamasın). Dünün içeriği ileride reklamla açılacak; o zaman hak kontrolü buraya eklenir.
create function tt_puanli_gun(p_uid text, p_tarih date)
returns boolean
language sql stable set search_path = public
as $$
  select p_tarih between public.tt_bugun() - 1 and public.tt_bugun()
     and not exists (
       select 1 from public.tt_siralama_cikislari
       where uid_ozet = encode(sha256(convert_to(p_uid, 'UTF8')), 'hex')
         and tarih >= p_tarih
     );
$$;

revoke all on function tt_bugun() from public, anon, authenticated;
revoke all on function tt_hafta_basi(date) from public, anon, authenticated;
revoke all on function tt_saklama_basi() from public, anon, authenticated;
revoke all on function tt_puanli_gun(text, date) from public, anon, authenticated;

-- ===== Oyuncu sayfası kimliği =====
alter table tt_oyuncular add column kimlik uuid not null default gen_random_uuid();
alter table tt_oyuncular add constraint tt_oyuncular_kimlik_key unique (kimlik);

create or replace function tt_oyuncu()
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
  return jsonb_build_object('ad', v_o.ad, 'ad_turu', v_o.ad_turu, 'durum', v_o.durum, 'kimlik', v_o.kimlik,
                            'ad_degisim', v_o.ad_degisim, 'olusturma', v_o.olusturma);
end;
$$;

-- ===== Süre başlatma: bugünün ve dünün içeriği =====
create or replace function tt_quiz_durum(p_tarih date, p_sira int, p_baslat boolean)
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
      and tarih <= public.tt_bugun()
      and (acilis is null or acilis <= now());
  if not found then
    raise exception 'soru_yok';
  end if;

  select * into v_p from public.tt_quiz_puanlari
    where uid = v_uid and tarih = p_tarih and sira = p_sira for update;
  if not found then
    if not public.tt_puanli_gun(v_uid, p_tarih) then
      raise exception 'gun_disi';
    end if;
    if not p_baslat then
      return jsonb_build_object('basladi', false);
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

create or replace function kb_sirali_durum(p_tarih date, p_slot text, p_baslat boolean)
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
      and p_tarih <= public.tt_bugun();
  if not found then
    raise exception 'bulmaca_yok';
  end if;

  select * into v_k from public.kb_puanlar
    where uid = v_uid and tarih = p_tarih and slot = p_slot for update;
  if not found then
    if not public.tt_puanli_gun(v_uid, p_tarih) then
      raise exception 'gun_disi';
    end if;
    if not p_baslat then
      return jsonb_build_object('basladi', false);
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

-- ===== Kelime: istenen günün kelimeleri (kb_bugun'ün tarih alan hali) =====
-- Gelecek bir gün istenirse bugün döner. Cevap dönmez; video başlığı yalnızca açılmış kelimede dolu.
create function kb_gun(p_tarih date default null)
returns jsonb
language sql stable security definer set search_path = public
as $$
  with g as (
    select least(coalesce(p_tarih, public.tt_bugun()), public.tt_bugun()) as tarih
  ), b as (
    select k.* from public.kb_bulmacalar k join g on k.tarih = g.tarih
  )
  select jsonb_build_object(
    'tarih', (select tarih from g),
    'bugun', public.tt_bugun(),
    'slotlar', coalesce((
      select jsonb_agg(jsonb_build_object(
               'slot', b.slot,
               'acilis', b.acilis,
               'acik', b.acilis <= now(),
               'video_baslik', case when b.acilis <= now() then b.video_baslik end)
             order by b.acilis)
      from b), '[]'::jsonb)
  );
$$;

-- ===== Sıralama =====
-- Dönemin sıralaması: oyuncu başına toplam puan, toplam süre, oyun sayısı ve sıra. Eşit puanda toplam süresi
-- kısa olan öndedir. Adı reddedilen oyuncular girmez. Süresi dolmuş ama sonuçlanmamış oyun tam süre sayılır.
create function tt_siralama_tablosu(p_oyun text, p_bas date, p_son date)
returns table (uid text, puan int, sure numeric, oyun int, sira bigint)
language sql stable set search_path = public
as $$
  with oyunlar as (
    select q.uid, q.puan,
           extract(epoch from least(coalesce(q.cevap_zamani, now()), q.baslangic + interval '30 seconds') - q.baslangic) as sure
      from public.tt_quiz_puanlari q
      where p_oyun = 'quiz' and q.tarih between p_bas and p_son
    union all
    select k.uid, k.puan,
           extract(epoch from least(coalesce(k.bitis, now()), k.baslangic + interval '90 seconds') - k.baslangic)
      from public.kb_puanlar k
      where p_oyun = 'kelime' and k.tarih between p_bas and p_son
  ), toplam as (
    select o.uid, sum(o.puan)::int as puan, sum(o.sure) as sure, count(*)::int as oyun
      from oyunlar o join public.tt_oyuncular y on y.uid = o.uid
      where y.durum <> 'red'
      group by o.uid
  )
  select t.uid, t.puan, t.sure, t.oyun, rank() over (order by t.puan desc, t.sure asc) from toplam t;
$$;
revoke all on function tt_siralama_tablosu(text, date, date) from public, anon, authenticated;

-- p_oyun: 'kelime' | 'quiz'; p_donem: 'gun' | 'hafta' (cuma–perşembe). p_tarih dönemin bir günü (varsayılan
-- bugün); saklama süresinden eski bir gün istenirse en eski saklanan gün kullanılır. İlk 50 oyuncu ve isteği
-- yapanın kendi sırası döner. kesin: dönemin içeriği artık puanlı oynanamaz, sonuç değişmez.
create or replace function tt_siralama(p_oyun text, p_donem text, p_tarih date default null)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid   text := public.tt_firebase_uid();
  v_gun   date := greatest(least(coalesce(p_tarih, public.tt_bugun()), public.tt_bugun()), public.tt_saklama_basi());
  v_bas   date;
  v_son   date;
  v_sonuc jsonb;
begin
  if p_oyun not in ('kelime','quiz') or p_donem not in ('gun','hafta') then
    raise exception 'gecersiz_bicim';
  end if;
  v_bas := case when p_donem = 'gun' then v_gun else public.tt_hafta_basi(v_gun) end;
  v_son := case when p_donem = 'gun' then v_gun else v_bas + 6 end;

  with sirali as (
    select * from public.tt_siralama_tablosu(p_oyun, v_bas, v_son)
  )
  select jsonb_build_object(
    'baslangic', v_bas,
    'bitis',     v_son,
    'kesin',     public.tt_bugun() > v_son + 1,
    'oyuncu_sayisi', (select count(*) from sirali),
    'liste', coalesce((
      select jsonb_agg(jsonb_build_object('sira', s.sira, 'ad', y.ad, 'ad_turu', y.ad_turu, 'kimlik', y.kimlik,
                                          'puan', s.puan, 'oyun', s.oyun, 'ben', coalesce(s.uid = v_uid, false))
                       order by s.sira, y.ad)
        from (select * from sirali order by sira limit 50) s join public.tt_oyuncular y on y.uid = s.uid
    ), '[]'::jsonb),
    'ben', (select jsonb_build_object('sira', s.sira, 'puan', s.puan, 'oyun', s.oyun, 'kimlik', y.kimlik)
              from sirali s join public.tt_oyuncular y on y.uid = s.uid where s.uid = v_uid)
  ) into v_sonuc;
  return v_sonuc;
end;
$$;

-- Geçen haftanın şampiyonları: her oyunda ilk üç sıra (eşitlikte üçten fazla oyuncu olabilir).
create function tt_sampiyonlar()
returns jsonb
language sql stable security definer set search_path = public
as $$
  with h as (
    select public.tt_hafta_basi(public.tt_bugun()) - 7 as bas
  )
  select jsonb_build_object(
    'baslangic', h.bas,
    'bitis',     h.bas + 6,
    'kesin',     public.tt_bugun() > h.bas + 7,
    'kelime', coalesce((
      select jsonb_agg(jsonb_build_object('sira', s.sira, 'ad', y.ad, 'ad_turu', y.ad_turu, 'kimlik', y.kimlik, 'puan', s.puan)
                       order by s.sira, y.ad)
        from public.tt_siralama_tablosu('kelime', h.bas, h.bas + 6) s join public.tt_oyuncular y on y.uid = s.uid
        where s.sira <= 3
    ), '[]'::jsonb),
    'quiz', coalesce((
      select jsonb_agg(jsonb_build_object('sira', s.sira, 'ad', y.ad, 'ad_turu', y.ad_turu, 'kimlik', y.kimlik, 'puan', s.puan)
                       order by s.sira, y.ad)
        from public.tt_siralama_tablosu('quiz', h.bas, h.bas + 6) s join public.tt_oyuncular y on y.uid = s.uid
        where s.sira <= 3
    ), '[]'::jsonb)
  )
  from h;
$$;

-- Oyuncunun bir haftası (p_tarih haftanın bir günü; varsayılan bu hafta): iki oyundaki sırası ve puanı,
-- oynadığı her soru ve kelimenin sonucu, süresi ve puanı. Tahminler ve seçilen şık dönmez. Adı reddedilen
-- oyuncunun sayfası yalnızca kendisine açılır.
create function tt_oyuncu_haftasi(p_kimlik uuid, p_tarih date default null)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid text := public.tt_firebase_uid();
  v_o   public.tt_oyuncular%rowtype;
  v_bas date := public.tt_hafta_basi(
                  greatest(least(coalesce(p_tarih, public.tt_bugun()), public.tt_bugun()), public.tt_saklama_basi()));
  v_son date := v_bas + 6;
  v_ben boolean;
begin
  select * into v_o from public.tt_oyuncular where kimlik = p_kimlik;
  if not found then
    raise exception 'oyuncu_yok';
  end if;
  v_ben := coalesce(v_o.uid = v_uid, false);
  if v_o.durum = 'red' and not v_ben then
    raise exception 'oyuncu_yok';
  end if;

  return jsonb_build_object(
    'ad',        v_o.ad,
    'ad_turu',   v_o.ad_turu,
    'ben',       v_ben,
    'baslangic', v_bas,
    'bitis',     v_son,
    'kesin',     public.tt_bugun() > v_son + 1,
    'kelime', (select jsonb_build_object('sira', s.sira, 'puan', s.puan, 'oyun', s.oyun, 'oyuncu_sayisi', s.n)
                 from (select t.*, count(*) over () as n from public.tt_siralama_tablosu('kelime', v_bas, v_son) t) s
                 where s.uid = v_o.uid),
    'quiz',   (select jsonb_build_object('sira', s.sira, 'puan', s.puan, 'oyun', s.oyun, 'oyuncu_sayisi', s.n)
                 from (select t.*, count(*) over () as n from public.tt_siralama_tablosu('quiz', v_bas, v_son) t) s
                 where s.uid = v_o.uid),
    'kelimeler', coalesce((
      select jsonb_agg(jsonb_build_object(
               'tarih',  k.tarih,
               'slot',   k.slot,
               'durum',  case when k.durum = 'devam' and now() > k.baslangic + interval '92 seconds' then 'kaybetti' else k.durum end,
               'deneme', coalesce(array_length(k.tahminler, 1), 0),
               'sure',   case when k.durum <> 'devam' then round(extract(epoch from k.bitis - k.baslangic))::int
                              when now() > k.baslangic + interval '92 seconds' then 90 end,
               'puan',   k.puan)
             order by k.tarih, array_position(array['sabah','oglen','aksam'], k.slot))
        from public.kb_puanlar k
        where k.uid = v_o.uid and k.tarih between v_bas and v_son
    ), '[]'::jsonb),
    'sorular', coalesce((
      select jsonb_agg(jsonb_build_object(
               'tarih', q.tarih,
               'sira',  q.sira,
               'durum', case when q.cevap_zamani is null and now() > q.baslangic + interval '32 seconds' then 'sure_doldu'
                             when q.cevap_zamani is null then 'devam'
                             when q.secim is null then 'sure_doldu'
                             when q.dogru then 'dogru' else 'yanlis' end,
               'sure',  case when q.cevap_zamani is not null then round(extract(epoch from q.cevap_zamani - q.baslangic))::int
                             when now() > q.baslangic + interval '32 seconds' then 30 end,
               'puan',  q.puan)
             order by q.tarih, q.sira)
        from public.tt_quiz_puanlari q
        where q.uid = v_o.uid and q.tarih between v_bas and v_son
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function kb_gun(date) from public;
revoke all on function tt_sampiyonlar() from public;
revoke all on function tt_oyuncu_haftasi(uuid, date) from public;
grant execute on function kb_gun(date) to anon, authenticated;
grant execute on function tt_sampiyonlar() to anon, authenticated;
grant execute on function tt_oyuncu_haftasi(uuid, date) to anon, authenticated;
