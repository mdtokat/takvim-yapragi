export function GeriDugmesi() {
  const geri = () => {
    if (history.length > 1) history.back()
    else window.location.hash = '/'
  }
  return (
    <button className="geri-dugmesi" onClick={geri}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Geri
    </button>
  )
}
