import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Pencere } from './Pencere'
import type { Istatistik } from '../../lib/istatistik'
import type { BitisBilgisi, Satir } from '../../lib/kelimeOyunu'
import { bulmacaNo, sureMetni, trBugun } from '../../lib/tarih'
import { linkAc, paylas } from '../../lib/platform'
import { useAyarlar } from '../../lib/ayarlar'
import { useHesap } from '../../lib/hesap'
import { git } from '../../lib/yonlendirme'
import { SITE_URL, SLOT_ADI, UYGULAMA_ADI, VIDEO_VARSAYILAN_URL, type Slot } from '../../lib/sabitler'

interface Props {
  tarih: string
  slot: Slot | null
  sonrakiAcilis: number // ms; geri sayım bu ana kadar
  zorMod: boolean // paylaşımda * işareti
  satirlar: Satir[]
  bitti: boolean
  kazandi: boolean
  bitis: BitisBilgisi | null
  puan: number | null // sıralamaya giren oyunun puanı
  istatistik: Istatistik | null
  onKapat: () => void
  onBildir: (metin: string) => void
}

export function SonucPenceresi({ tarih, slot, sonrakiAcilis, zorMod, satirlar, bitti, kazandi, bitis, puan, istatistik, onKapat, onBildir }: Props) {
  const ayar = useAyarlar()
  const { durum: hesapDurumu } = useHesap()
  const [kalan, setKalan] = useState(sonrakiAcilis - Date.now())
  // Anlam ve örnek cümle pencere kaydırma gerektirmesin diye satır sınırıyla kısalır; taşarsa "Devamını oku" çıkar.
  const metinRef = useRef<HTMLDivElement>(null)
  const [tasiyor, setTasiyor] = useState(false)
  const [acik, setAcik] = useState(false)
  useLayoutEffect(() => {
    const e = metinRef.current
    if (!e || acik) return
    setTasiyor([...e.children].some((c) => c.scrollHeight > c.clientHeight + 1))
  }, [bitis, acik])

  useEffect(() => {
    setKalan(sonrakiAcilis - Date.now())
    const t = setInterval(() => setKalan(sonrakiAcilis - Date.now()), 1000)
    return () => clearInterval(t)
  }, [sonrakiAcilis])

  const paylasimMetni = () => {
    const [y, s, g] = ayar.renkKoru ? ['🟧', '🟦', '⬛'] : ['🟩', '🟨', '⬛']
    const izgara = satirlar.map((r) => r.sonuc.map((d) => (d === 'yesil' ? y : d === 'sari' ? s : g)).join('')).join('\n')
    const skor = kazandi ? satirlar.length : 'X'
    const ad = slot ? ` ${SLOT_ADI[slot]}` : ''
    const zor = zorMod ? '*' : ''
    return `${UYGULAMA_ADI} Kelime #${bulmacaNo(tarih)}${ad} ${skor}/6${zor}\n${izgara}\n${SITE_URL}#/kelime`
  }

  const enCok = Math.max(1, ...(istatistik?.dagilim ?? [1]))
  const skorMetni = kazandi ? `${satirlar.length}/6` : 'X/6'

  return (
    <Pencere baslik={bitti ? (kazandi ? 'Buldun' : 'Bu sefer olmadı') : 'İstatistikler'} sinif="pencere-sonuc" onKapat={onKapat}>
      {bitti && bitis && (
        <section className="sonuc-kelime">
          <div className="sonuc-ust">
            <div className="sonuc-karolar" aria-label={`Kelime: ${bitis.cevap}`}>
              {[...bitis.cevap].map((h, i) => (
                <span key={i} className="karo karo-kucuk karo-yesil" aria-hidden="true">
                  {h}
                </span>
              ))}
            </div>
            <span className="sonuc-skor" aria-label={kazandi ? `${satirlar.length}. denemede` : 'Bulunamadı'}>
              {skorMetni}
            </span>
          </div>
          {puan !== null && (
            <p className="sonuc-puan">
              Sıralama puanı: <strong>{puan}</strong>{' '}
              <button
                className="metin-dugme"
                onClick={() => {
                  onKapat()
                  git(`/siralama/kelime${tarih === trBugun() ? '' : '/dun'}`)
                }}
              >
                Sıralamayı gör
              </button>
            </p>
          )}
          <div ref={metinRef} className={`sonuc-metin${acik ? ' acik' : ''}`}>
            <p className="sonuc-anlam">{bitis.anlam}</p>
            <p className="sonuc-ornek">“{bitis.ornek}”</p>
          </div>
          {tasiyor && !acik && (
            <button className="metin-dugme sonuc-devam" onClick={() => setAcik(true)}>
              Devamını oku
            </button>
          )}
          {slot && bitis.videoBaslik && (
            <p className="sonuc-video">
              <span>
                {SLOT_ADI[slot]} videosu: {bitis.videoBaslik}
              </span>
              <button className="metin-dugme" onClick={() => void linkAc(VIDEO_VARSAYILAN_URL)}>
                Videoyu izle
              </button>
            </p>
          )}
        </section>
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
          <h3 className="dagilim-baslik">Deneme dağılımı</h3>
          {/* Sütunlar: her denemede kaç kelime bulundu; bu kelimenin sütunu vurgulu */}
          <ol className="dagilim">
            {istatistik.dagilim.map((n, i) => (
              <li key={i} aria-label={`${i + 1}. denemede ${n} kez`}>
                <span className="dagilim-sutun" aria-hidden="true">
                  <span className="dagilim-sayi">{n}</span>
                  <span
                    className={`dagilim-cubuk${kazandi && satirlar.length === i + 1 ? ' bugun' : ''}`}
                    style={{ height: `${Math.max(3, Math.round((n / enCok) * 30))}px` }}
                  />
                </span>
                <span className="dagilim-no" aria-hidden="true">
                  {i + 1}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      {hesapDurumu === 'girissiz' && (
        <p className="sonuc-hesap">
          Sonuçların bu cihazda saklanıyor.{' '}
          <button
            className="metin-dugme"
            onClick={() => {
              onKapat()
              git('/ayarlar')
            }}
          >
            Google ile giriş yap
          </button>
        </p>
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
