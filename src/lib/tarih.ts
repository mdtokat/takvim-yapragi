export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
export const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
export const KISA_GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const iki = (n: number) => String(n).padStart(2, '0')

/** Yerel tarihi YYYY-MM-DD yapar (toISOString UTC'ye çevirdiği için kullanılmaz). */
export function tarihMetni(d: Date): string {
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`
}

export function tarihCoz(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (d.getMonth() !== Number(m[2]) - 1) return null
  return d
}

export const bugun = () => tarihMetni(new Date())

export function gunEkle(s: string, n: number): string {
  const d = tarihCoz(s) ?? new Date()
  d.setDate(d.getDate() + n)
  return tarihMetni(d)
}

/** "21 Ekim" */
export function gunAyMetni(s: string): string {
  const d = tarihCoz(s)
  return d ? `${d.getDate()} ${AYLAR[d.getMonth()]}` : s
}

/** "16–22 Ekim" veya "30 Ekim – 5 Kasım" */
export function aralikMetni(baslangic: string, bitis: string): string {
  const [b, e] = [tarihCoz(baslangic), tarihCoz(bitis)]
  return b && e && b.getMonth() === e.getMonth() ? `${b.getDate()}–${gunAyMetni(bitis)}` : `${gunAyMetni(baslangic)} – ${gunAyMetni(bitis)}`
}

export const artikYil = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** 1 = Pazartesi ... 7 = Pazar */
export const haftaGunu = (d: Date) => ((d.getDay() + 6) % 7) + 1

export function yilMetni(yil: number): string {
  return yil < 0 ? `MÖ ${Math.abs(yil)}` : String(yil)
}

export function yilOnce(yil: number, simdi = new Date().getFullYear()): string {
  const fark = yil < 0 ? simdi - yil - 1 : simdi - yil
  if (fark <= 0) return 'bu yıl'
  return `${fark.toLocaleString('tr-TR')} yıl önce`
}

/** Yılın kaçıncı günü (1 Ocak = 1). Yaz saati kaymasından etkilenmemek için UTC ile hesaplanır. */
export function yilinGunu(d: Date): number {
  return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 86400000 + 1
}

// ===== Kelime oyunu: oyun günü Türkiye saatiyle değişir (UTC+3, yaz saati uygulanmaz) =====
const TR_OFSET_MS = 3 * 60 * 60 * 1000

/** Bulmaca numarası 1'den başlar. */
export const BASLANGIC = '2026-10-17'

export function trBugun(simdi = new Date()): string {
  const d = new Date(simdi.getTime() + TR_OFSET_MS)
  return `${d.getUTCFullYear()}-${iki(d.getUTCMonth() + 1)}-${iki(d.getUTCDate())}`
}

export function gunFarki(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

export const bulmacaNo = (tarih: string) => gunFarki(BASLANGIC, tarih) + 1

/**
 * Bu günün soruları ve kelimeleri şimdi süreli ve puanlı oynanabilir mi: bugünün ve dünün içeriği (Türkiye
 * saati). Puan içeriğin gününe yazılır. Sunucu aynı kuralı uygular (tt_puanli_gun).
 */
export function puanliGun(tarih: string, simdi = new Date()): boolean {
  const fark = gunFarki(tarih, trBugun(simdi))
  return fark === 0 || fark === 1
}

/** Türkiye saatiyle bir tarih ve "HH:MM" saatin zaman damgası (ms). */
export const trZamani = (tarih: string, saat: string) => Date.parse(`${tarih}T${saat}:00Z`) - TR_OFSET_MS

export function sureMetni(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${iki(Math.floor(s / 3600))}:${iki(Math.floor((s % 3600) / 60))}:${iki(s % 60)}`
}

/** Bir zaman damgasını cihazın yerel saatiyle "HH:MM" yazar. */
export function saatMetni(zaman: string): string {
  const d = new Date(zaman)
  return `${iki(d.getHours())}:${iki(d.getMinutes())}`
}

/** "12:00'de", "19:00'da": bulunma eki saatin okunuşundaki son kelimeye uyar. */
export function saatteMetni(zaman: string): string {
  const saat = saatMetni(zaman)
  const [s, d] = saat.split(':').map(Number)
  const n = d > 0 ? d : s
  const BIRLER = ['', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'] // bir, iki, üç, dört, beş, altı, yedi, sekiz, dokuz
  const ONLAR = ['da', 'da', 'de', 'da', 'ta', 'de'] // sıfır, on, yirmi, otuz, kırk, elli
  return `${saat}'${n % 10 ? BIRLER[n % 10] : ONLAR[Math.floor(n / 10)]}`
}
