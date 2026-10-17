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
