import { gunEkle } from './tarih'
import { DENEME_SAYISI } from './harfler'

export interface Istatistik {
  oynanan: number
  kazanilan: number
  oran: number
  seri: number
  enIyiSeri: number
  dagilim: number[] // 1..6 denemede kazanılan oyun sayısı (indeks 0 = 1. deneme)
}

export function istatistikHesapla(kayitlar: { tarih: string; sira: number; dogru: boolean }[], bugun: string): Istatistik {
  const gunler = new Map<string, { enBuyuk: number; kazanma: number | null }>()
  for (const k of kayitlar) {
    const g = gunler.get(k.tarih) ?? { enBuyuk: 0, kazanma: null }
    g.enBuyuk = Math.max(g.enBuyuk, k.sira)
    if (k.dogru) g.kazanma = k.sira
    gunler.set(k.tarih, g)
  }
  const dagilim = Array<number>(DENEME_SAYISI).fill(0)
  const kazanilanGunler = new Set<string>()
  let oynanan = 0
  for (const [tarih, g] of gunler) {
    const bitti = g.kazanma !== null || g.enBuyuk >= DENEME_SAYISI
    if (!bitti) continue
    oynanan++
    if (g.kazanma !== null) {
      kazanilanGunler.add(tarih)
      dagilim[g.kazanma - 1]++
    }
  }
  // Güncel seri: bugün kazanıldıysa bugünden, değilse dünden geriye doğru art arda kazanılan günler.
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
    kazanilan: kazanilanGunler.size,
    oran: oynanan ? Math.round((kazanilanGunler.size / oynanan) * 100) : 0,
    seri,
    enIyiSeri,
    dagilim,
  }
}
