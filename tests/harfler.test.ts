import { test } from 'node:test'
import assert from 'node:assert/strict'
import { harfNormalle, harfDurumlari, zorModHatasi } from '../src/lib/harfler.ts'

test('Türkçe büyük harf dönüşümü', () => {
  assert.equal(harfNormalle('i'), 'İ')
  assert.equal(harfNormalle('ı'), 'I')
  assert.equal(harfNormalle('ş'), 'Ş')
  assert.equal(harfNormalle('â'), 'A')
  assert.equal(harfNormalle('î'), 'İ')
  assert.equal(harfNormalle('q'), null)
  assert.equal(harfNormalle('1'), null)
})

test('klavye en iyi durumu tutar', () => {
  const d = harfDurumlari([
    { tahmin: 'KAKAO', sonuc: ['yesil', 'yesil', 'gri', 'gri', 'gri'] },
    { tahmin: 'ELLER', sonuc: ['gri', 'gri', 'yesil', 'yesil', 'gri'] },
  ])
  assert.equal(d.K, 'yesil')
  assert.equal(d.L, 'yesil')
  assert.equal(d.O, 'gri')
})

test('zor mod kuralları', () => {
  const satirlar = [{ tahmin: 'LAMEK', sonuc: ['sari', 'yesil', 'sari', 'yesil', 'sari'] as const }]
  const s = satirlar.map((x) => ({ tahmin: x.tahmin, sonuc: [...x.sonuc] }))
  assert.equal(zorModHatasi('KALEM', s), null)
  assert.equal(zorModHatasi('KELAM', s), '2. harf A olmalı')
  assert.equal(zorModHatasi('SAPEK', s), 'Tahminde L harfi bulunmalı')
})
