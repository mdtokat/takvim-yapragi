import { useMemo } from 'react'
import type { CSSProperties } from 'react'

const RENKLER = ['var(--kirmizi)', 'var(--yesil)', 'var(--murekkep)', 'var(--altin)']

/** Quiz tam puanla bitince kısa bir kâğıt parçası yağmuru. Hareket azaltıldıysa CSS gizler. */
export function Konfeti() {
  const parcalar = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        '--x': `${Math.round(Math.random() * 100)}%`,
        '--kayma': `${Math.round(Math.random() * 120 - 60)}px`,
        '--don': `${Math.round(Math.random() * 720 - 360)}deg`,
        '--gecikme': `${Math.round(Math.random() * 350)}ms`,
        '--sure': `${1300 + Math.round(Math.random() * 900)}ms`,
        background: RENKLER[i % RENKLER.length],
      })),
    [],
  )
  return (
    <div className="konfeti" aria-hidden="true">
      {parcalar.map((p, i) => (
        <span key={i} style={p as CSSProperties} />
      ))}
    </div>
  )
}
