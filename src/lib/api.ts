import { supabase } from './supabase'
import { oku, yaz } from './depo'
import { tarihCoz } from './tarih'
import type { GunVerisi, GununBilgisi, Olay } from './tipler'

const OLAY_ALANLARI = 'id, ay, gun, yil, tur, baslik, aciklama, kategori, kaynak_url'

export interface GunSonucu {
  veri: GunVerisi
  onbellekten: boolean
}

export const onbellektekiGun = (tarih: string) => oku<GunVerisi | null>(`gun:${tarih}`, null)

export async function gunuGetir(tarih: string): Promise<GunSonucu> {
  const d = tarihCoz(tarih)
  if (!d) throw new Error('Geçersiz tarih')
  const ay = d.getMonth() + 1
  const gun = d.getDate()
  try {
    const [olaylar, bilgi, quiz] = await Promise.all([
      supabase.from('tt_olaylar').select(OLAY_ALANLARI).eq('ay', ay).eq('gun', gun).order('yil'),
      supabase.from('tt_gunun_bilgisi').select('tarih, baslik, metin, kategori, kaynak_url').eq('tarih', tarih).maybeSingle(),
      supabase.from('tt_quiz').select('id, tarih, sira, soru, secenekler, dogru_index, aciklama').eq('tarih', tarih).order('sira'),
    ])
    const hata = olaylar.error ?? bilgi.error ?? quiz.error
    if (hata) throw hata
    const veri: GunVerisi = {
      olaylar: (olaylar.data ?? []) as Olay[],
      bilgi: (bilgi.data ?? null) as GununBilgisi | null,
      quiz: (quiz.data ?? []) as GunVerisi['quiz'],
    }
    yaz(`gun:${tarih}`, veri)
    return { veri, onbellekten: false }
  } catch (e) {
    const onbellek = onbellektekiGun(tarih)
    if (onbellek) return { veri: onbellek, onbellekten: true }
    throw e
  }
}

export async function olayGetir(id: number): Promise<Olay | null> {
  const { data, error } = await supabase.from('tt_olaylar').select(OLAY_ALANLARI).eq('id', id).maybeSingle()
  if (error) throw error
  return data as Olay | null
}

export async function hataBildir(olay_id: number, not_metni: string): Promise<void> {
  const { error } = await supabase.from('tt_hata_bildirimleri').insert({ olay_id, not_metni: not_metni.slice(0, 300) })
  if (error) throw error
}

/** Kaydı olan rastgele bir ay-gün döndürür (yoksa null). */
export async function rastgeleDoluGun(): Promise<{ ay: number; gun: number } | null> {
  const { data, error } = await supabase.from('tt_olaylar').select('ay, gun').limit(1000)
  if (error || !data || data.length === 0) return null
  const r = data[Math.floor(Math.random() * data.length)] as { ay: number; gun: number }
  return { ay: r.ay, gun: r.gun }
}

/** Bildirim planlamak için bugünden itibaren gelecek günlerin bilgileri (RLS 7 gün ileriye izin verir). */
export async function yaklasanBilgiler(baslangic: string): Promise<GununBilgisi[]> {
  const { data, error } = await supabase
    .from('tt_gunun_bilgisi')
    .select('tarih, baslik, metin, kategori, kaynak_url')
    .gte('tarih', baslangic)
    .order('tarih')
    .limit(8)
  if (error) throw error
  return (data ?? []) as GununBilgisi[]
}
