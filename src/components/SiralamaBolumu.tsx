import { useState } from 'react'
import { AdFormu } from './AdFormu'
import { oyuncuyuYenile, siralamadanCik, useOyuncu } from '../lib/siralama'

/** Ayarlar ekranında, girişli kullanıcı için sıralama adı. */
export function SiralamaBolumu() {
  const oyuncu = useOyuncu()
  const [form, setForm] = useState(false)
  const [cikisOnayi, setCikisOnayi] = useState(false)
  const [mesgul, setMesgul] = useState(false)
  const [hata, setHata] = useState('')

  if (oyuncu.durum === 'girissiz' || oyuncu.durum === 'hesapBekleniyor') return null

  const cik = async () => {
    setMesgul(true)
    setHata('')
    try {
      await siralamadanCik()
      setCikisOnayi(false)
    } catch {
      setHata('Sıralamadan çıkılamadı. Bağlantını kontrol edip yeniden dene.')
    } finally {
      setMesgul(false)
    }
  }

  return (
    <section className="ayar-bolum siralama-bolumu">
      <h2>Sıralama</h2>
      {oyuncu.durum === 'yukleniyor' ? (
        <p className="aciklama">Sıralama bilgisi yükleniyor…</p>
      ) : oyuncu.durum === 'kullanilamiyor' ? (
        <>
          <p className="aciklama">Sıralamaya şu an bağlanılamadı. Oyunlar süresiz ve puansız oynanıyor.</p>
          <div className="dugme-grubu">
            <button className="dugme dugme-ikincil" onClick={oyuncuyuYenile}>
              Yeniden dene
            </button>
          </div>
        </>
      ) : oyuncu.durum === 'adsiz' ? (
        <>
          <p className="aciklama">
            Sıralamada görünmek için Instagram kullanıcı adını ya da Facebook'taki adını yaz. Bu ad herkese görünür. Sıralamaya giren
            sorularda 30, kelimelerde 90 saniye süren olur.
          </p>
          {form ? (
            <AdFormu onKaydedildi={() => setForm(false)} />
          ) : (
            <div className="dugme-grubu">
              <button className="dugme" onClick={() => setForm(true)}>
                Sıralamaya katıl
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="hesap-ad">
            {oyuncu.oyuncu.ad}
            <small className="aciklama kucuk">{oyuncu.oyuncu.adTuru === 'instagram' ? 'Instagram kullanıcı adı' : "Facebook'taki ad"}</small>
          </p>
          {oyuncu.oyuncu.durum === 'red' && (
            <p className="uyari">Bu ad sıralamada gösterilmiyor. Kendine ait, uygun bir ad seçip yeniden kaydet.</p>
          )}
          <p className="aciklama">Bugünün soruları ve kelimeleri süreli oynanır; puanların günlük ve haftalık sıralamaya girer.</p>
          {form ? (
            <AdFormu onKaydedildi={() => setForm(false)} />
          ) : cikisOnayi ? (
            <div className="hesap-onay">
              <p>Sıralamadaki adın ve bütün puanların silinecek. Oyunlar süresiz ve puansız oynanmaya devam eder.</p>
              <div className="dugme-grubu">
                <button className="dugme" disabled={mesgul} onClick={() => void cik()}>
                  Evet, sıralamadan çık
                </button>
                <button className="dugme dugme-ikincil" disabled={mesgul} onClick={() => setCikisOnayi(false)}>
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <div className="dugme-grubu">
              <button className="dugme dugme-ikincil" onClick={() => setForm(true)}>
                Adı değiştir
              </button>
              <a className="metin-dugme" href="#/siralama">
                Sıralamayı gör
              </a>
              <button className="metin-dugme" onClick={() => setCikisOnayi(true)}>
                Sıralamadan çık
              </button>
            </div>
          )}
        </>
      )}
      {hata && <p className="uyari">{hata}</p>}
    </section>
  )
}
