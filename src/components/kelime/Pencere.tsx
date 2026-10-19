import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  baslik: string
  sinif?: string
  onKapat: () => void
  children: ReactNode
}

export function Pencere({ baslik, sinif, onKapat, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`pencere${sinif ? ` ${sinif}` : ''}`}
      aria-label={baslik}
      onCancel={(e) => {
        e.preventDefault()
        onKapat()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onKapat()
      }}
    >
      <div className="pencere-ic">
        <header className="pencere-baslik">
          <h2>{baslik}</h2>
          <button className="ikon-dugme" onClick={onKapat} aria-label="Kapat">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
