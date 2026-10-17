import { useState } from 'react'
import { ayarlariGuncelle, useAyarlar, type Tema } from '../lib/ayarlar'
import { bildirimleriPlanla, izinIste } from '../lib/bildirim'
import { linkAc, yerelUygulama } from '../lib/platform'
import { KategoriSecici } from '../components/KategoriSecici'
import { SITE_URL, SOSYAL_HESAPLAR, SURUM, UYGULAMA_ADI } from '../lib/sabitler'
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
        setIzinNotu(`Bildirim izni verilmedi. Telefonun ayarlarından ${UYGULAMA_ADI} için bildirimleri açabilirsin.`)
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
              <span>Her gün yaprağı ve kelimeyi hatırlat</span>
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
        <h2>Kelime oyunu</h2>
        <label className="anahtar-satir">
          <span>
            Zor mod
            <small className="aciklama kucuk ayar-not">
              Bulduğun ipuçlarını sonraki tahminlerde kullanmak zorundasın. Oyun başladıysa değişiklik ertesi gün geçerli olur.
            </small>
          </span>
          <input type="checkbox" role="switch" checked={ayar.zorMod} onChange={(e) => ayarlariGuncelle({ zorMod: e.target.checked })} />
        </label>
        <label className="anahtar-satir">
          <span>
            Renk körü modu
            <small className="aciklama kucuk ayar-not">Yeşil ve sarı yerine turuncu ve mavi kullanılır.</small>
          </span>
          <input type="checkbox" role="switch" checked={ayar.renkKoru} onChange={(e) => ayarlariGuncelle({ renkKoru: e.target.checked })} />
        </label>
      </section>

      <section className="ayar-bolum">
        <h2>Gösterilen kategoriler</h2>
        <p className="aciklama">Seçtiğin kategoriler bugünün yaprağında filtre olarak uygulanır.</p>
        <KategoriSecici secili={ayar.kategoriler} onDegis={(k) => ayarlariGuncelle({ kategoriler: k })} />
      </section>

      <section className="ayar-bolum">
        <h2>Hakkında</h2>
        <p className="aciklama">
          {UYGULAMA_ADI}'teki içerik yapay zekâ ile hazırlanır ve her kayıt bir kaynakla doğrulanır. Günün soruları ve kelimesi
          o günün {UYGULAMA_ADI} videolarından gelir; her soru kendi videosuyla aynı saatte açılır. Bir hata görürsen kaydın
          sayfasındaki "Hata bildir" ile haber ver; kayıt yeniden kontrol edilir.
        </p>
        <div className="dugme-grubu">
          {SOSYAL_HESAPLAR.map((h) => (
            <button key={h.ad} className="dugme dugme-ikincil" onClick={() => void linkAc(h.url)}>
              {h.ad}
            </button>
          ))}
          <button className="dugme dugme-ikincil" onClick={() => void linkAc(`${SITE_URL}gizlilik.html`)}>
            Gizlilik politikası
          </button>
        </div>
        <p className="aciklama kucuk">Sürüm {SURUM}</p>
      </section>
    </div>
  )
}
