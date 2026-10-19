import type { ReactNode } from 'react'
import { sesCal } from '../lib/ses'

export type Sekme = 'bugun' | 'kelime' | 'sorular' | 'siralama' | 'ayarlar'

const OGELER: { id: Sekme; ad: string; yol: string; ikon: ReactNode }[] = [
  {
    id: 'bugun',
    ad: 'Bugün',
    yol: '#/',
    ikon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h12v18l-6-3-6 3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 8h6M9 11.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'kelime',
    ad: 'Kelime',
    yol: '#/kelime',
    ikon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="8" width="5" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="9.5" y="8" width="5" height="8" rx="1.2" fill="currentColor" stroke="currentColor" strokeWidth="1.8" />
        <rect x="16" y="8" width="5" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'sorular',
    ad: 'Sorular',
    yol: '#/quiz',
    ikon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6 3h12a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 17h-6.5l-4 3.8V17H6a2.5 2.5 0 0 1-2.5-2.5v-9A2.5 2.5 0 0 1 6 3z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9.6 8.4a2.4 2.4 0 1 1 3.94 1.84c-.9.6-1.54 1.1-1.54 2v.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="14.4" r="1.1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'siralama',
    ad: 'Sıralama',
    yol: '#/siralama',
    ikon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 20V9h6v11M3 20v-6h6M15 20v-8h6v8M2 20h20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'ayarlar',
    ad: 'Ayarlar',
    yol: '#/ayarlar',
    ikon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
]

export function AltMenu({ aktif }: { aktif: Sekme }) {
  return (
    <nav className="alt-menu" aria-label="Ana menü">
      {OGELER.map((o) => (
        <a
          key={o.id}
          href={o.yol}
          className="alt-menu-oge"
          aria-current={aktif === o.id ? 'page' : undefined}
          onClick={() => aktif !== o.id && sesCal('tik')}
        >
          {o.ikon}
          <span>{o.ad}</span>
        </a>
      ))}
    </nav>
  )
}
