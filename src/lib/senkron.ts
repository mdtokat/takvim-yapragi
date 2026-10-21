// Yerel depolar (kelime ve quiz) ile hesap modülü arasındaki köprü. Depolar Firebase'i tanımaz:
// bir kayıt değişince buraya haber verir, girişli kullanıcı varsa hesap modülü buluta yazar (bitmemiş oyunu
// bekletir, uygulama arka plana geçince yazar).
// Buluttan gelen kayıtlar depoya yazılınca dinleyiciler (ekranlar) yenilenir.
import { useEffect, useState } from 'react'

export type KayitTuru = 'kelime' | 'quiz'
type BulutYazici = (tur: KayitTuru, anahtar: string, kayit: unknown) => void

let yazici: BulutYazici | null = null
export const bulutYaziciAyarla = (f: BulutYazici | null) => {
  yazici = f
}
export const bulutaBildir = (tur: KayitTuru, anahtar: string, kayit: unknown) => yazici?.(tur, anahtar, kayit)

let surum = 0
const dinleyiciler = new Set<(s: number) => void>()
export function depoDegisti() {
  surum++
  dinleyiciler.forEach((f) => f(surum))
}
/** Depolardaki herhangi bir kayıt değişince artan sayı; ekranlar bunu bağımlılık olarak kullanır. */
export function useDepoSurumu(): number {
  const [s, setS] = useState(surum)
  useEffect(() => {
    dinleyiciler.add(setS)
    return () => {
      dinleyiciler.delete(setS)
    }
  }, [])
  return s
}
