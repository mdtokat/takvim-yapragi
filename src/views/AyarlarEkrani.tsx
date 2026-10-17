import { useState } from 'react'
import { ayarlariGuncelle, useAyarlar, type Tema } from '../lib/ayarlar'
import { bildirimleriPlanla, izinIste } from '../lib/bildirim'
import { linkAc, yerelUygulama } from '../lib/platform'
import { KategoriSecici } from '../components/KategoriSecici'
import { SITE_URL, SURUM } from '../lib/sabitler'
import { sesCal } from '../lib/ses'

const TEMALAR: { id: Tema; ad: string }[] = [
  { id: 'sistem', ad: 'Sistem' },
  { id: 'acik', ad: 'Açık' },
  { id: 'koyu', ad: 'Koyu' },
]

export function AyarlarEkrani() {
  const ayar = useAyarlar()
  const [izinNotu, setIzinNotu] = useState('')
  const yerel = yerelUygulama()

  const bildirimDegis = async (acik: boolean) => {
    setIzinNotu('')
    if (acik) {
      const izin = await izinIste()
      if (!izin) {
        setIzinNotu('Bildirim izni verilmedi. Telefonun ayarlarından Takvim Yaprağı için bildirimleri açabilirsin.')
        return
      }
    }
    ayarlariGuncelle({ bildirim: acik })
    await bildirimleriPlanla()
  }

  return (
    <div className="sayfa ayarlar">
      <h1>Ayarlar</h1>

      <section className="ayar-bolum">
        <h2>Görünüm ve ses</h2>
        <div className="bolumlu-secici" role="radiogroup" aria-label="Tema">
          {TEMALAR.map((t) => (
            <button key={t.id} role="radio" aria-checked={ayar.tema === t.id} onClick={() => {
                sesCal('tik')
                ayarlariGuncelle({ tema: t.id })
              }}>
              {t.ad}
            </button>
          ))}
        </div>
        <label className="anahtar-satir">
          <span>Ses efektleri</span>
          <input
            type="checkbox"
            role="switch"
            checked={ayar.ses}
            onChange={(e) => {
              ayarlariGuncelle({ ses: e.target.checked })
              sesCal('yirt')
            }}
          />
        </label>
      </section>

      <section className="ayar-bolum">
        <h2>Günlük bildirim</h2>
        {yerel ? (
          <>
            <label className="anahtar-satir">
              <span>Her gün takvim yaprağını hatırlat</span>
              <input
                type="checkbox"
                role="switch"
                checked={ayar.bildirim}
                onChange={(e) => void bildirimDegis(e.target.checked)}
              />
            </label>
            {ayar.bildirim && (
              <label className="anahtar-satir">
                <span>Bildirim saati</span>
                <input
                  type="time"
                  value={ayar.bildirimSaati}
                  onChange={(e) => {
                    ayarlariGuncelle({ bildirimSaati: e.target.value || '09:00' })
                    void bildirimleriPlanla()
                  }}
                />
              </label>
            )}
            {izinNotu && <p className="uyari">{izinNotu}</p>}
          </>
        ) : (
          <p className="aciklama">Günlük bildirimler Android uygulamasında kullanılabilir.</p>
        )}
      </section>

      <section className="ayar-bolum">
        <h2>Gösterilen kategoriler</h2>
        <p className="aciklama">Seçtiğin kategoriler bugünün yaprağında filtre olarak uygulanır.</p>
        <KategoriSecici secili={ayar.kategoriler} onDegis={(k) => ayarlariGuncelle({ kategoriler: k })} />
      </section>

      <section className="ayar-bolum">
        <h2>Hakkında</h2>
        <p className="aciklama">
          Takvim Yaprağı'ndaki içerik yapay zekâ ile hazırlanır ve her kayıt bir kaynakla doğrulanır. Bir hata görürsen kaydın
          sayfasındaki "Hata bildir" ile haber ver; kayıt yeniden kontrol edilir.
        </p>
        <div className="dugme-grubu">
          <button className="dugme dugme-ikincil" onClick={() => void linkAc(`${SITE_URL}gizlilik.html`)}>
            Gizlilik politikası
          </button>
        </div>
        <p className="aciklama kucuk">Sürüm {SURUM}</p>
      </section>
    </div>
  )
}
