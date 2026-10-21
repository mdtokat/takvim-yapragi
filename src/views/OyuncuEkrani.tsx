import { useEffect, useState } from 'react'
import {
  SiralamaHatasi,
  oyuncuHaftasiGetir,
  useOyuncu,
  type Hafta,
  type HaftaKelimesi,
  type HaftaSirasi,
  type HaftaSorusu,
  type OyuncuHaftasi,
} from '../lib/siralama'
import { GUNLER, aralikMetni, gunAyMetni, tarihCoz } from '../lib/tarih'
import { SLOT_ADI, type Slot } from '../lib/sabitler'
import { sesCal } from '../lib/ses'
import { GeriDugmesi } from '../components/GeriDugmesi'

const HAFTALAR: { id: Hafta; ad: string }[] = [
  { id: 'bu', ad: 'Bu hafta' },
  { id: 'gecen', ad: 'Geçen hafta' },
]
// Günün soruları sırayla sabah, öğlen ve akşam videosundan gelir.
const SORU_SLOTU: Slot[] = ['sabah', 'oglen', 'aksam']

const sayi = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })
const sureMetni = (sn: number | null) => (sn === null ? '' : ` · ${sn}\u00a0sn`)

function gunBasligi(t: string) {
  const d = tarihCoz(t)
  return d ? `${gunAyMetni(t)} ${GUNLER[d.getDay()]}` : t
}

function kelimeSonucu(k: HaftaKelimesi) {
  if (k.durum === 'kazandi') return `${k.deneme}. denemede buldu`
  if (k.durum === 'devam') return 'Oynuyor'
  return k.deneme >= 6 ? 'Bulamadı' : 'Süre doldu'
}

const SORU_SONUCU: Record<HaftaSorusu['durum'], string> = {
  dogru: 'Doğru',
  yanlis: 'Yanlış',
  sure_doldu: 'Süre doldu',
  devam: 'Cevaplıyor',
}

function OzetKarti({ baslik, sira, ayrinti, bos }: { baslik: string; sira: HaftaSirasi | null; ayrinti: string; bos: string }) {
  return (
    <div className="oyuncu-kart">
      <h2>{baslik}</h2>
      {sira ? (
        <>
          <p className="oyuncu-sira">
            <strong>{sira.sira}.</strong> sıra
            <small> / {sira.oyuncuSayisi} oyuncu</small>
          </p>
          <p className="oyuncu-puan">{sira.puan} puan</p>
          <p className="aciklama kucuk">{ayrinti}</p>
        </>
      ) : (
        <p className="aciklama kucuk">{bos}</p>
      )}
    </div>
  )
}

/** Sıralamadaki bir oyuncunun bu haftası ve geçen haftası. Tahminler ve seçilen şıklar gösterilmez. */
export function OyuncuEkrani({ kimlik }: { kimlik: string }) {
  const kayitli = useOyuncu().durum === 'kayitli'
  const [hafta, setHafta] = useState<Hafta>('bu')
  const [veri, setVeri] = useState<OyuncuHaftasi | null>(null)
  const [hata, setHata] = useState<'yok' | 'baglanti' | null>(null)
  const [deneme, setDeneme] = useState(0)

  useEffect(() => {
    let iptal = false
    setVeri(null)
    setHata(null)
    oyuncuHaftasiGetir(kimlik, hafta)
      .then((v) => !iptal && setVeri(v))
      .catch((e) => !iptal && setHata(e instanceof SiralamaHatasi && e.kod === 'oyuncu_yok' ? 'yok' : 'baglanti'))
    return () => {
      iptal = true
    }
  }, [kimlik, hafta, deneme, kayitli])

  if (hata === 'yok') {
    return (
      <div className="sayfa oyuncu">
        <GeriDugmesi />
        <p className="bos-durum">Bu oyuncu bulunamadı. Sıralamadan çıkmış ya da adını değiştirmiş olabilir.</p>
      </div>
    )
  }

  const kelimeler = veri?.kelimeler ?? []
  const sorular = veri?.sorular ?? []
  const bulunan = kelimeler.filter((k) => k.durum === 'kazandi')
  const kelimeAyrinti = bulunan.length
    ? `${kelimeler.length} kelime · ${bulunan.length} bulundu · ortalama ${sayi(bulunan.reduce((a, k) => a + k.deneme, 0) / bulunan.length)} deneme`
    : `${kelimeler.length} kelime · hiçbiri bulunamadı`
  const soruAyrinti = `${sorular.length} soru · ${sorular.filter((q) => q.durum === 'dogru').length} doğru`
  // En yeni gün üstte.
  const bos = hafta === 'bu' ? 'Bu hafta oynamadı.' : 'Geçen hafta oynamadı.'
  const gunler = [...new Set([...kelimeler, ...sorular].map((x) => x.tarih))].sort().reverse()

  return (
    <div className="sayfa oyuncu">
      <GeriDugmesi />
      <h1>{veri?.ad ?? 'Oyuncu'}</h1>
      {veri && (
        <p className="aciklama kucuk oyuncu-alt">
          {veri.adTuru === 'instagram' ? 'Instagram kullanıcı adı' : "Facebook'taki ad"}
          {veri.ben && ' · sen'}
        </p>
      )}

      <div className="bolumlu-secici siralama-donem" role="radiogroup" aria-label="Hafta">
        {HAFTALAR.map((h) => (
          <button
            key={h.id}
            role="radio"
            aria-checked={hafta === h.id}
            onClick={() => {
              if (hafta === h.id) return
              sesCal('tik')
              setHafta(h.id)
            }}
          >
            {h.ad}
          </button>
        ))}
      </div>
      {veri && (
        <p className="siralama-donem-metni aciklama kucuk">
          {aralikMetni(veri.baslangic, veri.bitis)}
          {hafta === 'gecen' && !veri.kesin && " · cumartesi 00:00'da kesinleşir"}
        </p>
      )}

      {hata ? (
        <div className="bos-durum">
          <p>Sonuçlar yüklenemedi. Bağlantını kontrol edip yeniden dene.</p>
          <button className="dugme" onClick={() => setDeneme((n) => n + 1)}>
            Yeniden dene
          </button>
        </div>
      ) : !veri ? (
        <div className="liste-iskelet">
          <div className="iskelet satir" />
          <div className="iskelet satir" />
          <div className="iskelet satir" />
        </div>
      ) : (
        <>
          <div className="oyuncu-ozet">
            <OzetKarti baslik="Kelime" sira={veri.kelime} ayrinti={kelimeAyrinti} bos={bos} />
            <OzetKarti baslik="Sorular" sira={veri.quiz} ayrinti={soruAyrinti} bos={bos} />
          </div>

          {gunler.length === 0 ? (
            <p className="bos-durum">{hafta === 'bu' ? 'Bu hafta henüz puanlı oyun oynamadı.' : 'Geçen hafta puanlı oyun oynamadı.'}</p>
          ) : (
            gunler.map((t) => {
              const gk = kelimeler.filter((k) => k.tarih === t)
              const gs = sorular.filter((q) => q.tarih === t)
              const toplam = [...gk, ...gs].reduce((a, x) => a + x.puan, 0)
              return (
                <section key={t} className="oyuncu-gun" aria-label={gunBasligi(t)}>
                  <h3>
                    <span>{gunBasligi(t)}</span>
                    <span className="siralama-puan">{toplam} puan</span>
                  </h3>
                  <ul>
                    {gk.map((k) => (
                      <li key={`k-${k.slot}`}>
                        <span>
                          {SLOT_ADI[k.slot]} kelimesi · {kelimeSonucu(k)}
                          {sureMetni(k.sure)}
                        </span>
                        <span className="siralama-puan">{k.puan}</span>
                      </li>
                    ))}
                    {gs.map((q) => (
                      <li key={`q-${q.sira}`}>
                        <span>
                          {SLOT_ADI[SORU_SLOTU[q.sira - 1]]} sorusu · {SORU_SONUCU[q.durum]}
                          {sureMetni(q.sure)}
                        </span>
                        <span className="siralama-puan">{q.puan}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })
          )}
          <p className="siralama-not aciklama kucuk">Yalnızca sıralamaya giren, süreli oyunlar gösterilir. Sonuçlar iki hafta saklanır.</p>
        </>
      )}
    </div>
  )
}
