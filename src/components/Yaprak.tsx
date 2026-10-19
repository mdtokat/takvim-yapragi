import { useRef, type CSSProperties } from 'react'
import { AYLAR, GUNLER, artikYil, bugun, tarihCoz, yilinGunu } from '../lib/tarih'
import type { GununBilgisi } from '../lib/tipler'
import { kategoriAdi } from '../lib/tipler'
import { hareketAzalt, linkAc } from '../lib/platform'

interface Props {
  tarih: string
  bilgi: GununBilgisi | null | undefined // undefined = yükleniyor
  onDegis?: (gun: number, cekme: number) => void
  onGit?: (tarih: string) => void
  /** Geçiş sırasında gösterilen eski yaprak: koparılıp düşen ya da alttan görünen kopya. */
  kopya?: 'kopan' | 'alttaki'
  /** Önceki güne dönülürken yeni yaprak yukarıdan iner. */
  inis?: boolean
  /** Kopan kopyanın, parmağın bıraktığı açıdan başlaması için. */
  cekme?: number
  onBitti?: () => void
}

const ESIK = 60

export function Yaprak({ tarih, bilgi, onDegis, onGit, kopya, inis, cekme = 0, onBitti }: Props) {
  const d = tarihCoz(tarih)!
  const buYil = new Date().getFullYear()
  const pazar = d.getDay() === 0
  const ref = useRef<HTMLElement>(null)
  const dokunus = useRef<{ x: number; y: number; p: number } | null>(null)
  const yirmiDokuzSubat = d.getMonth() === 1 && d.getDate() === 28 && !artikYil(d.getFullYear())

  const sonArtikYil = () => {
    let y = buYil
    while (!artikYil(y)) y--
    return y
  }

  // Parmakla çekerken sayfa sol kenarından dönmeye başlar; bırakınca ya çevrilir ya yerine oturur.
  const egimVer = (p: number) => {
    const el = ref.current
    if (!el) return
    el.style.transform = p ? `rotateY(${(p * 14).toFixed(2)}deg)` : ''
    el.classList.toggle('yaprak-cekiliyor', p !== 0)
  }

  const sinif = ['yaprak', kopya && `yaprak-${kopya}`, inis && 'yaprak-inis'].filter(Boolean).join(' ')

  return (
    <article
      ref={ref}
      className={sinif}
      inert={kopya ? true : undefined}
      aria-hidden={kopya ? true : undefined}
      style={kopya === 'kopan' ? ({ '--cek': cekme } as CSSProperties) : undefined}
      onAnimationEnd={(e) => e.target === e.currentTarget && onBitti?.()}
      onTouchStart={(e) => {
        if (kopya) return
        dokunus.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, p: 0 }
        if (ref.current) ref.current.style.transition = 'none'
      }}
      onTouchMove={(e) => {
        const b = dokunus.current
        if (!b || hareketAzalt()) return
        const dx = e.touches[0].clientX - b.x
        const dy = e.touches[0].clientY - b.y
        if (Math.abs(dx) < Math.abs(dy)) return
        b.p = Math.max(-1, Math.min(1, dx / 220))
        egimVer(b.p)
      }}
      onTouchEnd={(e) => {
        const b = dokunus.current
        dokunus.current = null
        if (!b) return
        const dx = e.changedTouches[0].clientX - b.x
        const dy = e.changedTouches[0].clientY - b.y
        if (Math.abs(dx) > ESIK && Math.abs(dx) > Math.abs(dy) * 1.5) {
          onDegis?.(dx < 0 ? 1 : -1, b.p)
          return
        }
        if (ref.current) ref.current.style.transition = ''
        egimVer(0)
      }}
      onTouchCancel={() => {
        dokunus.current = null
        if (ref.current) ref.current.style.transition = ''
        egimVer(0)
      }}
    >
      <header className="yaprak-ust">
        <button className="yaprak-ok" onClick={() => onDegis?.(-1, 0)} aria-label="Önceki gün">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="yaprak-tarih">
          <a className="yaprak-tarih-baglanti" href={`#/takvim/${tarih.slice(0, 7)}`} aria-label={`${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()} ${GUNLER[d.getDay()]}. Takvimi aç`}>
            <span className="yaprak-gun">{d.getDate()}</span>
            <span className="yaprak-tarih-yan">
              <span className="yaprak-ay">
                {AYLAR[d.getMonth()]} {d.getFullYear()}
              </span>
              <span className={`yaprak-hafta${pazar ? ' kirmizi' : ''}`}>{GUNLER[d.getDay()]}</span>
            </span>
          </a>
        </h1>
        <button className="yaprak-ok" onClick={() => onDegis?.(1, 0)} aria-label="Sonraki gün">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>
      <p className="yaprak-yilin-gunu">Yılın {yilinGunu(d)}. günü</p>

      {(tarih !== bugun() || yirmiDokuzSubat) && (
        <div className="yaprak-baglantilar">
          {tarih !== bugun() && (
            <button className="metin-dugme" onClick={() => onGit?.(bugun())}>
              Bugüne dön
            </button>
          )}
          {yirmiDokuzSubat && (
            <button className="metin-dugme" onClick={() => onGit?.(`${sonArtikYil()}-02-29`)}>
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
        <section className="gunun-bilgisi" aria-labelledby={kopya ? undefined : 'gb-baslik'}>
          <p className="gunun-bilgisi-etiket">Günün bilgisi · {kategoriAdi(bilgi.kategori)}</p>
          <h2 id={kopya ? undefined : 'gb-baslik'}>{bilgi.baslik}</h2>
          <p className="gunun-bilgisi-metin">{bilgi.metin}</p>
          <button className="kaynak-link" onClick={() => void linkAc(bilgi.kaynak_url)}>
            Kaynağı aç
          </button>
        </section>
      ) : null}
    </article>
  )
}
