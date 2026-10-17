import { useState } from 'react'
import { AYLAR, KISA_GUNLER, artikYil, bugun, haftaGunu, tarihMetni } from '../lib/tarih'
import { degistir, git } from '../lib/yonlendirme'
import { rastgeleDoluGun } from '../lib/api'

export function TakvimEkrani({ ay }: { ay: string | null }) {
  const simdi = new Date()
  const m = ay ? /^(\d{4})-(\d{2})$/.exec(ay) : null
  const yil = m ? Number(m[1]) : simdi.getFullYear()
  const ayNo = m ? Number(m[2]) - 1 : simdi.getMonth()
  const [araniyor, setAraniyor] = useState(false)

  const ilk = new Date(yil, ayNo, 1)
  const gunSayisi = new Date(yil, ayNo + 1, 0).getDate()
  const bosluk = haftaGunu(ilk) - 1
  const hucreler: (Date | null)[] = [
    ...Array.from({ length: bosluk }, () => null),
    ...Array.from({ length: gunSayisi }, (_, i) => new Date(yil, ayNo, i + 1)),
  ]
  const bugunMetni = bugun()

  const ayDegis = (n: number) => {
    const d = new Date(yil, ayNo + n, 1)
    degistir(`/takvim/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const rastgele = async () => {
    setAraniyor(true)
    const g = await rastgeleDoluGun()
    setAraniyor(false)
    if (!g) return
    let y = simdi.getFullYear()
    if (g.ay === 2 && g.gun === 29) while (!artikYil(y)) y--
    git(`/gun/${tarihMetni(new Date(y, g.ay - 1, g.gun))}`)
  }

  return (
    <div className="sayfa takvim">
      <header className="takvim-baslik">
        <button className="yaprak-ok" onClick={() => ayDegis(-1)} aria-label="Önceki ay">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1>
          {AYLAR[ayNo]} <span className="takvim-yil">{yil}</span>
        </h1>
        <button className="yaprak-ok" onClick={() => ayDegis(1)} aria-label="Sonraki ay">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div className="takvim-izgara" role="grid" aria-label={`${AYLAR[ayNo]} ${yil}`}>
        {KISA_GUNLER.map((g, i) => (
          <span key={g} className={`takvim-hafta${i === 6 ? ' kirmizi' : ''}`} role="columnheader">
            {g}
          </span>
        ))}
        {hucreler.map((d, i) =>
          d ? (
            <a
              key={i}
              href={`#/gun/${tarihMetni(d)}`}
              className={`takvim-gun${d.getDay() === 0 ? ' kirmizi' : ''}${tarihMetni(d) === bugunMetni ? ' bugun' : ''}`}
              aria-current={tarihMetni(d) === bugunMetni ? 'date' : undefined}
            >
              {d.getDate()}
            </a>
          ) : (
            <span key={i} aria-hidden="true" />
          ),
        )}
      </div>

      <div className="dugme-grubu">
        <a className="dugme dugme-ikincil" href="#/">
          Bugünün yaprağı
        </a>
        <button className="dugme dugme-ikincil" disabled={araniyor} onClick={() => void rastgele()}>
          Rastgele bir gün
        </button>
      </div>
    </div>
  )
}
