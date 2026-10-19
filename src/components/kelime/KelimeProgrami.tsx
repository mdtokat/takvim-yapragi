import { DENEME_SAYISI, kazanildi } from '../../lib/harfler'
import type { KelimeSlotu, Satir } from '../../lib/kelimeOyunu'
import { SLOT_ADI, type Slot } from '../../lib/sabitler'
import { saatMetni, sureMetni } from '../../lib/tarih'

interface Props {
  slotlar: KelimeSlotu[]
  oyunlar: Partial<Record<Slot, Satir[]>>
  secili: Slot | null
  simdi: number
  pasif: boolean
  onSec: (s: KelimeSlotu) => void
}

/** Günün üç kelimesi: her biri videosunun saatinde açılır. Kilitli kelime açılışına kalan süreyi gösterir. */
export function KelimeProgrami({ slotlar, oyunlar, secili, simdi, pasif, onSec }: Props) {
  // Yalnızca en yakın kilitli kelime geri sayım gösterir; sonrakiler saatini.
  const siradaki = slotlar.find((s) => !s.acik)?.slot
  return (
    <div className="kelime-program" role="tablist" aria-label="Günün kelimeleri">
      {slotlar.map((s) => {
        const o = oyunlar[s.slot] ?? []
        const kazandi = kazanildi(o)
        const bitti = kazandi || o.length >= DENEME_SAYISI
        let durum: string
        let sinif = ''
        const kalan = Date.parse(s.acilis) - simdi
        if (!s.acik) {
          durum = s.slot !== siradaki ? 'Kilitli' : kalan > 0 ? `${sureMetni(kalan)} sonra` : 'Açılıyor…'
          sinif = ' kilitli'
        } else if (kazandi) {
          durum = `Buldun · ${o.length}/${DENEME_SAYISI}`
          sinif = ' kazandi'
        } else if (bitti) {
          durum = 'Bulunamadı'
          sinif = ' kaybetti'
        } else if (o.length > 0) durum = `${o.length}/${DENEME_SAYISI} deneme`
        else durum = 'Seni bekliyor'
        return (
          <button
            key={s.slot}
            role="tab"
            aria-selected={secili === s.slot}
            className={`program-kart${sinif}`}
            disabled={pasif}
            onClick={() => onSec(s)}
          >
            <span className="program-ust">
              <span className="program-ad">{SLOT_ADI[s.slot]}</span>
              <span className="program-saat">{saatMetni(s.acilis)}</span>
            </span>
            <span className="program-durum">{durum}</span>
          </button>
        )
      })}
    </div>
  )
}
