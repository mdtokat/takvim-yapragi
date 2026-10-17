import { DENEME_SAYISI, KELIME_UZUNLUGU, type Durum } from '../../lib/harfler'
import type { Satir } from '../../lib/kelimeOyunu'

const DURUM_METNI: Record<Durum, string> = { yesil: 'doğru yerde', sari: 'kelimede var, yeri yanlış', gri: 'kelimede yok' }

interface Props {
  satirlar: Satir[]
  mevcut: string
  acilanSatir: number | null // açılış animasyonu oynatılacak satır
  sallanan: boolean
  zipla: number | null // kazanılan satır
}

export function Izgara({ satirlar, mevcut, acilanSatir, sallanan, zipla }: Props) {
  return (
    <div className="izgara" role="grid" aria-label="Tahmin tahtası">
      {Array.from({ length: DENEME_SAYISI }, (_, r) => {
        const gonderilmis = satirlar[r]
        const aktif = r === satirlar.length
        const harfler = gonderilmis ? [...gonderilmis.tahmin] : aktif ? [...mevcut] : []
        return (
          <div key={r} role="row" className={`izgara-satir${aktif && sallanan ? ' salla' : ''}`}>
            {Array.from({ length: KELIME_UZUNLUGU }, (_, c) => {
              const harf = harfler[c] ?? ''
              const durum = gonderilmis?.sonuc[c]
              let sinif = 'karo'
              if (durum) sinif += ` karo-${durum}`
              else if (harf) sinif += ' karo-dolu'
              if (durum && r === acilanSatir) sinif += ' cevir'
              if (r === zipla) sinif += ' zipla'
              return (
                <div
                  key={c}
                  role="gridcell"
                  className={sinif}
                  style={{ ['--i' as string]: c }}
                  aria-label={harf ? `${harf}${durum ? `, ${DURUM_METNI[durum]}` : ''}` : 'boş'}
                >
                  {harf}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
