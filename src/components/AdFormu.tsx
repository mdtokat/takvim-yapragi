import { useState, type FormEvent } from 'react'
import { adHazirla, type AdTuru } from '../lib/oyuncuAdi'
import { SiralamaHatasi, oyuncuKaydet, useOyuncu, type HataKodu } from '../lib/siralama'
import { sesCal } from '../lib/ses'

const HATA_METNI: Partial<Record<HataKodu, string>> = {
  ad_gecersiz: 'Bu ad kabul edilmedi. Yalnızca izin verilen karakterleri kullanıp yeniden dene.',
  ad_alinmis:
    "Bu ad başka bir oyuncuda kayıtlı. Sana aitse bize Instagram'dan yaz; Facebook adıysa sonuna soyadının baş harfini ya da şehrini ekleyebilirsin.",
  ad_degisim_siniri: 'Adını haftada bir kez değiştirebilirsin. Son değişiklikten 7 gün sonra yeniden dene.',
}
const GENEL_HATA = 'Sıralamaya bağlanılamadı. Bağlantını kontrol edip biraz sonra yeniden dene.'

/** Sıralamada görünecek adı (Instagram kullanıcı adı veya Facebook'taki ad) alır. */
export function AdFormu({ onKaydedildi }: { onKaydedildi?: () => void }) {
  const oyuncu = useOyuncu()
  const mevcut = oyuncu.durum === 'kayitli' ? oyuncu.oyuncu : null
  const [tur, setTur] = useState<AdTuru>(mevcut?.adTuru ?? 'instagram')
  const [metin, setMetin] = useState(mevcut?.ad ?? '')
  const [hata, setHata] = useState('')
  const [mesgul, setMesgul] = useState(false)

  const gonder = async (e: FormEvent) => {
    e.preventDefault()
    const h = adHazirla(tur, metin)
    if ('hata' in h) {
      setHata(h.hata)
      return
    }
    setMesgul(true)
    setHata('')
    try {
      await oyuncuKaydet(tur, h.ad)
      sesCal('tamam')
      onKaydedildi?.()
    } catch (e) {
      setHata((e instanceof SiralamaHatasi && HATA_METNI[e.kod]) || GENEL_HATA)
    } finally {
      setMesgul(false)
    }
  }

  const turSec = (t: AdTuru) => {
    if (t === tur) return
    sesCal('tik')
    setTur(t)
    setMetin('')
    setHata('')
  }

  return (
    <form className="ad-formu" onSubmit={(e) => void gonder(e)} noValidate>
      <div className="bolumlu-secici" role="radiogroup" aria-label="Hangi hesabın adı">
        <button type="button" role="radio" aria-checked={tur === 'instagram'} onClick={() => turSec('instagram')}>
          Instagram
        </button>
        <button type="button" role="radio" aria-checked={tur === 'facebook'} onClick={() => turSec('facebook')}>
          Facebook
        </button>
      </div>
      <label className="ad-alani">
        <span>{tur === 'instagram' ? 'Instagram kullanıcı adın' : "Facebook'taki adın"}</span>
        <input
          type="text"
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          placeholder={tur === 'instagram' ? '@kullaniciadi' : 'Ad Soyad'}
          autoComplete={tur === 'facebook' ? 'name' : 'off'}
          autoCapitalize={tur === 'instagram' ? 'none' : 'words'}
          autoCorrect="off"
          spellCheck={false}
          maxLength={80}
          aria-invalid={!!hata}
        />
      </label>
      {hata && (
        <p className="uyari" role="alert">
          {hata}
        </p>
      )}
      <button className="dugme" type="submit" disabled={mesgul}>
        {mesgul ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </form>
  )
}
