import { useEffect, useState } from 'react'
import { Pencere } from './Pencere'
import type { Istatistik } from '../../lib/istatistik'
import type { BitisBilgisi, Satir } from '../../lib/kelimeOyunu'
import { genelDagilim } from '../../lib/kelimeOyunu'
import { bulmacaNo, sureMetni } from '../../lib/tarih'
import { linkAc, paylas } from '../../lib/platform'
import { zorModOyunu, useAyarlar } from '../../lib/ayarlar'
import { SITE_URL, SLOT_ADI, UYGULAMA_ADI, VIDEO_VARSAYILAN_URL, type Slot } from '../../lib/sabitler'

interface Props {
  tarih: string
  slot: Slot | null
  sonrakiAcilis: number // ms; geri sayım bu ana kadar
  satirlar: Satir[]
  bitti: boolean
  kazandi: boolean
  bitis: BitisBilgisi | null
  istatistik: Istatistik | null
  onKapat: () => void
  onBildir: (metin: string) => void
}

export function SonucPenceresi({ tarih, slot, sonrakiAcilis, satirlar, bitti, kazandi, bitis, istatistik, onKapat, onBildir }: Props) {
  const ayar = useAyarlar()
  const [kalan, setKalan] = useState(sonrakiAcilis - Date.now())
  const [genel, setGenel] = useState<{ deneme: number; oyuncu: number }[]>([])

  useEffect(() => {
    setKalan(sonrakiAcilis - Date.now())
    const t = setInterval(() => setKalan(sonrakiAcilis - Date.now()), 1000)
    return () => clearInterval(t)
  }, [sonrakiAcilis])
  useEffect(() => {
    if (bitti && slot) void genelDagilim(tarih, slot).then(setGenel)
  }, [bitti, tarih, slot])

  const paylasimMetni = () => {
    const [y, s, g] = ayar.renkKoru ? ['🟧', '🟦', '⬛'] : ['🟩', '🟨', '⬛']
    const izgara = satirlar.map((r) => r.sonuc.map((d) => (d === 'yesil' ? y : d === 'sari' ? s : g)).join('')).join('\n')
    const skor = kazandi ? satirlar.length : 'X'
    const ad = slot ? ` ${SLOT_ADI[slot]}` : ''
    const zor = slot && zorModOyunu(tarih, slot) ? '*' : ''
    return `${UYGULAMA_ADI} Kelime #${bulmacaNo(tarih)}${ad} ${skor}/6${zor}\n${izgara}\n${SITE_URL}#/kelime`
  }

  const toplamOyuncu = genel.reduce((a, b) => a + b.oyuncu, 0)
  const benimDeneme = kazandi ? satirlar.length : 0
  const benimGrup = genel.find((g) => g.deneme === benimDeneme)?.oyuncu ?? 0
  const enCok = Math.max(1, ...(istatistik?.dagilim ?? [1]))

  return (
    <Pencere baslik={bitti ? (kazandi ? 'Buldun' : 'Bu sefer olmadı') : 'İstatistikler'} onKapat={onKapat}>
      {bitti && bitis && (
        <section className="sonuc-kelime">
          <div className="sonuc-karolar" aria-label={`Kelime: ${bitis.cevap}`}>
            {[...bitis.cevap].map((h, i) => (
              <span key={i} className="karo karo-kucuk karo-yesil" aria-hidden="true">
                {h}
              </span>
            ))}
          </div>
          <p className="sonuc-anlam">{bitis.anlam}</p>
          <p className="sonuc-ornek">“{bitis.ornek}”</p>
          {slot && bitis.videoBaslik && (
            <p className="sonuc-video">
              Bu kelime bugünkü {SLOT_ADI[slot].toLocaleLowerCase('tr-TR')} videosunda geçiyor: {bitis.videoBaslik}.{' '}
              <button className="metin-dugme" onClick={() => void linkAc(VIDEO_VARSAYILAN_URL)}>
                Videoyu izle
              </button>
            </p>
          )}
        </section>
      )}

      {bitti && toplamOyuncu >= 5 && (
        <p className="sonuc-genel">
          {kazandi ? 'Seninle aynı denemede bulanlar' : 'Kelimeyi bulamayanlar'}: <strong>%{Math.round((benimGrup / toplamOyuncu) * 100)}</strong>
        </p>
      )}

      {istatistik && (
        <>
          <dl className="istatistik">
            <div>
              <dt>Oynanan</dt>
              <dd>{istatistik.oynanan}</dd>
            </div>
            <div>
              <dt>Kazanma</dt>
              <dd>%{istatistik.oran}</dd>
            </div>
            <div>
              <dt>Seri</dt>
              <dd>{istatistik.seri}</dd>
            </div>
            <div>
              <dt>En iyi seri</dt>
              <dd>{istatistik.enIyiSeri}</dd>
            </div>
          </dl>
          <h3 className="dagilim-baslik">Kaçıncı denemede buldun</h3>
          <ol className="dagilim">
            {istatistik.dagilim.map((n, i) => (
              <li key={i}>
                <span className="dagilim-no">{i + 1}</span>
                <span
                  className={`dagilim-cubuk${kazandi && satirlar.length === i + 1 ? ' bugun' : ''}`}
                  style={{ width: `${Math.max(8, (n / enCok) * 100)}%` }}
                >
                  {n}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      {bitti && (
        <div className="sonuc-alt">
          <div className="geri-sayim">
            <span>Sonraki kelime</span>
            <strong>{sureMetni(kalan)}</strong>
          </div>
          <button
            className="dugme"
            onClick={async () => {
              const r = await paylas(paylasimMetni())
              if (r === 'kopyalandi') onBildir('Sonuç panoya kopyalandı')
              else if (r === 'olmadi') onBildir('Paylaşılamadı')
            }}
          >
            Sonucu paylaş
          </button>
        </div>
      )}
    </Pencere>
  )
}
