import { gunEkle } from './tarih'
import { DENEME_SAYISI } from './harfler'

/** Bitmiş bir kelime oyununun özeti; günde üç kelimenin her biri ayrı oyundur. */
export interface OyunOzeti {
  tarih: string
  deneme: number
  kazandi: boolean
}

export interface Istatistik {
  oynanan: number
  kazanilan: number
  oran: number
  seri: number
  enIyiSeri: number
  dagilim: number[] // 1..6 denemede kazanılan oyun sayısı (indeks 0 = 1. deneme)
}

export function istatistikHesapla(oyunlar: OyunOzeti[], bugun: string): Istatistik {
  const dagilim = Array<number>(DENEME_SAYISI).fill(0)
  const kazanilanGunler = new Set<string>()
  let kazanilan = 0
  for (const o of oyunlar) {
    if (!o.kazandi) continue
    kazanilan++
    kazanilanGunler.add(o.tarih)
    dagilim[o.deneme - 1]++
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
    oynanan: oyunlar.length,
    kazanilan,
    oran: oyunlar.length ? Math.round((kazanilan / oyunlar.length) * 100) : 0,
    seri,
    enIyiSeri,
    dagilim,
  }
}
