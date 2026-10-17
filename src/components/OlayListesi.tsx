import type { Olay } from '../lib/tipler'
import { kategoriAdi } from '../lib/tipler'
import { yilMetni, yilOnce } from '../lib/tarih'

export function OlayListesi({ olaylar, yilDonumu }: { olaylar: Olay[]; yilDonumu: boolean }) {
  const buYil = new Date().getFullYear()
  return (
    <ol className="zaman-cizelgesi">
      {olaylar.map((o) => {
        const fark = buYil - o.yil
        const donum = yilDonumu && o.yil > 0 && fark >= 25 && fark % 25 === 0
        return (
          <li key={o.id}>
            <a href={`#/olay/${o.id}`} className="olay-satir">
              <span className="olay-yil">{yilMetni(o.yil)}</span>
              <span className="olay-govde">
                <span className="olay-baslik">{o.baslik}</span>
                <span className="olay-alt">
                  <span className="etiket">{kategoriAdi(o.kategori)}</span>
                  {donum ? <span className="etiket etiket-kirmizi">{fark}. yıl dönümü</span> : <span>{yilOnce(o.yil)}</span>}
                </span>
              </span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}
