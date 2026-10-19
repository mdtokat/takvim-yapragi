// Sıralamada görünen ad: Instagram kullanıcı adı ('@' ile) veya Facebook'taki ad. Sunucu
// (tt_oyuncu_kaydet) aynı kuralları uygular; burada yalnızca kullanıcıya erken ve açık hata verilir.
export type AdTuru = 'instagram' | 'facebook'

const HARF = 'A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû'
const FACEBOOK = new RegExp(`^[${HARF}][${HARF} .'-]{1,38}[${HARF}.]$`)
const INSTAGRAM = /^@[a-z0-9._]{1,30}$/

export function adHazirla(tur: AdTuru, metin: string): { ad: string } | { hata: string } {
  let ad = metin.trim().replace(/\s+/g, ' ')
  if (tur === 'instagram') {
    // Profil bağlantısı yapıştırıldıysa kullanıcı adı alınır.
    const baglanti = /instagram\.com\/([^/?#\s]+)/i.exec(ad)
    if (baglanti) ad = baglanti[1]
    ad = ad.toLowerCase()
    if (!ad.startsWith('@')) ad = `@${ad}`
    if (ad === '@') return { hata: 'Instagram kullanıcı adını yaz.' }
    if (!INSTAGRAM.test(ad)) return { hata: 'Instagram kullanıcı adı yalnızca harf, rakam, nokta ve alt çizgi içerebilir; en çok 30 karakterdir.' }
    return { ad }
  }
  if (!ad) return { hata: "Facebook'taki adını yaz." }
  if (!FACEBOOK.test(ad)) return { hata: 'Ad 3 ile 40 karakter arasında olmalı; yalnızca harf, boşluk, nokta, kesme işareti ve tire içerebilir.' }
  return { ad }
}
