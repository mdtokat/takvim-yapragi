import { useEffect, useState } from 'react'
import { oku, yaz } from './depo'
import type { Kategori } from './tipler'

export type Tema = 'sistem' | 'acik' | 'koyu'

export interface Ayarlar {
  tema: Tema
  bildirim: boolean
  bildirimSaati: string // "HH:MM"
  kategoriler: Kategori[] // boş = hepsi
}

const VARSAYILAN: Ayarlar = { tema: 'sistem', bildirim: false, bildirimSaati: '09:00', kategoriler: [] }
const ANAHTAR = 'ayarlar'

type Dinleyici = (a: Ayarlar) => void
const dinleyiciler = new Set<Dinleyici>()
let mevcut: Ayarlar = { ...VARSAYILAN, ...oku<Partial<Ayarlar>>(ANAHTAR, {}) }

export const ayarlariOku = () => mevcut

export function ayarlariGuncelle(degisiklik: Partial<Ayarlar>) {
  mevcut = { ...mevcut, ...degisiklik }
  yaz(ANAHTAR, mevcut)
  temayiUygula(mevcut.tema)
  dinleyiciler.forEach((f) => f(mevcut))
}

export function useAyarlar(): Ayarlar {
  const [a, setA] = useState(mevcut)
  useEffect(() => {
    dinleyiciler.add(setA)
    return () => {
      dinleyiciler.delete(setA)
    }
  }, [])
  return a
}

export function temayiUygula(tema: Tema) {
  const kok = document.documentElement
  if (tema === 'sistem') kok.removeAttribute('data-theme')
  else kok.setAttribute('data-theme', tema === 'koyu' ? 'dark' : 'light')
}
