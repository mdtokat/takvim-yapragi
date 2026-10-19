-- Mindmash: kullanıcı hesapları ve oyun durumu Firebase'e taşındı. Supabase yalnızca içeriği tutar
-- ve kullanıcıyı tanımaz. Kelime tahmini durumsuz bir fonksiyonla değerlendirilir: istemci o kelime
-- için yaptığı bütün tahminleri gönderir, sunucu renkleri döner. Cevap yalnızca oyun bitince döner.
-- Eski istemciler için kb_tahmin, kb_bitis_bilgisi ve kb_denemeler olduğu gibi kalır.

create function kb_degerlendir(p_tarih date, p_slot text, p_tahminler text[])
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_b        public.kb_bulmacalar%rowtype;
  v_adet     int := coalesce(array_length(p_tahminler, 1), 0);
  v_tahmin   text;
  v_sonuc    text[];
  v_kalan    text[];
  v_harf     text;
  v_sonuclar jsonb := '[]'::jsonb;
  v_dogru    boolean := false;
  v_bitti    boolean;
  i int; j int; k int;
begin
  if v_adet < 1 or v_adet > 6 then
    raise exception 'gecersiz_bicim';
  end if;

  -- Yalnızca bugünün veya geçmiş günlerin, videosu yayınlanmış kelimesi değerlendirilir.
  select * into v_b from public.kb_bulmacalar
    where tarih = p_tarih and slot = p_slot and acilis <= now()
      and p_tarih <= (now() at time zone 'Europe/Istanbul')::date;
  if not found then
    raise exception 'bulmaca_yok';
  end if;

  for k in 1..v_adet loop
    v_tahmin := p_tahminler[k];
    if v_tahmin is null or v_tahmin !~ '^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{5}$' then
      raise exception 'gecersiz_bicim';
    end if;
    -- Doğru tahminden sonra tahmin yapılamaz.
    if v_dogru then
      raise exception 'oyun_bitti';
    end if;
    -- Sözlükte olmayan tahmin hak harcatmaz; istemci hangisi olduğunu öğrenir.
    if not exists (select 1 from public.kb_sozluk where kelime = v_tahmin) then
      return jsonb_build_object('gecerli', false, 'gecersiz', k);
    end if;

    v_sonuc := array['gri','gri','gri','gri','gri'];
    v_kalan := array[]::text[];
    for i in 1..5 loop
      if substr(v_tahmin, i, 1) = substr(v_b.cevap, i, 1) then
        v_sonuc[i] := 'yesil';
      else
        v_kalan := v_kalan || substr(v_b.cevap, i, 1);
      end if;
    end loop;
    for i in 1..5 loop
      if v_sonuc[i] <> 'yesil' then
        v_harf := substr(v_tahmin, i, 1);
        j := array_position(v_kalan, v_harf);
        if j is not null then
          v_sonuc[i] := 'sari';
          v_kalan := v_kalan[1:j-1] || v_kalan[j+1:];
        end if;
      end if;
    end loop;

    v_sonuclar := v_sonuclar || jsonb_build_array(to_jsonb(v_sonuc));
    v_dogru := (v_tahmin = v_b.cevap);
  end loop;

  v_bitti := v_dogru or v_adet >= 6;
  return jsonb_build_object(
    'gecerli',      true,
    'tarih',        p_tarih,
    'slot',         p_slot,
    'sonuclar',     v_sonuclar,
    'dogru',        v_dogru,
    'bitti',        v_bitti,
    'cevap',        case when v_bitti then v_b.cevap end,
    'anlam',        case when v_bitti then v_b.anlam end,
    'ornek',        case when v_bitti then v_b.ornek_cumle end,
    'video_baslik', case when v_bitti then v_b.video_baslik end
  );
end;
$$;
revoke all on function kb_degerlendir(date, text, text[]) from public;
grant execute on function kb_degerlendir(date, text, text[]) to anon, authenticated;

-- Kelime önerisi girişsiz de yapılabilir (kullanıcı kimliği tutulmaz).
create policy kb_oneri_ekle_anonim on kb_kelime_onerileri for insert to anon
  with check (kullanici_id is null and durum = 'yeni');
