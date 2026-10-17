import { oku, yaz } from './depo'
import { gunEkle, bugun } from './tarih'

export interface QuizKaydi {
  cevaplar: number[] // her soru için seçilen indeks
  dogru: number
  cozulme: string // çözüldüğü gün; seri yalnızca o gün çözülen quizleri sayar
}

const ANAHTAR = 'quiz-sonuclari'
type Kayitlar = Record<string, QuizKaydi>

export const quizKayitlari = () => oku<Kayitlar>(ANAHTAR, {})
export const quizKaydi = (tarih: string) => quizKayitlari()[tarih] ?? null

export function quizKaydet(tarih: string, kayit: QuizKaydi) {
  const k = quizKayitlari()
  k[tarih] = kayit
  yaz(ANAHTAR, k)
}

/** Bugün veya dün biten, art arda çözülmüş günlerin sayısı. */
export function seri(): number {
  const k = quizKayitlari()
  let gun = bugun()
  if (!k[gun] || k[gun].cozulme !== gun) gun = gunEkle(gun, -1)
  let n = 0
  while (k[gun] && k[gun].cozulme === gun) {
    n++
    gun = gunEkle(gun, -1)
  }
  return n
}
