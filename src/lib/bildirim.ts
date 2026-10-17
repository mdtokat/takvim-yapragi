import { LocalNotifications } from '@capacitor/local-notifications'
import { yerelUygulama } from './platform'
import { ayarlariOku } from './ayarlar'
import { yaklasanBilgiler } from './api'
import { bugun, gunEkle, tarihCoz } from './tarih'

export async function izinIste(): Promise<boolean> {
  if (!yerelUygulama()) return false
  const mevcut = await LocalNotifications.checkPermissions()
  if (mevcut.display === 'granted') return true
  const sonuc = await LocalNotifications.requestPermissions()
  return sonuc.display === 'granted'
}

/**
 * Önümüzdeki 7 günün bildirimlerini yeniden planlar. Başlık, o günün bilgisinin başlığıdır.
 * Uygulama her açıldığında çağrılır; kullanıcı uzun süre açmazsa bildirimler kendiliğinden durur.
 */
export async function bildirimleriPlanla(): Promise<void> {
  if (!yerelUygulama()) return
  try {
    const bekleyen = await LocalNotifications.getPending()
    if (bekleyen.notifications.length) {
      await LocalNotifications.cancel({ notifications: bekleyen.notifications.map((n) => ({ id: n.id })) })
    }
    const ayar = ayarlariOku()
    if (!ayar.bildirim) return
    const izin = await LocalNotifications.checkPermissions()
    if (izin.display !== 'granted') return

    const [saat, dakika] = ayar.bildirimSaati.split(':').map(Number)
    let bilgiler: Awaited<ReturnType<typeof yaklasanBilgiler>> = []
    try {
      bilgiler = await yaklasanBilgiler(bugun())
    } catch {
      /* çevrimdışı: genel metinle planla */
    }
    const simdi = Date.now()
    const liste = []
    for (let i = 0; i < 7; i++) {
      const tarih = gunEkle(bugun(), i)
      const d = tarihCoz(tarih)!
      d.setHours(saat, dakika, 0, 0)
      if (d.getTime() <= simdi) continue
      const bilgi = bilgiler.find((b) => b.tarih === tarih)
      liste.push({
        id: Number(tarih.replaceAll('-', '').slice(2)), // ör. 261017
        title: bilgi ? bilgi.baslik : 'Bugün tarihte neler oldu?',
        body: bilgi ? 'Günün bilgisi ve tarihte bugün seni bekliyor.' : 'Yeni takvim yaprağın hazır.',
        schedule: { at: d, allowWhileIdle: true },
      })
    }
    if (liste.length) await LocalNotifications.schedule({ notifications: liste })
  } catch (e) {
    console.warn('Bildirim planlanamadı', e)
  }
}
