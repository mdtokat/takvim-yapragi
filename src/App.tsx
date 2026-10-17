import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { useRota } from './lib/yonlendirme'
import { bugun } from './lib/tarih'
import { yerelUygulama } from './lib/platform'
import { bildirimleriPlanla } from './lib/bildirim'
import { GunEkrani } from './views/GunEkrani'
import { OlayEkrani } from './views/OlayEkrani'
import { TakvimEkrani } from './views/TakvimEkrani'
import { QuizEkrani } from './views/QuizEkrani'
import { AyarlarEkrani } from './views/AyarlarEkrani'
import { AltMenu } from './components/AltMenu'

export default function App() {
  const rota = useRota()

  useEffect(() => {
    void bildirimleriPlanla()
  }, [])

  // Android geri tuşu: önce uygulama içi geçmiş, sonra çıkış.
  useEffect(() => {
    if (!yerelUygulama()) return
    const dinleyici = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.location.hash && window.location.hash !== '#/') history.back()
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
    case 'ayarlar':
      icerik = <AyarlarEkrani />
      break
    default:
      icerik = <GunEkrani tarih={rota.tarih ?? bugun()} />
  }

  const sekme = rota.ad === 'takvim' ? 'takvim' : rota.ad === 'ayarlar' ? 'ayarlar' : 'bugun'

  return (
    <div className="uygulama">
      <main className="icerik">{icerik}</main>
      <AltMenu aktif={sekme} />
    </div>
  )
}
