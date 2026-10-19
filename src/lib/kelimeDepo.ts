import { oku, yaz } from './depo'
import { bulutaBildir, depoDegisti } from './senkron'
import type { Durum } from './harfler'
import type { Slot } from './sabitler'

/** Bir kelimenin oyunu. Cevap yalnızca oyun bitince (bitis) kayda girer. */
export interface KelimeKaydi {
  tarih: string
  slot: Slot
  tahminler: string[]
  sonuclar: Durum[][]
  durum: 'devam' | 'kazandi' | 'kaybetti'
  zorMod: boolean
  bitis: { cevap: string; anlam: string; ornek: string; videoBaslik: string | null } | null
  guncelleme: number // ms; eşitlemede hangi kaydın yeni olduğunu gösterir
}

const ANAHTAR = 'kelime-oyunlari'
type Kayitlar = Record<string, KelimeKaydi>

/** Bulutta da belge kimliği olarak kullanılır ("2026-10-19_sabah"). */
export const kelimeAnahtari = (tarih: string, slot: Slot) => `${tarih}_${slot}`

export const kelimeKayitlari = () => oku<Kayitlar>(ANAHTAR, {})
export const kelimeKaydi = (tarih: string, slot: Slot): KelimeKaydi | null => kelimeKayitlari()[kelimeAnahtari(tarih, slot)] ?? null

export function kelimeKaydet(kayit: KelimeKaydi) {
  const k = kelimeKayitlari()
  const anahtar = kelimeAnahtari(kayit.tarih, kayit.slot)
  k[anahtar] = kayit
  yaz(ANAHTAR, k)
  depoDegisti()
  bulutaBildir('kelime', anahtar, kayit)
}

/** Oyunlar yalnızca ilerler: daha çok tahmini olan kayıt daha günceldir. */
export const kelimeDahaIleri = (a: KelimeKaydi, b: KelimeKaydi | undefined) => !b || a.tahminler.length > b.tahminler.length

/** Buluttan gelen kayıtları birleştirir; buluta geri yazılmaz. Yerelde daha ileri olanların anahtarlarını döner. */
export function kelimeBirlestir(bulut: Kayitlar): string[] {
  const yerel = kelimeKayitlari()
  for (const [anahtar, kayit] of Object.entries(bulut)) if (kelimeDahaIleri(kayit, yerel[anahtar])) yerel[anahtar] = kayit
  yaz(ANAHTAR, yerel)
  return Object.keys(yerel).filter((a) => kelimeDahaIleri(yerel[a], bulut[a]))
}

export const kelimeDeposunuTemizle = () => yaz(ANAHTAR, {})
