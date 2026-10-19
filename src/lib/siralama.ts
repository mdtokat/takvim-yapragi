// Günlük ve haftalık sıralama (kelime ve sorular ayrı). Sıralamaya yalnızca Google ile giriş yapıp ad
// kaydeden oyuncular girer. Kullanıcı Firebase hesabıyla tanınır: sıralama istekleri Firebase oturum
// anahtarıyla gider, Supabase anahtarı doğrular (Firebase üçüncü taraf giriş olarak tanımlıdır) ve sunucu
// fonksiyonları kullanıcıyı bu anahtardan tanır. Süre ve puan sunucuda ölçülür.
// İçerik istekleri anahtarsız istemciden gider; sıralama ayarı bozulsa bile oyun çalışmaya devam eder.
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { oku, yaz } from './depo'
import { hesapDinle, kimlikAnahtari } from './hesap'
import { SUPABASE_ANAHTARI, SUPABASE_URL, supabase } from './supabase'
import type { AdTuru } from './oyuncuAdi'
import type { Durum } from './harfler'
import type { BitisBilgisi } from './kelimeOyunu'
import type { Slot } from './sabitler'

/** Sıralamaya giren soru ve kelimenin süresi (sunucu 2 saniye tolerans tanır). */
export const QUIZ_SURESI = 30_000
export const KELIME_SURESI = 90_000

const anahtarli = createClient(SUPABASE_URL, SUPABASE_ANAHTARI, { accessToken: kimlikAnahtari })

export interface Oyuncu {
  ad: string
  adTuru: AdTuru
  durum: 'yeni' | 'onayli' | 'red' // red: ad sıralamada görünmez, yeni ad seçilmeli
}

export type OyuncuDurumu =
  | { durum: 'girissiz' }
  | { durum: 'hesapBekleniyor' } // bu cihazda giriş yapılmış, Firebase yükleniyor
  | { durum: 'yukleniyor'; uid: string }
  | { durum: 'adsiz'; uid: string } // girişli, sıralama adı yok
  | { durum: 'kayitli'; uid: string; oyuncu: Oyuncu }
  | { durum: 'kullanilamiyor'; uid: string } // sunucuya ulaşılamadı veya sıralama ayarlanmamış

export type HataKodu =
  | 'giris_gerekli'
  | 'oyuncu_yok'
  | 'ad_gecersiz'
  | 'ad_alinmis'
  | 'ad_degisim_siniri'
  | 'soru_yok'
  | 'gun_disi'
  | 'bulmaca_yok'
  | 'baslamadi'
  | 'gecersiz_bicim'
  | 'baglanti'

const BILINEN: HataKodu[] = [
  'giris_gerekli',
  'oyuncu_yok',
  'ad_gecersiz',
  'ad_alinmis',
  'ad_degisim_siniri',
  'soru_yok',
  'gun_disi',
  'bulmaca_yok',
  'baslamadi',
  'gecersiz_bicim',
]

export class SiralamaHatasi extends Error {
  constructor(public kod: HataKodu, mesaj?: string) {
    super(mesaj ?? kod)
  }
}

async function cagir<T>(ad: string, args: Record<string, unknown> = {}, istemci = anahtarli): Promise<T> {
  const { data, error } = await istemci.rpc(ad, args)
  if (error) {
    const m = error.message ?? ''
    // PGRST3xx: Supabase oturum anahtarını tanımadı (Firebase entegrasyonu kapalı veya anahtar geçersiz).
    if (error.code?.startsWith('PGRST3')) throw new SiralamaHatasi('giris_gerekli', m)
    throw new SiralamaHatasi(BILINEN.find((k) => m.includes(k)) ?? 'baglanti', m)
  }
  return data as T
}

// ===== Oyuncu =====
const ATLANDI = 'siralama-atlandi' // { [uid]: true }: ad penceresinde "Şimdilik sıralamaya girme" seçildi

let durum: OyuncuDurumu = { durum: 'girissiz' }
const dinleyiciler = new Set<(d: OyuncuDurumu) => void>()
function ayarla(d: OyuncuDurumu) {
  durum = d
  dinleyiciler.forEach((f) => f(durum))
}

type HamOyuncu = { ad: string; ad_turu: AdTuru; durum: Oyuncu['durum'] } | null
const oyuncuDurumu = (uid: string, o: HamOyuncu): OyuncuDurumu =>
  o ? { durum: 'kayitli', uid, oyuncu: { ad: o.ad, adTuru: o.ad_turu, durum: o.durum } } : { durum: 'adsiz', uid }

async function oyuncuyuGetir(uid: string) {
  ayarla({ durum: 'yukleniyor', uid })
  try {
    const o = await cagir<HamOyuncu>('tt_oyuncu')
    if ('uid' in durum && durum.uid === uid) ayarla(oyuncuDurumu(uid, o))
  } catch {
    if ('uid' in durum && durum.uid === uid) ayarla({ durum: 'kullanilamiyor', uid })
  }
}

let baslatildi = false
/** Hesap girişli olunca oyuncu bilgisini getirir; çıkışta sıfırlar. Uygulama açılışında bir kez çağrılır. */
export function siralamayiBaslat() {
  if (baslatildi) return
  baslatildi = true
  let sonUid: string | null = null
  hesapDinle((h) => {
    const uid = h.durum === 'girisli' && h.hesap ? h.hesap.uid : null
    if (!uid && h.durum === 'yukleniyor') {
      sonUid = null
      ayarla({ durum: 'hesapBekleniyor' })
      return
    }
    if (uid === sonUid && durum.durum !== 'hesapBekleniyor') return
    sonUid = uid
    if (uid) void oyuncuyuGetir(uid)
    else ayarla({ durum: 'girissiz' })
  })
}

/** Sunucuya ulaşılamadıysa yeniden dener. */
export function oyuncuyuYenile() {
  if ('uid' in durum) void oyuncuyuGetir(durum.uid)
}

export function useOyuncu(): OyuncuDurumu {
  const [d, setD] = useState(durum)
  useEffect(() => {
    dinleyiciler.add(setD)
    setD(durum)
    return () => {
      dinleyiciler.delete(setD)
    }
  }, [])
  return d
}

/** Giriş sonrası ad sorulsun mu: adı yok ve daha önce "Şimdilik sıralamaya girme" denmemiş. */
export const adSorulsun = (d: OyuncuDurumu) => d.durum === 'adsiz' && !oku<Record<string, boolean>>(ATLANDI, {})[d.uid]

export function adSormayiAtla() {
  if (!('uid' in durum)) return
  yaz(ATLANDI, { ...oku<Record<string, boolean>>(ATLANDI, {}), [durum.uid]: true })
  ayarla({ ...durum })
}

export async function oyuncuKaydet(tur: AdTuru, ad: string): Promise<void> {
  if (!('uid' in durum)) throw new SiralamaHatasi('giris_gerekli')
  const uid = durum.uid
  const o = await cagir<HamOyuncu>('tt_oyuncu_kaydet', { p_ad: ad, p_tur: tur })
  ayarla(oyuncuDurumu(uid, o))
}

/** Sıralamadan çıkar: ad ve bütün puanlar silinir. */
export async function siralamadanCik(): Promise<void> {
  if (!('uid' in durum)) return
  const uid = durum.uid
  await cagir<null>('tt_oyuncu_sil')
  yaz(ATLANDI, { ...oku<Record<string, boolean>>(ATLANDI, {}), [uid]: true })
  ayarla({ durum: 'adsiz', uid })
}

/**
 * Hesap silinmeden önce çağrılır: sıralamadaki ad ve puanlar da silinir. Supabase anahtarı tanımıyorsa
 * (giris_gerekli) bu hesapla hiç kayıt oluşmamıştır; bağlantı hatası ise hesabın silinmesini durdurur.
 */
export async function siralamaKaydiniSil(): Promise<void> {
  if (durum.durum === 'girissiz' || durum.durum === 'adsiz') return
  try {
    await cagir<null>('tt_oyuncu_sil')
  } catch (e) {
    if (!(e instanceof SiralamaHatasi && e.kod === 'giris_gerekli')) throw e
  }
}

/** Süreli ve puanlı oyun: girişli ve sıralama adı kayıtlı. */
export const siraliOyuncu = () => durum.durum === 'kayitli'

/** Oyuncu bilgisi henüz gelmedi: bu arada sıralamaya girebilecek oyun başlatılmaz. */
export const oyuncuBekleniyor = (d: OyuncuDurumu) => d.durum === 'hesapBekleniyor' || d.durum === 'yukleniyor'

// ===== Sorular =====
export interface QuizSonucu {
  sirali: boolean
  secim: number | null // null: süre doldu
  dogruIndex: number
  dogru: boolean
  puan: number | null // sıralamaya girmeyen cevapta null
}

export type QuizDurumu =
  | { basladi: false }
  | { basladi: true; kalanMs: number; sonuc: null } // süre işliyor
  | { basladi: true; kalanMs: 0; sonuc: QuizSonucu } // cevaplandı veya süre doldu

type HamQuiz = {
  basladi: boolean
  kalan_ms?: number | null
  cevaplandi?: boolean
  sirali?: boolean
  secim?: number | null
  dogru?: boolean | null
  dogru_index?: number | null
  puan?: number | null
}

const quizSonucu = (d: HamQuiz, sirali: boolean): QuizSonucu => ({
  sirali,
  secim: d.secim ?? null,
  dogruIndex: d.dogru_index ?? 0,
  dogru: !!d.dogru,
  puan: d.puan ?? null,
})

const quizDurumu = (d: HamQuiz): QuizDurumu => {
  if (!d.basladi) return { basladi: false }
  if (d.cevaplandi) return { basladi: true, kalanMs: 0, sonuc: quizSonucu(d, true) }
  return { basladi: true, kalanMs: d.kalan_ms ?? 0, sonuc: null }
}

/** Sıralamaya giren sorunun durumu; baslat: başlamadıysa 30 saniyeyi başlatır. */
export async function quizDurumuGetir(tarih: string, sira: number, baslat: boolean): Promise<QuizDurumu> {
  return quizDurumu(await cagir<HamQuiz>('tt_quiz_durum', { p_tarih: tarih, p_sira: sira, p_baslat: baslat }))
}

/**
 * Cevabı sunucuda değerlendirir; doğru cevap yalnızca burada döner. Sıralamada başlatılmış soruda süre ve
 * puan kaydedilir (secim null: süre doldu). Sıralama dışı oyuncunun isteği anahtarsız gider.
 */
export async function quizCevapla(tarih: string, sira: number, secim: number | null): Promise<QuizSonucu> {
  const d = await cagir<HamQuiz>('tt_quiz_cevapla', { p_tarih: tarih, p_sira: sira, p_secim: secim }, siraliOyuncu() ? anahtarli : supabase)
  return quizSonucu(d, !!d.sirali)
}

// ===== Kelime =====
export interface SiraliKelime {
  kalanMs: number // bitmiş oyunda 0
  tahminler: string[]
  sonuclar: Durum[][]
  durum: 'devam' | 'kazandi' | 'kaybetti'
  puan: number
  bitis: BitisBilgisi | null
}

type HamKelime = {
  basladi?: boolean
  gecerli?: boolean
  gecersiz?: number
  kalan_ms?: number | null
  tahminler?: string[]
  sonuclar?: Durum[][]
  durum?: SiraliKelime['durum']
  puan?: number
  cevap?: string | null
  anlam?: string | null
  ornek?: string | null
  video_baslik?: string | null
}

const siraliKelime = (d: HamKelime): SiraliKelime => ({
  kalanMs: d.kalan_ms ?? 0,
  tahminler: d.tahminler ?? [],
  sonuclar: d.sonuclar ?? [],
  durum: d.durum ?? 'devam',
  puan: d.puan ?? 0,
  bitis: d.cevap ? { cevap: d.cevap, anlam: d.anlam ?? '', ornek: d.ornek ?? '', videoBaslik: d.video_baslik ?? null } : null,
})

/** Sıralamaya giren kelimenin durumu (başlamadıysa null); baslat: başlamadıysa 90 saniyeyi başlatır. */
export async function kelimeDurumuGetir(tarih: string, slot: Slot, baslat: boolean): Promise<SiraliKelime | null> {
  const d = await cagir<HamKelime>('kb_sirali_durum', { p_tarih: tarih, p_slot: slot, p_baslat: baslat })
  return d.basladi ? siraliKelime(d) : null
}

/** Sıralamaya giren kelimeye tahmin; sözlükte yoksa { gecerli: false }. */
export async function kelimeTahmini(
  tarih: string,
  slot: Slot,
  tahmin: string,
): Promise<{ gecerli: false } | ({ gecerli: true } & SiraliKelime)> {
  const d = await cagir<HamKelime>('kb_sirali_tahmin', { p_tarih: tarih, p_slot: slot, p_tahmin: tahmin })
  if (d.gecerli === false) return { gecerli: false }
  return { gecerli: true, ...siraliKelime(d) }
}

// ===== Sıralama =====
export type SiralamaOyunu = 'kelime' | 'quiz'
export type SiralamaDonemi = 'gun' | 'hafta'

export interface SiralamaSatiri {
  sira: number
  ad: string
  adTuru: AdTuru
  puan: number
  oyun: number
  ben: boolean
}

export interface Siralama {
  baslangic: string
  bitis: string
  oyuncuSayisi: number
  liste: SiralamaSatiri[]
  ben: { sira: number; puan: number; oyun: number } | null
}

export async function siralamaGetir(oyun: SiralamaOyunu, donem: SiralamaDonemi): Promise<Siralama> {
  const d = await cagir<{
    baslangic: string
    bitis: string
    oyuncu_sayisi: number
    liste: { sira: number; ad: string; ad_turu: AdTuru; puan: number; oyun: number; ben: boolean }[]
    ben: { sira: number; puan: number; oyun: number } | null
  }>('tt_siralama', { p_oyun: oyun, p_donem: donem }, siraliOyuncu() ? anahtarli : supabase)
  return {
    baslangic: d.baslangic,
    bitis: d.bitis,
    oyuncuSayisi: d.oyuncu_sayisi,
    liste: d.liste.map((s) => ({ sira: s.sira, ad: s.ad, adTuru: s.ad_turu, puan: s.puan, oyun: s.oyun, ben: s.ben })),
    ben: d.ben,
  }
}
