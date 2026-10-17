import { supabase } from './supabase'
import type { Durum } from './harfler'
import type { Slot } from './sabitler'

export interface Satir {
  tahmin: string
  sonuc: Durum[]
}

export interface BitisBilgisi {
  cevap: string
  anlam: string
  ornek: string
  videoSlot: Slot | null
  videoBaslik: string | null
}

export interface BugunBilgisi {
  tarih: string
  hazir: boolean
  videoSlot: Slot | null // kelimenin geçtiği video (ipucu)
}

export interface TahminSonucu {
  gecerli: boolean
  tarih?: string
  sonuc?: Durum[]
  dogru?: boolean
  deneme?: number
  bitti?: boolean
  cevap?: string | null
  anlam?: string | null
  ornek?: string | null
}

export class OyunHatasi extends Error {
  constructor(public kod: 'oturum' | 'oyun_bitti' | 'bulmaca_yok' | 'cakisma' | 'baglanti' | 'anonim_kapali', mesaj?: string) {
    super(mesaj ?? kod)
  }
}

// Aynı anda birden fazla çağrı gelirse tek bir anonim kullanıcı oluşturulsun diye paylaşılan söz.
let oturumSozu: Promise<void> | null = null

export function oturumHazirla(): Promise<void> {
  if (!oturumSozu) {
    oturumSozu = oturumAc().catch((e) => {
      oturumSozu = null
      throw e
    })
  }
  return oturumSozu
}

export async function oturumuYenile(): Promise<void> {
  oturumSozu = null
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
  await oturumHazirla()
}

async function oturumAc(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) {
    if (/anonymous/i.test(error.message) && /disabled/i.test(error.message)) throw new OyunHatasi('anonim_kapali', error.message)
    throw new OyunHatasi('oturum', error.message)
  }
}

export async function bugunuSor(): Promise<BugunBilgisi> {
  const { data, error } = await supabase.rpc('kb_bugun')
  if (error) throw new OyunHatasi('baglanti', error.message)
  const d = data as { tarih: string; hazir: boolean; video_slot?: Slot | null }
  return { tarih: d.tarih, hazir: d.hazir, videoSlot: d.video_slot ?? null }
}

export async function denemeleriGetir(tarih: string): Promise<Satir[]> {
  const { data, error } = await supabase
    .from('kb_denemeler')
    .select('sira, tahmin, sonuc')
    .eq('tarih', tarih)
    .order('sira')
  if (error) throw new OyunHatasi('baglanti', error.message)
  return (data ?? []).map((r) => ({ tahmin: r.tahmin as string, sonuc: r.sonuc as Durum[] }))
}

export async function tahminGonder(kelime: string): Promise<TahminSonucu> {
  const { data, error } = await supabase.rpc('kb_tahmin', { p_tahmin: kelime })
  if (error) {
    const m = error.message ?? ''
    if (m.includes('oyun_bitti')) throw new OyunHatasi('oyun_bitti')
    if (m.includes('bulmaca_yok')) throw new OyunHatasi('bulmaca_yok')
    if (m.includes('oturum_gerekli') || error.code === 'PGRST301') throw new OyunHatasi('oturum')
    if (error.code === '23505') throw new OyunHatasi('cakisma')
    throw new OyunHatasi('baglanti', m)
  }
  return data as TahminSonucu
}

export async function bitisBilgisi(tarih: string): Promise<BitisBilgisi | null> {
  const { data, error } = await supabase.rpc('kb_bitis_bilgisi', { p_tarih: tarih })
  if (error || !data) return null
  const d = data as { cevap: string; anlam: string; ornek: string; video_slot?: Slot | null; video_baslik?: string | null }
  return { cevap: d.cevap, anlam: d.anlam, ornek: d.ornek, videoSlot: d.video_slot ?? null, videoBaslik: d.video_baslik ?? null }
}

export async function genelDagilim(tarih: string): Promise<{ deneme: number; oyuncu: number }[]> {
  const { data, error } = await supabase.rpc('kb_dagilim', { p_tarih: tarih })
  if (error) return []
  return ((data ?? []) as { deneme: number; oyuncu: number }[]).map((r) => ({ deneme: Number(r.deneme), oyuncu: Number(r.oyuncu) }))
}

export async function kelimeOner(kelime: string): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  const { error } = await supabase
    .from('kb_kelime_onerileri')
    .insert({ kelime, kullanici_id: data.session?.user.id })
  return !error
}

/** Kullanıcının tüm deneme kayıtları (istatistik için). PostgREST sayfa sınırı nedeniyle parça parça okunur. */
export async function tumDenemeler(): Promise<{ tarih: string; sira: number; dogru: boolean }[]> {
  const sonuc: { tarih: string; sira: number; dogru: boolean }[] = []
  const parca = 1000
  for (let bas = 0; bas < 20000; bas += parca) {
    const { data, error } = await supabase
      .from('kb_denemeler')
      .select('tarih, sira, dogru')
      .order('tarih')
      .order('sira')
      .range(bas, bas + parca - 1)
    if (error) throw new OyunHatasi('baglanti', error.message)
    sonuc.push(...((data ?? []) as typeof sonuc))
    if (!data || data.length < parca) break
  }
  return sonuc
}
