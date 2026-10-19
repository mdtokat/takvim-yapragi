import { useEffect, useState } from 'react'
import { oku, yaz } from './depo'
import type { Kategori } from './tipler'

export type Tema = 'sistem' | 'acik' | 'koyu'

export interface Ayarlar {
  tema: Tema
  bildirim: boolean
  bildirimSaati: string // "HH:MM"
  kategoriler: Kategori[] // boş = hepsi
  ses: boolean
  // Kelime oyunu
  zorMod: boolean
  renkKoru: boolean
  yardimGoruldu: boolean
}

const VARSAYILAN: Ayarlar = {
  tema: 'sistem',
  bildirim: false,
  bildirimSaati: '09:00',
  kategoriler: [],
  ses: true,
  zorMod: false,
  renkKoru: false,
  yardimGoruldu: false,
}
const ANAHTAR = 'ayarlar'

type Dinleyici = (a: Ayarlar) => void
const dinleyiciler = new Set<Dinleyici>()
let mevcut: Ayarlar = { ...VARSAYILAN, ...oku<Partial<Ayarlar>>(ANAHTAR, {}) }

export const ayarlariOku = () => mevcut

export function ayarlariGuncelle(degisiklik: Partial<Ayarlar>) {
  mevcut = { ...mevcut, ...degisiklik }
  yaz(ANAHTAR, mevcut)
  gorunumuUygula()
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

export function gorunumuUygula() {
  const kok = document.documentElement
  if (mevcut.tema === 'sistem') kok.removeAttribute('data-theme')
  else kok.setAttribute('data-theme', mevcut.tema === 'koyu' ? 'dark' : 'light')
  if (mevcut.renkKoru) kok.setAttribute('data-renk', 'koru')
  else kok.removeAttribute('data-renk')
}
