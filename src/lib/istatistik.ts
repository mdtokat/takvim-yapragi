import { gunEkle } from './tarih'
import { DENEME_SAYISI } from './harfler'

export interface DenemeKaydi {
  tarih: string
  slot: string
  sira: number
  dogru: boolean
}

export interface Istatistik {
  oynanan: number // biten oyun (günde üç kelimenin her biri ayrı oyundur)
  kazanilan: number
  oran: number
  seri: number
  enIyiSeri: number
  dagilim: number[] // 1..6 denemede kazanılan oyun sayısı (indeks 0 = 1. deneme)
}

export function istatistikHesapla(kayitlar: DenemeKaydi[], bugun: string): Istatistik {
  const oyunlar = new Map<string, { tarih: string; enBuyuk: number; kazanma: number | null }>()
  for (const k of kayitlar) {
    const anahtar = `${k.tarih}/${k.slot}`
    const o = oyunlar.get(anahtar) ?? { tarih: k.tarih, enBuyuk: 0, kazanma: null }
    o.enBuyuk = Math.max(o.enBuyuk, k.sira)
    if (k.dogru) o.kazanma = k.sira
    oyunlar.set(anahtar, o)
  }
  const dagilim = Array<number>(DENEME_SAYISI).fill(0)
  const kazanilanGunler = new Set<string>()
  let oynanan = 0
  let kazanilan = 0
  for (const o of oyunlar.values()) {
    const bitti = o.kazanma !== null || o.enBuyuk >= DENEME_SAYISI
    if (!bitti) continue
    oynanan++
    if (o.kazanma !== null) {
      kazanilan++
      kazanilanGunler.add(o.tarih)
      dagilim[o.kazanma - 1]++
    }
  }
  // Güncel seri: en az bir kelimenin bulunduğu art arda günler; bugün bulunmadıysa dünden geriye sayılır.
  let gun = kazanilanGunler.has(bugun) ? bugun : gunEkle(bugun, -1)
  let seri = 0
  while (kazanilanGunler.has(gun)) {
    seri++
    gun = gunEkle(gun, -1)
  }
  const sirali = [...kazanilanGunler].sort()
  let enIyiSeri = 0
  let uzunluk = 0
  sirali.forEach((t, i) => {
    uzunluk = i > 0 && gunEkle(sirali[i - 1], 1) === t ? uzunluk + 1 : 1
    enIyiSeri = Math.max(enIyiSeri, uzunluk)
  })
  return {
    oynanan,
    kazanilan,
    oran: oynanan ? Math.round((kazanilan / oynanan) * 100) : 0,
    seri,
    enIyiSeri,
    dagilim,
  }
}
