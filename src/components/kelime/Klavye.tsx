import { KLAVYE_SATIRLARI, type Durum } from '../../lib/harfler'

interface Props {
  durumlar: Record<string, Durum>
  pasif: boolean
  onHarf: (h: string) => void
  onGir: () => void
  onSil: () => void
}

export function Klavye({ durumlar, pasif, onHarf, onGir, onSil }: Props) {
  return (
    <div className="klavye" aria-label="Klavye">
      {KLAVYE_SATIRLARI.map((satir, i) => (
        <div key={i} className="klavye-satir">
          {satir.map((t) => {
            if (t === 'GIR')
              return (
                <button key={t} className="tus tus-genis" onClick={onGir} disabled={pasif}>
                  Gir
                </button>
              )
            if (t === 'SIL')
              return (
                <button key={t} className="tus tus-genis" onClick={onSil} disabled={pasif} aria-label="Harf sil">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 9.5l5 5M17 9.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )
            const d = durumlar[t]
            return (
              <button key={t} className={`tus${d ? ` tus-${d}` : ''}`} onClick={() => onHarf(t)} disabled={pasif}>
                {t}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
