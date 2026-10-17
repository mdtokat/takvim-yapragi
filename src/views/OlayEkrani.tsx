import { useEffect, useState } from 'react'
import { hataBildir, olayGetir } from '../lib/api'
import { AYLAR, yilMetni, yilOnce } from '../lib/tarih'
import { kategoriAdi, type Olay } from '../lib/tipler'
import { linkAc } from '../lib/platform'
import { GeriDugmesi } from '../components/GeriDugmesi'

const TUR_METNI = { olay: 'Olay', dogum: 'Doğum', olum: 'Ölüm' } as const

export function OlayEkrani({ id }: { id: number }) {
  const [olay, setOlay] = useState<Olay | null | undefined>(undefined)
  const [hata, setHata] = useState(false)
  const [formAcik, setFormAcik] = useState(false)
  const [not, setNot] = useState('')
  const [gonderim, setGonderim] = useState<'bos' | 'gonderiliyor' | 'tamam' | 'hata'>('bos')

  useEffect(() => {
    let iptal = false
    olayGetir(id)
      .then((o) => !iptal && setOlay(o))
      .catch(() => !iptal && setHata(true))
    return () => {
      iptal = true
    }
  }, [id])

  const gonder = async () => {
    setGonderim('gonderiliyor')
    try {
      await hataBildir(id, not.trim())
      setGonderim('tamam')
    } catch {
      setGonderim('hata')
    }
  }

  if (hata) {
    return (
      <div className="sayfa">
        <GeriDugmesi />
        <p className="bos-durum">Kayıt yüklenemedi. Bağlantını kontrol edip yeniden dene.</p>
      </div>
    )
  }
  if (olay === undefined) {
    return (
      <div className="sayfa" aria-busy="true">
        <GeriDugmesi />
        <div className="iskelet iskelet-buyuk" />
        <div className="iskelet" />
        <div className="iskelet" />
        <div className="iskelet kisa" />
      </div>
    )
  }
  if (olay === null) {
    return (
      <div className="sayfa">
        <GeriDugmesi />
        <p className="bos-durum">Bu kayıt artık yayında değil.</p>
      </div>
    )
  }

  return (
    <article className="sayfa olay-detay">
      <GeriDugmesi />
      <p className="olay-detay-yil">{yilMetni(olay.yil)}</p>
      <p className="olay-detay-tarih">
        {olay.gun} {AYLAR[olay.ay - 1]} {yilMetni(olay.yil)}, {yilOnce(olay.yil)}
      </p>
      <h1>{olay.baslik}</h1>
      <p className="olay-detay-metin">{olay.aciklama}</p>
      <p className="olay-alt">
        <span className="etiket">{kategoriAdi(olay.kategori)}</span>
        <span className="etiket">{TUR_METNI[olay.tur]}</span>
      </p>

      <div className="dugme-grubu">
        <button className="dugme" onClick={() => void linkAc(olay.kaynak_url)}>
          Kaynağı aç
        </button>
        {!formAcik && gonderim !== 'tamam' && (
          <button className="dugme dugme-ikincil" onClick={() => setFormAcik(true)}>
            Hata bildir
          </button>
        )}
      </div>

      {formAcik && gonderim !== 'tamam' && (
        <div className="hata-formu">
          <label htmlFor="hata-not">Ne yanlış? Kısaca yaz (isteğe bağlı)</label>
          <textarea
            id="hata-not"
            maxLength={300}
            rows={3}
            value={not}
            onChange={(e) => setNot(e.target.value)}
            placeholder="Örneğin: Yıl 1923 değil 1924 olmalı."
          />
          <div className="dugme-grubu">
            <button className="dugme" disabled={gonderim === 'gonderiliyor'} onClick={() => void gonder()}>
              {gonderim === 'gonderiliyor' ? 'Gönderiliyor…' : 'Bildirimi gönder'}
            </button>
            <button className="metin-dugme" onClick={() => setFormAcik(false)}>
              Vazgeç
            </button>
          </div>
          {gonderim === 'hata' && <p className="uyari">Gönderilemedi. Bağlantını kontrol edip yeniden dene.</p>}
        </div>
      )}
      {gonderim === 'tamam' && (
        <p className="basari" role="status">
          Bildirimin alındı. Bu kayıt bir hafta içinde yeniden kontrol edilecek.
        </p>
      )}
    </article>
  )
}
