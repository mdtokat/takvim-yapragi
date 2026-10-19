import { useEffect, useState } from 'react'
import { siralamaGetir, useOyuncu, type Siralama, type SiralamaDonemi, type SiralamaOyunu } from '../lib/siralama'
import { AYLAR, tarihCoz } from '../lib/tarih'
import { degistir } from '../lib/yonlendirme'
import { sesCal } from '../lib/ses'

const OYUNLAR: { id: SiralamaOyunu; ad: string }[] = [
  { id: 'kelime', ad: 'Kelime' },
  { id: 'quiz', ad: 'Sorular' },
]
const DONEMLER: { id: SiralamaDonemi; ad: string }[] = [
  { id: 'gun', ad: 'Bugün' },
  { id: 'hafta', ad: 'Bu hafta' },
]

const gunAy = (t: string) => {
  const d = tarihCoz(t)
  return d ? `${d.getDate()} ${AYLAR[d.getMonth()]}` : t
}

function donemMetni(s: Siralama, donem: SiralamaDonemi) {
  if (donem === 'gun') return gunAy(s.baslangic)
  const [b, e] = [tarihCoz(s.baslangic), tarihCoz(s.bitis)]
  const aralik = b && e && b.getMonth() === e.getMonth() ? `${b.getDate()}–${gunAy(s.bitis)}` : `${gunAy(s.baslangic)} – ${gunAy(s.bitis)}`
  return `${aralik} · pazartesi 00:00'da sıfırlanır`
}

/** Günlük ve haftalık sıralama; kelime ve sorular ayrı. */
export function SiralamaEkrani({ oyun }: { oyun: SiralamaOyunu }) {
  const oyuncu = useOyuncu()
  const [donem, setDonem] = useState<SiralamaDonemi>('gun')
  const [veri, setVeri] = useState<Siralama | null>(null)
  const [hata, setHata] = useState(false)
  const [deneme, setDeneme] = useState(0)

  // Oyuncu bilgisi gelince (kendi sırası için anahtarlı istek) yeniden yüklenir.
  const kayitli = oyuncu.durum === 'kayitli'
  useEffect(() => {
    let iptal = false
    setVeri(null)
    setHata(false)
    siralamaGetir(oyun, donem)
      .then((s) => !iptal && setVeri(s))
      .catch(() => !iptal && setHata(true))
    return () => {
      iptal = true
    }
  }, [oyun, donem, deneme, kayitli])

  const benListede = !!veri?.liste.some((s) => s.ben)

  return (
    <div className="sayfa siralama">
      <h1>Sıralama</h1>
      <div className="sekmeler" role="tablist" aria-label="Oyun">
        {OYUNLAR.map((o) => (
          <button
            key={o.id}
            role="tab"
            className="sekme"
            aria-selected={oyun === o.id}
            onClick={() => {
              if (oyun === o.id) return
              sesCal('tik')
              degistir(`/siralama/${o.id}`)
            }}
          >
            {o.ad}
          </button>
        ))}
      </div>
      <div className="bolumlu-secici siralama-donem" role="radiogroup" aria-label="Dönem">
        {DONEMLER.map((d) => (
          <button
            key={d.id}
            role="radio"
            aria-checked={donem === d.id}
            onClick={() => {
              if (donem === d.id) return
              sesCal('tik')
              setDonem(d.id)
            }}
          >
            {d.ad}
          </button>
        ))}
      </div>

      {veri && <p className="siralama-donem-metni aciklama kucuk">{donemMetni(veri, donem)}</p>}

      {hata ? (
        <div className="bos-durum">
          <p>Sıralama yüklenemedi. Bağlantını kontrol edip yeniden dene.</p>
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
      ) : veri.liste.length === 0 ? (
        <p className="bos-durum">
          {donem === 'gun' ? 'Bugün henüz kimse puan almadı.' : 'Bu hafta henüz kimse puan almadı.'} İlk sen ol.
        </p>
      ) : (
        <ol className="siralama-liste">
          {veri.liste.map((s) => (
            <li key={`${s.sira}-${s.ad}`} className={s.ben ? 'ben' : undefined} aria-current={s.ben ? 'true' : undefined}>
              <span className="siralama-sira">{s.sira}</span>
              <span className="siralama-ad">
                {s.ad}
                {s.ben && <small> · sen</small>}
              </span>
              <span className="siralama-puan">{s.puan}</span>
            </li>
          ))}
        </ol>
      )}

      {veri?.ben && !benListede && (
        <p className="siralama-ben">
          Sen: {veri.ben.sira}. sıra · {veri.ben.puan} puan
        </p>
      )}

      {oyuncu.durum === 'girissiz' && (
        <p className="siralama-not">
          Sıralamaya girmek için{' '}
          <a className="metin-dugme" href="#/ayarlar">
            Ayarlar'dan Google ile giriş yap
          </a>
        </p>
      )}
      {oyuncu.durum === 'adsiz' && (
        <p className="siralama-not">
          Sıralamada görünmek için{' '}
          <a className="metin-dugme" href="#/ayarlar">
            Ayarlar'dan bir ad seç
          </a>
        </p>
      )}
      {oyuncu.durum === 'kayitli' && oyuncu.oyuncu.durum === 'red' && (
        <p className="uyari">Adın sıralamada gösterilmiyor. Ayarlar'dan kendine ait, uygun bir ad seç.</p>
      )}

      <details className="siralama-kurallar">
        <summary>Puanlar nasıl hesaplanır?</summary>
        <p>
          <strong>Sorular:</strong> Her soru için 30 saniyen var. Doğru cevap 50 puan, kalan her saniye 1 puan daha getirir.
        </p>
        <p>
          <strong>Kelime:</strong> Her kelime için 90 saniyen var. 1. denemede bulursan 100, sonra 80, 60, 40, 25 ve 10 puan; kalan her
          3 saniye 1 puan daha.
        </p>
        <p>Süre Başla'ya basınca başlar ve durmaz. Yalnızca o gün oynanan sorular ve kelimeler sayılır. Eşit puanda toplam süresi kısa olan öndedir.</p>
      </details>
    </div>
  )
}
