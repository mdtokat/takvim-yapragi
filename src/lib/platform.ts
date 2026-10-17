import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

export const yerelUygulama = () => Capacitor.isNativePlatform()

export async function linkAc(url: string) {
  if (yerelUygulama()) await Browser.open({ url })
  else window.open(url, '_blank', 'noopener,noreferrer')
}

export async function paylas(metin: string): Promise<'paylasildi' | 'kopyalandi' | 'olmadi'> {
  try {
    if (navigator.share) {
      await navigator.share({ text: metin })
      return 'paylasildi'
    }
    await navigator.clipboard.writeText(metin)
    return 'kopyalandi'
  } catch {
    return 'olmadi'
  }
}

/** Kullanıcı sistemde hareketi azaltmayı seçtiyse animasyonlu geçişler atlanır. */
export function hareketAzalt(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
