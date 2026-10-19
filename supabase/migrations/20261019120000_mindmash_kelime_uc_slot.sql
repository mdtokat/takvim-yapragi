-- Mindmash: günde 3 kelime. Her kelime bir videoya (sabah 08:00, öğlen 12:00, akşam 19:00) bağlıdır
-- ve o videonun yayın saatinde açılır. Cevap yine istemciye gelmez.
-- Eski istemciler (tek kelime) çalışmaya devam etsin diye eski imzalar sabah kelimesine yönlendirilir.
-- Göç hiçbir sütun veya fonksiyon silmez: eski video_slot sütunu kullanılmaz, boş kalır.

-- ===== Bulmacalar: tarih + slot =====
alter table kb_bulmacalar
  add column if not exists slot   text,
  add column if not exists acilis timestamptz;

-- Var olan kayıtlar sabah kelimesi olur. Başlamış günler (bugün dahil) gece yarısı açık kalır,
-- gelecek günler 08:00'de açılır.
update kb_bulmacalar set
  slot = 'sabah',
  acilis = case
    when tarih <= (now() at time zone 'Europe/Istanbul')::date then (tarih::timestamp at time zone 'Europe/Istanbul')
    else ((tarih + time '08:00') at time zone 'Europe/Istanbul')
  end
where slot is null;

alter table kb_bulmacalar
  alter column slot set not null,
  alter column acilis set not null,
  add constraint kb_bulmacalar_slot_check check (slot in ('sabah','oglen','aksam')),
  drop constraint kb_bulmacalar_pkey,
  add primary key (tarih, slot);

-- Kelimenin videosu artık slotun kendisidir. video_baslik boşsa kelime videodan gelmemiştir
-- (plan okunamadı); istemci video ipucu göstermez.
comment on column kb_bulmacalar.video_slot is 'Kullanılmıyor (günde tek kelime dönemi); yerine slot.';

-- ===== Denemeler: oyun = kullanıcı + tarih + slot =====
alter table kb_denemeler add column if not exists slot text;
update kb_denemeler set slot = 'sabah' where slot is null;
alter table kb_denemeler
  alter column slot set not null,
  add constraint kb_denemeler_slot_check check (slot in ('sabah','oglen','aksam')),
  drop constraint kb_denemeler_pkey,
  add primary key (kullanici_id, tarih, slot, sira);

create index if not exists kb_denemeler_slot_idx on kb_denemeler (tarih, slot) where dogru;

-- ===== Bugünün kelimeleri: yalnızca slot, açılış saati ve açık olanın video başlığı =====
create or replace function kb_bugun()
returns jsonb
language sql stable security definer set search_path = public
as $$
  with b as (
    select * from public.kb_bulmacalar
    where tarih = (now() at time zone 'Europe/Istanbul')::date
  )
  select jsonb_build_object(
    'tarih', (now() at time zone 'Europe/Istanbul')::date,
    'slotlar', coalesce((
      select jsonb_agg(jsonb_build_object(
               'slot', b.slot,
               'acilis', b.acilis,
               'acik', b.acilis <= now(),
               'video_baslik', case when b.acilis <= now() then b.video_baslik end)
             order by b.acilis)
      from b), '[]'::jsonb),
    -- eski istemciler için
    'hazir', exists (select 1 from b where b.slot = 'sabah' and b.acilis <= now()),
    'video_slot', null
  );
$$;
revoke all on function kb_bugun() from public;
grant execute on function kb_bugun() to anon, authenticated;

-- ===== Tahmin =====
create function kb_tahmin(p_tahmin text, p_slot text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_tarih    date := (now() at time zone 'Europe/Istanbul')::date;
  v_b        public.kb_bulmacalar%rowtype;
  v_adet     int;
  v_cozuldu  boolean;
  v_sonuc    text[] := array['gri','gri','gri','gri','gri'];
  v_kalan    text[] := array[]::text[];
  v_harf     text;
  v_dogru    boolean;
  v_bitti    boolean;
  i int; j int;
begin
  if auth.uid() is null then
    raise exception 'oturum_gerekli';
  end if;
  if p_tahmin is null or p_tahmin !~ '^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{5}$' then
    raise exception 'gecersiz_bicim';
  end if;

  -- Videosu yayınlanmamış kelime oynanamaz.
  select * into v_b from public.kb_bulmacalar
    where tarih = v_tarih and slot = p_slot and acilis <= now();
  if not found then
    raise exception 'bulmaca_yok';
  end if;

  select count(*), coalesce(bool_or(dogru), false)
    into v_adet, v_cozuldu
    from public.kb_denemeler
    where kullanici_id = auth.uid() and tarih = v_tarih and slot = p_slot;
  if v_cozuldu or v_adet >= 6 then
    raise exception 'oyun_bitti';
  end if;

  if not exists (select 1 from public.kb_sozluk where kelime = p_tahmin) then
    return jsonb_build_object('gecerli', false);
  end if;

  for i in 1..5 loop
    if substr(p_tahmin, i, 1) = substr(v_b.cevap, i, 1) then
      v_sonuc[i] := 'yesil';
    else
      v_kalan := v_kalan || substr(v_b.cevap, i, 1);
    end if;
  end loop;

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
  v_bitti := v_dogru or v_adet + 1 >= 6;

  insert into public.kb_denemeler (kullanici_id, tarih, slot, sira, tahmin, sonuc, dogru)
  values (auth.uid(), v_tarih, p_slot, v_adet + 1, p_tahmin, to_jsonb(v_sonuc), v_dogru);

  return jsonb_build_object(
    'gecerli', true,
    'tarih',   v_tarih,
    'slot',    p_slot,
    'sonuc',   to_jsonb(v_sonuc),
    'dogru',   v_dogru,
    'deneme',  v_adet + 1,
    'bitti',   v_bitti,
    'cevap',   case when v_bitti then v_b.cevap end,
    'anlam',   case when v_bitti then v_b.anlam end,
    'ornek',   case when v_bitti then v_b.ornek_cumle end
  );
end;
$$;
revoke all on function kb_tahmin(text, text) from public, anon;
grant execute on function kb_tahmin(text, text) to authenticated;

-- ===== Bitiş bilgisi: oyun bittiyse (veya gün geçtiyse) cevap, anlam ve video =====
create function kb_bitis_bilgisi(p_tarih date, p_slot text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_bitti boolean;
  v_b public.kb_bulmacalar%rowtype;
begin
  if auth.uid() is null then
    return null;
  end if;
  select coalesce(bool_or(dogru), false) or count(*) >= 6 into v_bitti
    from public.kb_denemeler
    where kullanici_id = auth.uid() and tarih = p_tarih and slot = p_slot;
  if not v_bitti and p_tarih >= v_bugun then
    return null;
  end if;
  select * into v_b from public.kb_bulmacalar where tarih = p_tarih and slot = p_slot;
  if not found then
    return null;
  end if;
  return jsonb_build_object('cevap', v_b.cevap, 'anlam', v_b.anlam, 'ornek', v_b.ornek_cumle,
                            'slot', v_b.slot, 'video_baslik', v_b.video_baslik);
end;
$$;
revoke all on function kb_bitis_bilgisi(date, text) from public, anon;
grant execute on function kb_bitis_bilgisi(date, text) to authenticated;

-- ===== Genel dağılım (kimlik açmadan) =====
create function kb_dagilim(p_tarih date, p_slot text)
returns table (deneme smallint, oyuncu bigint)
language sql stable security definer set search_path = public
as $$
  select d.sira, count(*)::bigint
  from public.kb_denemeler d
  where d.tarih = p_tarih and d.slot = p_slot and d.dogru
    and p_tarih <= (now() at time zone 'Europe/Istanbul')::date
  group by d.sira
  union all
  select 0::smallint, count(*)::bigint from (
    select kullanici_id from public.kb_denemeler
    where tarih = p_tarih and slot = p_slot
    group by kullanici_id
    having count(*) = 6 and not bool_or(dogru)
  ) x;
$$;
revoke all on function kb_dagilim(date, text) from public;
grant execute on function kb_dagilim(date, text) to anon, authenticated;

-- ===== Eski istemciler: tek kelime = sabah kelimesi (aynı imzalar yerinde değiştirilir) =====
create or replace function kb_tahmin(p_tahmin text)
returns jsonb
language sql security definer set search_path = public
as $$ select public.kb_tahmin(p_tahmin, 'sabah'); $$;
revoke all on function kb_tahmin(text) from public, anon;
grant execute on function kb_tahmin(text) to authenticated;

create or replace function kb_bitis_bilgisi(p_tarih date)
returns jsonb
language sql stable security definer set search_path = public
as $$ select public.kb_bitis_bilgisi(p_tarih, 'sabah'); $$;
revoke all on function kb_bitis_bilgisi(date) from public, anon;
grant execute on function kb_bitis_bilgisi(date) to authenticated;

create or replace function kb_dagilim(p_tarih date)
returns table (deneme smallint, oyuncu bigint)
language sql stable security definer set search_path = public
as $$ select * from public.kb_dagilim(p_tarih, 'sabah'); $$;
revoke all on function kb_dagilim(date) from public;
grant execute on function kb_dagilim(date) to anon, authenticated;
