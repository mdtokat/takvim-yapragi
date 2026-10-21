// Kelime oyununun Supabase tarafı. Supabase kullanıcıyı tanımaz: oyun durumu cihazda ve (girişliyse)
// Firebase'de tutulur. Tahminler durumsuz kb_degerlendir fonksiyonunda değerlendirilir; cevap yalnızca
// oyun bitince döner.
import { supabase } from './supabase'
import type { Durum } from './harfler'
import type { Slot } from './sabitler'
import { trBugun } from './tarih'

export interface Satir {
  tahmin: string
  sonuc: Durum[]
}

export interface BitisBilgisi {
  cevap: string
  anlam: string
  ornek: string
  videoBaslik: string | null // boşsa kelime videodan gelmemiştir
}

/** Günün üç kelimesinden biri; her kelime kendi videosunun yayın saatinde açılır. */
export interface KelimeSlotu {
  slot: Slot
  acilis: string
  acik: boolean
  videoBaslik: string | null // yalnızca açılmış kelimede dolu
}

export interface GunBilgisi {
  tarih: string
  bugun: string // Türkiye saatiyle bugün (sunucudan)
  slotlar: KelimeSlotu[]
}

export type Degerlendirme =
  | { gecerli: false; gecersiz: number } // gecersiz: sözlükte olmayan tahminin sırası (1'den başlar)
  | { gecerli: true; sonuclar: Durum[][]; dogru: boolean; bitti: boolean; bitis: BitisBilgisi | null }

export class OyunHatasi extends Error {
  constructor(public kod: 'oyun_bitti' | 'bulmaca_yok' | 'baglanti', mesaj?: string) {
    super(mesaj ?? kod)
  }
}

type HamGun = { tarih: string; bugun?: string; slotlar?: { slot: Slot; acilis: string; acik: boolean; video_baslik: string | null }[] }

/** Bir günün üç kelimesi (tarih verilmezse bugün; gelecek gün istenirse bugün döner). Cevap gelmez. */
export async function gunuSor(tarih?: string): Promise<GunBilgisi> {
  let { data, error } = await supabase.rpc('kb_gun', { p_tarih: tarih ?? null })
  // kb_gun henüz yoksa (veritabanı güncellenmeden yayımlanan sürüm) bugünün kelimeleri eski fonksiyondan gelir.
  if (error && (!tarih || tarih === trBugun())) ({ data, error } = await supabase.rpc('kb_bugun'))
  if (error) throw new OyunHatasi('baglanti', error.message)
  const d = data as HamGun
  return {
    tarih: d.tarih,
    bugun: d.bugun ?? d.tarih,
    slotlar: (d.slotlar ?? []).map((s) => ({ slot: s.slot, acilis: s.acilis, acik: s.acik, videoBaslik: s.video_baslik ?? null })),
  }
}

/** O kelime için yapılan bütün tahminleri (yenisi sonda) değerlendirir. */
export async function degerlendir(tarih: string, slot: Slot, tahminler: string[]): Promise<Degerlendirme> {
  const { data, error } = await supabase.rpc('kb_degerlendir', { p_tarih: tarih, p_slot: slot, p_tahminler: tahminler })
  if (error) {
    const m = error.message ?? ''
    if (m.includes('oyun_bitti')) throw new OyunHatasi('oyun_bitti')
    if (m.includes('bulmaca_yok')) throw new OyunHatasi('bulmaca_yok')
    throw new OyunHatasi('baglanti', m)
  }
  const d = data as {
    gecerli: boolean
    gecersiz?: number
    sonuclar?: Durum[][]
    dogru?: boolean
    bitti?: boolean
    cevap?: string | null
    anlam?: string | null
    ornek?: string | null
    video_baslik?: string | null
  }
  if (!d.gecerli) return { gecerli: false, gecersiz: d.gecersiz ?? tahminler.length }
  return {
    gecerli: true,
    sonuclar: d.sonuclar ?? [],
    dogru: !!d.dogru,
    bitti: !!d.bitti,
    bitis: d.bitti && d.cevap ? { cevap: d.cevap, anlam: d.anlam ?? '', ornek: d.ornek ?? '', videoBaslik: d.video_baslik ?? null } : null,
  }
}

export async function kelimeOner(kelime: string): Promise<boolean> {
  const { error } = await supabase.from('kb_kelime_onerileri').insert({ kelime })
  return !error
}
