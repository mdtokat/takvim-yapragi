import { KATEGORILER, type Kategori } from '../lib/tipler'
import { sesCal } from '../lib/ses'

interface Props {
  secili: Kategori[]
  onDegis: (k: Kategori[]) => void
}

export function KategoriSecici({ secili, onDegis: degis }: Props) {
  const tumu = secili.length === 0
  const onDegis = (k: Kategori[]) => {
    sesCal('tik')
    degis(k)
  }
  return (
    <div className="cipler" role="group" aria-label="Kategori filtresi">
      <button className="cip" aria-pressed={tumu} onClick={() => onDegis([])}>
        Tümü
      </button>
      {KATEGORILER.map((k) => {
        const acik = secili.includes(k.id)
        return (
          <button
            key={k.id}
            className="cip"
            aria-pressed={acik}
            onClick={() => onDegis(acik ? secili.filter((x) => x !== k.id) : [...secili, k.id])}
          >
            {k.ad}
          </button>
        )
      })}
    </div>
  )
}
