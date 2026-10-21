-- Mindmash: dün ve hafta göçünün (20261021120000_mindmash_dun_ve_hafta.sql) silme içeren kısmı.
-- * Sıralamadan çıkış günü iki gün tutulur: çıkan oyuncu dünün içeriğini de yeniden puanlı oynayamaz.
-- * Puanlar iki hafta (geçen hafta ve bu hafta) tutulur; daha eskisini pg_cron her gece 00:05'te siler.
-- * tt_bugun_cikti yerini tt_puanli_gun'e bıraktı.

-- ===== Sıralamadan çıkış: çıkış günü iki gün tutulur (dünün içeriği de engellenir) =====
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
  delete from public.tt_siralama_cikislari where tarih < public.tt_bugun() - 1;
  if exists (select 1 from public.tt_oyuncular where uid = v_uid) then
    insert into public.tt_siralama_cikislari (uid_ozet, tarih)
      values (encode(sha256(convert_to(v_uid, 'UTF8')), 'hex'), public.tt_bugun())
    on conflict do nothing;
  end if;
  delete from public.tt_oyuncular where uid = v_uid;
end;
$$;

drop function tt_bugun_cikti(text);

-- ===== İki haftalık saklama =====
-- Geçen haftanın cumasından eski puanlar ve iki günden eski çıkış kayıtları silinir. Silinen oyuncunun
-- puanları zaten cascade ile gider.
create function tt_eski_puanlari_sil()
returns void
language sql security definer set search_path = public
as $$
  delete from public.tt_quiz_puanlari where tarih < public.tt_saklama_basi();
  delete from public.kb_puanlar where tarih < public.tt_saklama_basi();
  delete from public.tt_siralama_cikislari where tarih < public.tt_bugun() - 1;
$$;
revoke all on function tt_eski_puanlari_sil() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
-- Her gece 00:05 (Türkiye saati, UTC+3).
select cron.schedule('mindmash-eski-puanlar', '5 21 * * *', 'select public.tt_eski_puanlari_sil()');
