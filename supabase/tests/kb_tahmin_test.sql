-- kb_tahmin birim testleri
-- Supabase SQL Editor'de çalıştır. Her şey tek işlemde yapılır ve sonunda geri alınır;
-- gerçek bulmacalara ve denemelere dokunulmaz. Bir test başarısız olursa hata mesajı
-- hangi testin bozulduğunu söyler. Hata yoksa tüm testler geçmiştir.

begin;

do $$
declare
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_a uuid := '00000000-0000-4000-8000-00000000000a';
  v_b uuid := '00000000-0000-4000-8000-00000000000b';
  v_c uuid := '00000000-0000-4000-8000-00000000000c';
  r jsonb;
  v_hata text;
  v_adet int;
  i int;
begin
  -- Hazırlık: bugünün bulmacası geçici olarak KALEM olur.
  insert into kb_sozluk (kelime) values ('KALEM'), ('KAKAO'), ('ELLER')
    on conflict do nothing;
  delete from kb_sozluk where kelime = 'ZZZZZ';
  delete from kb_denemeler where tarih = v_bugun;
  delete from kb_bulmacalar where tarih = v_bugun or cevap = 'KALEM';
  insert into kb_bulmacalar (tarih, cevap, zorluk, anlam, ornek_cumle)
    values (v_bugun, 'KALEM', 1, 'test anlamı', 'test cümlesi');

  -- 1. Oturum yoksa reddedilir.
  perform set_config('request.jwt.claims', '', true);
  begin
    perform kb_tahmin('KAKAO');
    v_hata := null;
  exception when others then v_hata := sqlerrm;
  end;
  assert v_hata = 'oturum_gerekli', format('1. oturumsuz tahmin: %s', v_hata);

  perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);

  -- 2. Biçim hatası: küçük harf, eksik harf, alfabe dışı harf.
  foreach v_hata in array array['kalem', 'KALE', 'KALEW'] loop
    begin
      perform kb_tahmin(v_hata);
      assert false, format('2. %s kabul edildi', v_hata);
    exception when raise_exception then
      assert sqlerrm = 'gecersiz_bicim', format('2. biçim hatası: %s', sqlerrm);
    end;
  end loop;

  -- 3. Sözlükte olmayan kelime deneme hakkı tüketmez.
  r := kb_tahmin('ZZZZZ');
  assert r = '{"gecerli": false}'::jsonb, format('3. sözlükte yok: %s', r);
  select count(*) into v_adet from kb_denemeler where kullanici_id = v_a and tarih = v_bugun;
  assert v_adet = 0, '3. geçersiz kelime deneme olarak kaydedildi';

  -- 4. Tekrarlanan harf: KAKAO / KALEM → yeşil yeşil gri gri gri
  r := kb_tahmin('KAKAO');
  assert r->'sonuc' = '["yesil","yesil","gri","gri","gri"]'::jsonb, format('4. KAKAO: %s', r->'sonuc');
  assert (r->>'deneme')::int = 1 and not (r->>'bitti')::boolean, format('4. KAKAO durum: %s', r);
  assert r->>'cevap' is null and r->>'anlam' is null, '4. cevap oyun bitmeden döndü';

  -- 5. Tekrarlanan harf: ELLER / KALEM → gri gri yeşil yeşil gri
  r := kb_tahmin('ELLER');
  assert r->'sonuc' = '["gri","gri","yesil","yesil","gri"]'::jsonb, format('5. ELLER: %s', r->'sonuc');
  assert (r->>'deneme')::int = 2, format('5. ELLER deneme: %s', r);

  -- 6. Doğru tahmin oyunu bitirir, cevabı ve anlamı döndürür; sonraki tahmin reddedilir.
  r := kb_tahmin('KALEM');
  assert (r->>'dogru')::boolean and (r->>'bitti')::boolean, format('6. KALEM: %s', r);
  assert r->'sonuc' = '["yesil","yesil","yesil","yesil","yesil"]'::jsonb, format('6. KALEM sonuç: %s', r);
  assert r->>'cevap' = 'KALEM' and r->>'anlam' = 'test anlamı' and r->>'ornek' = 'test cümlesi',
    format('6. bitiş bilgisi: %s', r);
  begin
    perform kb_tahmin('KAKAO');
    assert false, '6. çözülen oyunda yeni tahmin kabul edildi';
  exception when raise_exception then
    assert sqlerrm = 'oyun_bitti', format('6. çözüldükten sonra: %s', sqlerrm);
  end;

  -- 7. 6 deneme sınırı: 6. yanlış tahmin oyunu bitirir ve cevabı verir, 7. reddedilir.
  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  for i in 1..5 loop
    r := kb_tahmin('KAKAO');
    assert not (r->>'bitti')::boolean and r->>'cevap' is null, format('7. %s. deneme: %s', i, r);
  end loop;
  r := kb_tahmin('ELLER');
  assert (r->>'deneme')::int = 6 and (r->>'bitti')::boolean and not (r->>'dogru')::boolean,
    format('7. 6. deneme: %s', r);
  assert r->>'cevap' = 'KALEM', format('7. 6. denemede cevap: %s', r);
  begin
    perform kb_tahmin('KAKAO');
    assert false, '7. 7. deneme kabul edildi';
  exception when raise_exception then
    assert sqlerrm = 'oyun_bitti', format('7. 7. deneme: %s', sqlerrm);
  end;

  -- 8. Bulmaca yoksa bulmaca_yok döner.
  perform set_config('request.jwt.claims', json_build_object('sub', v_c, 'role', 'authenticated')::text, true);
  delete from kb_denemeler where tarih = v_bugun;
  delete from kb_bulmacalar where tarih = v_bugun;
  begin
    perform kb_tahmin('KAKAO');
    assert false, '8. bulmaca yokken tahmin kabul edildi';
  exception when raise_exception then
    assert sqlerrm = 'bulmaca_yok', format('8. bulmaca yok: %s', sqlerrm);
  end;

  raise notice 'kb_tahmin: tüm testler geçti';
end;
$$;

rollback;
