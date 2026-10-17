import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.TZ = 'Europe/Istanbul'
const { saatteMetni, trBugun, bulmacaNo, gunEkle } = await import('../src/lib/tarih.ts')

test('saatten sonra gelen bulunma eki', () => {
  assert.equal(saatteMetni('2026-10-17T08:00:00+03:00'), "08:00'de")
  assert.equal(saatteMetni('2026-10-17T12:00:00+03:00'), "12:00'de")
  assert.equal(saatteMetni('2026-10-17T19:00:00+03:00'), "19:00'da")
  assert.equal(saatteMetni('2026-10-17T13:00:00+03:00'), "13:00'te")
  assert.equal(saatteMetni('2026-10-17T10:00:00+03:00'), "10:00'da")
  assert.equal(saatteMetni('2026-10-17T20:00:00+03:00'), "20:00'de")
  assert.equal(saatteMetni('2026-10-17T19:30:00+03:00'), "19:30'da")
  assert.equal(saatteMetni('2026-10-17T19:40:00+03:00'), "19:40'ta")
  assert.equal(saatteMetni('2026-10-17T00:00:00+03:00'), "00:00'da")
})

test('Türkiye günü gece yarısında değişir', () => {
  assert.equal(trBugun(new Date('2026-10-17T20:59:00Z')), '2026-10-17')
  assert.equal(trBugun(new Date('2026-10-17T21:00:00Z')), '2026-10-18')
  assert.equal(bulmacaNo('2026-10-17'), 1)
  assert.equal(gunEkle('2026-12-31', 1), '2027-01-01')
})
