-- Oyuncunun adını ve bütün puanlarını siler (sıralamadan çıkma ve hesap silme).
create function tt_oyuncu_sil()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid text := public.tt_firebase_uid();
begin
  if v_uid is null then
    raise exception 'giris_gerekli';
  end if;
  delete from public.tt_oyuncular where uid = v_uid;
end;
$$;
revoke all on function tt_oyuncu_sil() from public;
grant execute on function tt_oyuncu_sil() to anon, authenticated;
