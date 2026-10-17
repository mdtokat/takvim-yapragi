import { useRef } from 'react'
import { AYLAR, GUNLER, artikYil, bugun, tarihCoz } from '../lib/tarih'
import type { GununBilgisi } from '../lib/tipler'
import { kategoriAdi } from '../lib/tipler'
import { linkAc } from '../lib/platform'

interface Props {
  tarih: string
  bilgi: GununBilgisi | null | undefined // undefined = yükleniyor
  yon: 'ileri' | 'geri' | null
  onDegis: (gun: number) => void
  onGit: (tarih: string) => void
}

export function Yaprak({ tarih, bilgi, yon, onDegis, onGit }: Props) {
  const d = tarihCoz(tarih)!
  const buYil = new Date().getFullYear()
  const pazar = d.getDay() === 0
  const dokunus = useRef<{ x: number; y: number } | null>(null)
  const yirmiDokuzSubat = d.getMonth() === 1 && d.getDate() === 28 && !artikYil(d.getFullYear())

  const sonArtikYil = () => {
    let y = buYil
    while (!artikYil(y)) y--
    return y
  }

  return (
    <article
      key={tarih}
      className={`yaprak${yon ? ` yaprak-gel-${yon}` : ''}`}
      onTouchStart={(e) => (dokunus.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const b = dokunus.current
        dokunus.current = null
        if (!b) return
        const dx = e.changedTouches[0].clientX - b.x
        const dy = e.changedTouches[0].clientY - b.y
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onDegis(dx < 0 ? 1 : -1)
      }}
    >
      <div className="yaprak-delikler" aria-hidden="true" />
      <header className="yaprak-ust">
        <button className="yaprak-ok" onClick={() => onDegis(-1)} aria-label="Önceki gün">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="yaprak-tarih">
          <span className="yaprak-ay">{AYLAR[d.getMonth()]}</span>
          <span className={`yaprak-gun${pazar ? ' kirmizi' : ''}`}>{d.getDate()}</span>
          <span className="yaprak-hafta">
            {GUNLER[d.getDay()]}
            {d.getFullYear() !== buYil ? `, ${d.getFullYear()}` : ''}
          </span>
        </h1>
        <button className="yaprak-ok" onClick={() => onDegis(1)} aria-label="Sonraki gün">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {(tarih !== bugun() || yirmiDokuzSubat) && (
        <div className="yaprak-baglantilar">
          {tarih !== bugun() && (
            <button className="metin-dugme" onClick={() => onGit(bugun())}>
              Bugüne dön
            </button>
          )}
          {yirmiDokuzSubat && (
            <button className="metin-dugme" onClick={() => onGit(`${sonArtikYil()}-02-29`)}>
              29 Şubat'ı da gör
            </button>
          )}
        </div>
      )}

      {bilgi === undefined ? (
        <div className="gunun-bilgisi">
          <div className="iskelet iskelet-baslik" />
          <div className="iskelet" />
          <div className="iskelet kisa" />
        </div>
      ) : bilgi ? (
        <section className="gunun-bilgisi" aria-labelledby="gb-baslik">
          <p className="gunun-bilgisi-etiket">
            Günün bilgisi <span className="etiket">{kategoriAdi(bilgi.kategori)}</span>
          </p>
          <h2 id="gb-baslik">{bilgi.baslik}</h2>
          <p>{bilgi.metin}</p>
          <button className="kaynak-link" onClick={() => void linkAc(bilgi.kaynak_url)}>
            Kaynağı aç
          </button>
        </section>
      ) : null}
    </article>
  )
}
