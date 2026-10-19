export const UYGULAMA_ADI = 'Mindmash'
export const SITE_URL = 'https://mdtokat.github.io/takvim-yapragi/'
export const SURUM = '1.1.0'

// Günün sorularının ve kelimesinin geldiği hesaplar. Bir videonun kendi bağlantısı yoksa buraya yönlendirilir.
export const SOSYAL_HESAPLAR: { ad: string; url: string }[] = [
  { ad: 'Instagram', url: 'https://www.instagram.com/mindmash.tr/' },
  { ad: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61589225782179' },
]
export const VIDEO_VARSAYILAN_URL = SOSYAL_HESAPLAR[0].url

export type Slot = 'sabah' | 'oglen' | 'aksam'
export const SLOT_ADI: Record<Slot, string> = { sabah: 'Sabah', oglen: 'Öğlen', aksam: 'Akşam' }
/** Videoların yayın saati (Türkiye saati); soru ve kelime bu saatte açılır. */
export const SLOT_SAATI: Record<Slot, string> = { sabah: '08:00', oglen: '12:00', aksam: '19:00' }
