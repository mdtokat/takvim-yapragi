import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { Share } from '@capacitor/share'

export const yerelUygulama = () => Capacitor.isNativePlatform()

export async function linkAc(url: string) {
  if (yerelUygulama()) await Browser.open({ url })
  else window.open(url, '_blank', 'noopener,noreferrer')
}

export async function paylas(metin: string): Promise<'paylasildi' | 'kopyalandi' | 'olmadi'> {
  try {
    if (yerelUygulama()) {
      await Share.share({ text: metin })
      return 'paylasildi'
    }
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text: metin })
      return 'paylasildi'
    }
    await navigator.clipboard.writeText(metin)
    return 'kopyalandi'
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'paylasildi'
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
