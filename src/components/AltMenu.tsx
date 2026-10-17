import type { ReactNode } from 'react'

type Sekme = 'bugun' | 'takvim' | 'ayarlar'

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
    id: 'takvim',
    ad: 'Takvim',
    yol: '#/takvim',
    ikon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
        <a key={o.id} href={o.yol} className="alt-menu-oge" aria-current={aktif === o.id ? 'page' : undefined}>
          {o.ikon}
          <span>{o.ad}</span>
        </a>
      ))}
    </nav>
  )
}
