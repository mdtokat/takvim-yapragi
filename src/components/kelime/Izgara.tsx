import { DENEME_SAYISI, KELIME_UZUNLUGU, type Durum } from '../../lib/harfler'
import type { Satir } from '../../lib/kelimeOyunu'

const DURUM_METNI: Record<Durum, string> = { yesil: 'doğru yerde', sari: 'kelimede var, yeri yanlış', gri: 'kelimede yok' }

interface Props {
  satirlar: Satir[]
  mevcut: string
  acilanSatir: number | null // açılış animasyonu oynatılacak satır
  sallanan: boolean
  zipla: number | null // kazanılan satır
  yaziliyor: boolean // etkin satıra harf girilebilir mi (imleç gösterilir)
}

export function Izgara({ satirlar, mevcut, acilanSatir, sallanan, zipla, yaziliyor }: Props) {
  return (
    <div className="izgara" role="grid" aria-label="Tahmin tahtası">
      {Array.from({ length: DENEME_SAYISI }, (_, r) => {
        const gonderilmis = satirlar[r]
        const aktif = r === satirlar.length
        const harfler = gonderilmis ? [...gonderilmis.tahmin] : aktif ? [...mevcut] : []
        const etkin = aktif && yaziliyor
        return (
          <div key={r} role="row" className={`izgara-satir${etkin ? ' etkin' : ''}${etkin && sallanan ? ' salla' : ''}`}>
            <span className="izgara-no" aria-hidden="true">
              {r + 1}
            </span>
            {Array.from({ length: KELIME_UZUNLUGU }, (_, c) => {
              const harf = harfler[c] ?? ''
              const durum = gonderilmis?.sonuc[c]
              let sinif = 'karo'
              if (durum) sinif += ` karo-${durum}`
              else if (harf) sinif += ' karo-dolu'
              else if (etkin && c === harfler.length) sinif += ' karo-imlec'
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
