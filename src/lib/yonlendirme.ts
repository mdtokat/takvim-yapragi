import { useEffect, useState } from 'react'

export type Rota =
  | { ad: 'gun'; tarih: string | null }
  | { ad: 'olay'; id: number }
  | { ad: 'takvim'; ay: string | null }
  | { ad: 'quiz'; tarih: string }
  | { ad: 'ayarlar' }

export function rotaCoz(hash: string): Rota {
  const parca = hash.replace(/^#\/?/, '').split('/')
  switch (parca[0]) {
    case 'gun':
      return { ad: 'gun', tarih: parca[1] ?? null }
    case 'olay':
      return { ad: 'olay', id: Number(parca[1]) }
    case 'takvim':
      return { ad: 'takvim', ay: parca[1] ?? null }
    case 'quiz':
      return parca[1] ? { ad: 'quiz', tarih: parca[1] } : { ad: 'gun', tarih: null }
    case 'ayarlar':
      return { ad: 'ayarlar' }
    default:
      return { ad: 'gun', tarih: null }
  }
}

export const git = (yol: string) => {
  window.location.hash = yol
}

/** Aynı seviyede gezinmede geçmişi şişirmemek için kullanılır (ör. gün değiştirme). */
export const degistir = (yol: string) => {
  history.replaceState(null, '', `#${yol}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useRota(): Rota {
  const [rota, setRota] = useState(() => rotaCoz(window.location.hash))
  useEffect(() => {
    const f = () => {
      setRota(rotaCoz(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return rota
}
