-- Mindmash: sıralamadan çıkıp aynı gün yeniden katılan oyuncu o günün soru ve kelimelerini yeniden
-- puanlı oynayamaz. Çıkışta (tt_oyuncu_sil: sıralamadan çıkma ve hesap silme) puanlar silinir; o gün
-- yeniden süre başlatılmasın diye kullanıcı kimliğinin özeti (sha256, geri çevrilemez) gün sonuna
-- kadar tutulur. Eski özetler bir sonraki çıkışta silinir.

create table tt_siralama_cikislari (
  uid_ozet  text not null,   -- encode(sha256(uid), 'hex')
  tarih     date not null,   -- çıkış günü (Türkiye saati)
  primary key (uid_ozet, tarih)
);
alter table tt_siralama_cikislari enable row level security;
revoke all on tt_siralama_cikislari from anon, authenticated;

-- Oyuncu bugün sıralamadan çıktı mı.
create function tt_bugun_cikti(p_uid text)
returns boolean
language sql stable set search_path = public
as $$
  select exists (
    select 1 from public.tt_siralama_cikislari
    where uid_ozet = encode(sha256(convert_to(p_uid, 'UTF8')), 'hex')
      and tarih = (now() at time zone 'Europe/Istanbul')::date
  );
$$;
revoke all on function tt_bugun_cikti(text) from public, anon, authenticated;

-- Oyuncunun adını ve bütün puanlarını siler (sıralamadan çıkma ve hesap silme); çıkış günü işaretlenir.
create or replace function tt_oyuncu_sil()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid text := public.tt_firebase_uid();
begin
  if v_uid is null then
    raise exception 'giris_gerekli';
  end if;
  delete from public.tt_siralama_cikislari where tarih < (now() at time zone 'Europe/Istanbul')::date;
  if exists (select 1 from public.tt_oyuncular where uid = v_uid) then
    insert into public.tt_siralama_cikislari (uid_ozet, tarih)
      values (encode(sha256(convert_to(v_uid, 'UTF8')), 'hex'), (now() at time zone 'Europe/Istanbul')::date)
    on conflict do nothing;
  end if;
  delete from public.tt_oyuncular where uid = v_uid;
end;
$$;

-- Süre başlatma: bugün sıralamadan çıkmış oyuncuya 'gun_disi' döner (istemci soruyu süresiz oynatır).
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
      and tarih <= (now() at time zone 'Europe/Istanbul')::date
      and (acilis is null or acilis <= now());
  if not found then
    raise exception 'soru_yok';
  end if;

  select * into v_p from public.tt_quiz_puanlari
    where uid = v_uid and tarih = p_tarih and sira = p_sira for update;
  if not found then
    if p_tarih <> (now() at time zone 'Europe/Istanbul')::date or public.tt_bugun_cikti(v_uid) then
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
      and p_tarih <= (now() at time zone 'Europe/Istanbul')::date;
  if not found then
    raise exception 'bulmaca_yok';
  end if;

  select * into v_k from public.kb_puanlar
    where uid = v_uid and tarih = p_tarih and slot = p_slot for update;
  if not found then
    if p_tarih <> (now() at time zone 'Europe/Istanbul')::date or public.tt_bugun_cikti(v_uid) then
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
