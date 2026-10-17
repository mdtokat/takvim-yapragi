import type { Slot } from './sabitler'

export type Kategori = 'bilim' | 'teknoloji' | 'muhendislik' | 'turkiye' | 'dunya' | 'spor' | 'sanat' | 'kesif'
export type Tur = 'olay' | 'dogum' | 'olum'

export const KATEGORILER: { id: Kategori; ad: string }[] = [
  { id: 'bilim', ad: 'Bilim' },
  { id: 'teknoloji', ad: 'Teknoloji' },
  { id: 'muhendislik', ad: 'Mühendislik' },
  { id: 'turkiye', ad: 'Türkiye' },
  { id: 'dunya', ad: 'Dünya' },
  { id: 'spor', ad: 'Spor' },
  { id: 'sanat', ad: 'Sanat' },
  { id: 'kesif', ad: 'Keşif' },
]
export const kategoriAdi = (k: string) => KATEGORILER.find((x) => x.id === k)?.ad ?? k

export const TURLER: { id: Tur; ad: string }[] = [
  { id: 'olay', ad: 'Olaylar' },
  { id: 'dogum', ad: 'Doğumlar' },
  { id: 'olum', ad: 'Ölümler' },
]

export interface Olay {
  id: number
  ay: number
  gun: number
  yil: number
  tur: Tur
  baslik: string
  aciklama: string
  kategori: Kategori
  kaynak_url: string
}

export interface GununBilgisi {
  tarih: string
  baslik: string
  metin: string
  kategori: Kategori
  kaynak_url: string
}

export interface QuizSorusu {
  id: number
  tarih: string
  sira: number
  soru: string
  secenekler: string[]
  dogru_index: number
  aciklama: string | null
  // Videodan gelen sorularda dolu; eski (tarihte bugün) sorularda boş.
  slot: Slot | null
  acilis: string | null
  video_baslik: string | null
  video_url: string | null
  kaynak_url: string | null
}

/** Sorunun metni olmadan açılış bilgisi; kilitli sorular için de döner. */
export interface QuizPlani {
  sira: number
  slot: Slot | null
  acilis: string | null
}

export interface GunVerisi {
  olaylar: Olay[]
  bilgi: GununBilgisi | null
  quiz: QuizSorusu[] // yalnızca açılmış sorular
  plan?: QuizPlani[] // eski önbellek kayıtlarında yok
}
