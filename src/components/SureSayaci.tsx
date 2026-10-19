import { useEffect, useRef, useState } from 'react'

interface Props {
  bitis: number // ms; sürenin bittiği an (cihaz saatiyle)
  toplam: number // ms; çubuğun dolu hali
  onBitti: () => void // süre bitince bir kez çağrılır
}

/** Sıralamaya giren soru ve kelimede kalan süre: ince çubuk ve saniye. Son 10 saniye kırmızıdır. */
export function SureSayaci({ bitis, toplam, onBitti }: Props) {
  const [simdi, setSimdi] = useState(() => Date.now())
  const bitti = useRef(onBitti)
  bitti.current = onBitti

  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now()
      setSimdi(n)
      if (n >= bitis) {
        clearInterval(t)
        bitti.current()
      }
    }, 200)
    return () => clearInterval(t)
  }, [bitis])

  const kalan = Math.max(0, bitis - simdi)
  const saniye = Math.ceil(kalan / 1000)
  return (
    <div className={`sure-sayaci${saniye <= 10 ? ' az' : ''}`} role="timer" aria-label={`${saniye} saniye kaldı`}>
      <span className="sure-cubuk" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (kalan / toplam) * 100)}%` }} />
      </span>
      <span className="sure-saniye" aria-hidden="true">
        {saniye} sn
      </span>
    </div>
  )
}
