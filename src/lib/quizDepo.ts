import { useEffect } from 'react'
import { oku, yaz } from './depo'
import { bulutaBildir, depoDegisti } from './senkron'
import { gunEkle, bugun } from './tarih'
import type { GunVerisi, QuizPlani, QuizSorusu } from './tipler'

export interface QuizKaydi {
  cevaplar: (number | null)[] // sira - 1 konumunda seçilen indeks; açılmamış veya cevaplanmamış soru null
  dogru: number
  cozulme: string // son cevabın verildiği gün; seri yalnızca o gün tamamlanan quizleri sayar
  guncelleme?: number // ms; hesap eşitlemesi için (eski kayıtlarda yok)
}

const ANAHTAR = 'quiz-sonuclari'
type Kayitlar = Record<string, QuizKaydi>

export const quizKayitlari = () => oku<Kayitlar>(ANAHTAR, {})
export const quizKaydi = (tarih: string) => quizKayitlari()[tarih] ?? null

export function quizKaydet(tarih: string, kayit: QuizKaydi) {
  const k = quizKayitlari()
  kayit = { ...kayit, guncelleme: Date.now() }
  k[tarih] = kayit
  yaz(ANAHTAR, k)
  depoDegisti()
  bulutaBildir('quiz', tarih, kayit)
}

export const cevapSayisi = (k: QuizKaydi | null) => (k ? k.cevaplar.filter((c) => c !== null && c !== undefined).length : 0)

/** Buluttan gelen kayıtları birleştirir (daha çok cevaplı olan kalır); yerelde daha ileri olanların tarihlerini döner. */
export function quizBirlestir(bulut: Kayitlar): string[] {
  const yerel = quizKayitlari()
  for (const [tarih, kayit] of Object.entries(bulut)) if (cevapSayisi(kayit) > cevapSayisi(yerel[tarih] ?? null)) yerel[tarih] = kayit
  yaz(ANAHTAR, yerel)
  return Object.keys(yerel).filter((t) => cevapSayisi(yerel[t]) > cevapSayisi(bulut[t] ?? null))
}

export const quizDeposunuTemizle = () => yaz(ANAHTAR, {})
export const quizTamam = (k: QuizKaydi | null) => cevapSayisi(k) >= 3

/** Bugün veya dün biten, art arda tamamlanmış günlerin sayısı. */
export function seri(): number {
  const k = quizKayitlari()
  const sayilir = (g: string) => !!k[g] && k[g].cozulme === g && quizTamam(k[g])
  let gun = bugun()
  if (!sayilir(gun)) gun = gunEkle(gun, -1)
  let n = 0
  while (sayilir(gun)) {
    n++
    gun = gunEkle(gun, -1)
  }
  return n
}

export interface SoruDurumu extends QuizPlani {
  soru: QuizSorusu | null // null: videosu henüz yayınlanmadı
}

/** Günün üç sorusunun durumu, sıra numarasına göre. Açılış fonksiyonu yoksa açılmış sorulardan türetilir. */
export function soruDurumlari(veri: GunVerisi | null): SoruDurumu[] {
  if (!veri) return []
  const plan: QuizPlani[] = veri.plan?.length
    ? veri.plan
    : veri.quiz.map((q) => ({ sira: q.sira, slot: q.slot ?? null, acilis: q.acilis ?? null }))
  return plan.map((p) => ({ ...p, soru: veri.quiz.find((q) => q.sira === p.sira) ?? null }))
}

export const cevabi = (k: QuizKaydi | null, d: SoruDurumu) => k?.cevaplar[d.sira - 1] ?? null

/** Kilitli bir sorunun açılış saati gelince (ve uygulama öne gelince) yenile çağrılır. */
export function useAcilisYenile(durumlar: SoruDurumu[], yenile: () => void) {
  const anahtar = durumlar.map((d) => `${d.sira}:${d.acilis}:${d.soru ? 1 : 0}`).join('|')
  useEffect(() => {
    const kilitli = durumlar.filter((d) => !d.soru)
    if (!kilitli.length) return
    const kalan = kilitli
      .map((d) => (d.acilis ? Date.parse(d.acilis) - Date.now() : NaN))
      .filter((ms) => ms > 0)
    const t = kalan.length ? setTimeout(yenile, Math.min(Math.min(...kalan) + 1500, 2 ** 31 - 1)) : undefined
    const gorunur = () => document.visibilityState === 'visible' && yenile()
    document.addEventListener('visibilitychange', gorunur)
    return () => {
      if (t) clearTimeout(t)
      document.removeEventListener('visibilitychange', gorunur)
    }
  }, [anahtar])
}
