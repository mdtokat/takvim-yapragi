export interface Bildirim {
  id: number
  metin: string
  eylem?: { ad: string; f: () => void }
}

export function Bildirimler({ liste }: { liste: Bildirim[] }) {
  return (
    <div className="bildirimler" role="status" aria-live="polite">
      {liste.map((b) => (
        <div key={b.id} className="bildirim">
          <span>{b.metin}</span>
          {b.eylem && (
            <button className="bildirim-eylem" onClick={b.eylem.f}>
              {b.eylem.ad}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
