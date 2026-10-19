export const ALFABE = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'
export const KELIME_UZUNLUGU = 5
export const DENEME_SAYISI = 6

export const KLAVYE_SATIRLARI: string[][] = [
  ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
  ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'SIL'],
]

const SAPKALAR: Record<string, string> = { â: 'a', Â: 'A', î: 'i', Î: 'İ', û: 'u', Û: 'U' }

/** Fiziksel klavyeden veya yapıştırmadan gelen bir karakteri oyun harfine çevirir; geçersizse null. */
export function harfNormalle(ch: string): string | null {
  if (ch.length !== 1) return null
  const sapkasiz = SAPKALAR[ch] ?? ch
  const buyuk = sapkasiz.toLocaleUpperCase('tr-TR') // i → İ, ı → I
  return ALFABE.includes(buyuk) ? buyuk : null
}

export type Durum = 'yesil' | 'sari' | 'gri'

const ONCELIK: Record<Durum, number> = { gri: 1, sari: 2, yesil: 3 }

/** Klavye için her harfin bugüne kadarki en iyi durumu. */
export function harfDurumlari(satirlar: { tahmin: string; sonuc: Durum[] }[]): Record<string, Durum> {
  const d: Record<string, Durum> = {}
  for (const s of satirlar) {
    ;[...s.tahmin].forEach((h, i) => {
      const yeni = s.sonuc[i]
      if (!d[h] || ONCELIK[yeni] > ONCELIK[d[h]]) d[h] = yeni
    })
  }
  return d
}

/** Zor mod: bulunan ipuçları sonraki tahminde kullanılmak zorunda. Hata metni veya null döner. */
export function zorModHatasi(tahmin: string, satirlar: { tahmin: string; sonuc: Durum[] }[]): string | null {
  const t = [...tahmin]
  for (const s of satirlar) {
    const h = [...s.tahmin]
    for (let i = 0; i < KELIME_UZUNLUGU; i++) {
      if (s.sonuc[i] === 'yesil' && t[i] !== h[i]) return `${i + 1}. harf ${h[i]} olmalı`
    }
    for (let i = 0; i < KELIME_UZUNLUGU; i++) {
      if (s.sonuc[i] === 'sari') {
        const gerekli = h.filter((x, j) => x === h[i] && (s.sonuc[j] === 'sari' || s.sonuc[j] === 'yesil')).length
        const mevcut = t.filter((x) => x === h[i]).length
        if (mevcut < gerekli) return `Tahminde ${h[i]} harfi bulunmalı`
      }
    }
  }
  return null
}

/** Bir kelimenin oyunu: yeşil satır varsa kazanılmış, 6 deneme dolduysa bitmiştir. */
export const kazanildi = (satirlar: { sonuc: Durum[] }[]) => satirlar.some((r) => r.sonuc.every((d) => d === 'yesil'))
export const oyunBitti = (satirlar: { sonuc: Durum[] }[]) => kazanildi(satirlar) || satirlar.length >= DENEME_SAYISI
