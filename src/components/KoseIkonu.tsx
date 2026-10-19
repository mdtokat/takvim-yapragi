// Bugün ekranındaki köşelerin ikonları. Alt menüdeki çizgi ikonlarla aynı kalınlıkta; vurgu kırmızı (CSS'te).

/** Soru balonu: çizgi mürekkep, soru işareti kırmızı. */
export function SoruIkonu() {
  return (
    <svg className="kose-ikon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 3h12a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 17h-6.5l-4 3.8V17H6a2.5 2.5 0 0 1-2.5-2.5v-9A2.5 2.5 0 0 1 6 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        className="kose-ikon-vurgu"
        d="M9.6 8.4a2.4 2.4 0 1 1 3.94 1.84c-.9.6-1.54 1.1-1.54 2v.3"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle className="kose-ikon-vurgu" cx="12" cy="14.4" r="1.1" />
    </svg>
  )
}

/** Gazete bulmacası parçası: üç kare, ikisi siyah; açılan kelimenin karesi kırmızı. */
export function KelimeIkonu() {
  return (
    <svg className="kose-ikon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.8 3.5h4.7a1 1 0 0 1 1 1v4.7h-5.7zM3.5 14.8h5.7v5.7H4.5a1 1 0 0 1-1-1z" fill="currentColor" />
      <rect className="kose-ikon-vurgu" x="10.6" y="10.6" width="2.8" height="2.8" rx=".5" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}
