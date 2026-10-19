import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { useRota } from './lib/yonlendirme'
import { bugun } from './lib/tarih'
import { yerelUygulama } from './lib/platform'
import { bildirimleriPlanla } from './lib/bildirim'
import { hesabiBaslat } from './lib/hesap'
import { GunEkrani } from './views/GunEkrani'
import { OlayEkrani } from './views/OlayEkrani'
import { TakvimEkrani } from './views/TakvimEkrani'
import { QuizEkrani } from './views/QuizEkrani'
import { KelimeEkrani } from './views/KelimeEkrani'
import { AyarlarEkrani } from './views/AyarlarEkrani'
import { AltMenu } from './components/AltMenu'

export default function App() {
  const rota = useRota()

  useEffect(() => {
    void bildirimleriPlanla()
    hesabiBaslat()
  }, [])

  // Android geri tuşu: önce açık pencere, sonra uygulama içi geçmiş, en son çıkış.
  useEffect(() => {
    if (!yerelUygulama()) return
    const dinleyici = CapApp.addListener('backButton', ({ canGoBack }) => {
      const pencere = document.querySelector('dialog[open]')
      if (pencere) pencere.dispatchEvent(new Event('cancel', { cancelable: true }))
      else if (canGoBack && window.location.hash && window.location.hash !== '#/') history.back()
      else void CapApp.exitApp()
    })
    return () => {
      void dinleyici.then((d) => d.remove())
    }
  }, [])

  let icerik
  switch (rota.ad) {
    case 'olay':
      icerik = <OlayEkrani id={rota.id} />
      break
    case 'takvim':
      icerik = <TakvimEkrani ay={rota.ay} />
      break
    case 'quiz':
      icerik = <QuizEkrani tarih={rota.tarih} />
      break
    case 'kelime':
      icerik = <KelimeEkrani />
      break
    case 'ayarlar':
      icerik = <AyarlarEkrani />
      break
    default:
      icerik = <GunEkrani tarih={rota.tarih ?? bugun()} />
  }

  const sekme = rota.ad === 'takvim' || rota.ad === 'kelime' || rota.ad === 'ayarlar' ? rota.ad : 'bugun'

  return (
    <div className="uygulama">
      <main className="icerik">{icerik}</main>
      <AltMenu aktif={sekme} />
    </div>
  )
}
