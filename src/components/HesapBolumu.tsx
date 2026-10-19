import { useState } from 'react'
import { HesapHatasi, cikisYap, googleIleGiris, hesabiSil, useHesap } from '../lib/hesap'
import { yerelUygulama } from '../lib/platform'
import { siralamaKaydiniSil } from '../lib/siralama'

const HATA_METNI: Record<HesapHatasi['kod'], string> = {
  android: 'Android uygulamasında Google ile giriş yakında gelecek. Şimdilik web sitesinden giriş yapabilirsin.',
  iptal: '',
  baglanti: 'Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.',
  bilinmeyen: 'Giriş yapılamadı. Biraz sonra yeniden dene.',
}

/** Ayarlar ekranındaki hesap bölümü. Firebase ayarlanmamışsa hiç gösterilmez. */
export function HesapBolumu() {
  const { durum, hesap } = useHesap()
  const [mesgul, setMesgul] = useState(false)
  const [not, setNot] = useState('')
  const [silmeOnayi, setSilmeOnayi] = useState(false)

  if (durum === 'kapali') return null

  const calistir = async (f: () => Promise<void>, hataMetni: string) => {
    setMesgul(true)
    setNot('')
    try {
      await f()
    } catch (e) {
      setNot(e instanceof HesapHatasi ? HATA_METNI[e.kod] : hataMetni)
    } finally {
      setMesgul(false)
    }
  }

  return (
    <section className="ayar-bolum hesap-bolumu">
      <h2>Hesap</h2>
      {durum === 'yukleniyor' ? (
        <p className="aciklama">Hesap bilgisi yükleniyor…</p>
      ) : durum === 'girisli' && hesap ? (
        <>
          <p className="hesap-ad">
            {hesap.ad ?? 'Google hesabı'}
            {hesap.eposta && <small className="aciklama kucuk">{hesap.eposta}</small>}
          </p>
          <p className="aciklama">Kelime ve quiz sonuçların hesabına kaydediliyor; başka bir cihazda giriş yapınca orada da görünür.</p>
          {silmeOnayi ? (
            <div className="hesap-onay">
              <p>Hesabın, hesaba kayıtlı bütün sonuçların ve sıralamadaki adın ile puanların silinecek. Bu işlem geri alınamaz.</p>
              <div className="dugme-grubu">
                <button
                  className="dugme"
                  disabled={mesgul}
                  onClick={() =>
                    void calistir(async () => {
                      await siralamaKaydiniSil()
                      await hesabiSil()
                    }, 'Hesap silinemedi. Bağlantını kontrol edip yeniden dene.').then(() => setSilmeOnayi(false))
                  }
                >
                  Evet, hesabımı sil
                </button>
                <button className="dugme dugme-ikincil" disabled={mesgul} onClick={() => setSilmeOnayi(false)}>
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <div className="dugme-grubu">
              <button className="dugme dugme-ikincil" disabled={mesgul} onClick={() => void calistir(cikisYap, 'Çıkış yapılamadı. Yeniden dene.')}>
                Çıkış yap
              </button>
              <button className="metin-dugme" disabled={mesgul} onClick={() => setSilmeOnayi(true)}>
                Hesabımı sil
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="aciklama">
            Giriş yapmadan da oynayabilirsin; sonuçların bu cihazda saklanır. Google ile giriş yaparsan kelime ve quiz sonuçların
            hesabına kaydedilir ve başka cihazlarda da görünür.
          </p>
          {yerelUygulama() ? (
            <p className="aciklama kucuk">{HATA_METNI.android}</p>
          ) : (
            <div className="dugme-grubu">
              <button className="dugme" disabled={mesgul} onClick={() => void calistir(googleIleGiris, HATA_METNI.bilinmeyen)}>
                {mesgul ? 'Giriş yapılıyor…' : 'Google ile giriş yap'}
              </button>
            </div>
          )}
        </>
      )}
      {not && <p className="uyari">{not}</p>}
    </section>
  )
}
