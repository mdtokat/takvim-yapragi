-- Mindmash: günün soruları ve kelimesi o günün Reels videolarına bağlanır.
-- Eski kayıtlar (slot ve acilis boş) eskisi gibi gece yarısı açılır.

-- ===== Günün soruları: video kaynağı ve açılış saati =====
alter table tt_quiz
  add column if not exists slot         text check (slot in ('sabah','oglen','aksam')),
  add column if not exists acilis       timestamptz,
  add column if not exists video_baslik text check (char_length(video_baslik) <= 120),
  add column if not exists video_url    text check (video_url like 'https://%'),
  add column if not exists kaynak_url   text check (kaynak_url like 'https://%');

-- Soru, videosunun yayın saatinden önce istemciye gelmez.
alter policy tt_quiz_oku on tt_quiz
  using (tarih <= (now() at time zone 'Europe/Istanbul')::date
         and (acilis is null or acilis <= now()));

-- Kilitli soruların yalnızca saatini gösterir (soru metni ve seçenekler dönmez).
create or replace function tt_quiz_takvimi(p_tarih date)
returns table(sira smallint, slot text, acilis timestamptz)
language sql stable security definer set search_path = public
as $$
  select q.sira, q.slot, q.acilis from public.tt_quiz q
  where q.tarih = p_tarih
    and p_tarih <= (now() at time zone 'Europe/Istanbul')::date
  order by q.sira;
$$;
revoke all on function tt_quiz_takvimi(date) from public;
grant execute on function tt_quiz_takvimi(date) to anon, authenticated;

-- ===== Günün kelimesi: hangi videoda geçtiği =====
alter table kb_bulmacalar
  add column if not exists video_slot   text check (video_slot in ('sabah','oglen','aksam')),
  add column if not exists video_baslik text check (char_length(video_baslik) <= 120);

-- İpucu olarak yalnızca videonun slotu döner; cevap dönmez.
create or replace function kb_bugun()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'tarih', (now() at time zone 'Europe/Istanbul')::date,
    'hazir', b.tarih is not null,
    'video_slot', b.video_slot
  )
  from (select 1) x
  left join public.kb_bulmacalar b on b.tarih = (now() at time zone 'Europe/Istanbul')::date;
$$;

create or replace function kb_bitis_bilgisi(p_tarih date)
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
    from public.kb_denemeler where kullanici_id = auth.uid() and tarih = p_tarih;
  if not v_bitti and p_tarih >= v_bugun then
    return null;
  end if;
  select * into v_b from public.kb_bulmacalar where tarih = p_tarih;
  if not found then
    return null;
  end if;
  return jsonb_build_object('cevap', v_b.cevap, 'anlam', v_b.anlam, 'ornek', v_b.ornek_cumle,
                            'video_slot', v_b.video_slot, 'video_baslik', v_b.video_baslik);
end;
$$;
