import { test } from 'node:test'
import assert from 'node:assert/strict'

const { adHazirla } = await import('../src/lib/oyuncuAdi.ts')

test('Instagram adı @ ile ve küçük harfle saklanır', () => {
  assert.deepEqual(adHazirla('instagram', '  Mindmash.TR '), { ad: '@mindmash.tr' })
  assert.deepEqual(adHazirla('instagram', '@deneme_1'), { ad: '@deneme_1' })
  assert.deepEqual(adHazirla('instagram', 'https://www.instagram.com/mindmash.tr/'), { ad: '@mindmash.tr' })
})

test('geçersiz Instagram adı hata verir', () => {
  assert.ok('hata' in adHazirla('instagram', '@'))
  assert.ok('hata' in adHazirla('instagram', 'boşluk var'))
  assert.ok('hata' in adHazirla('instagram', '@çağrı'))
  assert.ok('hata' in adHazirla('instagram', '@' + 'a'.repeat(31)))
})

test('Facebook adı Türkçe harf ve boşluk alır', () => {
  assert.deepEqual(adHazirla('facebook', ' Çağrı   Işık '), { ad: 'Çağrı Işık' })
  assert.deepEqual(adHazirla('facebook', "Ali O'Neil-Şen"), { ad: "Ali O'Neil-Şen" })
  assert.ok('hata' in adHazirla('facebook', 'A'))
  assert.ok('hata' in adHazirla('facebook', 'Ali 123'))
  assert.ok('hata' in adHazirla('facebook', ''))
})
