import { useEffect, useState } from 'react'
import {
  sampiyonlariGetir,
  siralamaGetir,
  useOyuncu,
  type Sampiyonlar,
  type Siralama,
  type SiralamaDonemi,
  type SiralamaOyunu,
  type SiralamaSatiri,
} from '../lib/siralama'
import { aralikMetni, gunAyMetni as gunAy } from '../lib/tarih'
import { degistir } from '../lib/yonlendirme'
import { sesCal } from '../lib/ses'

const OYUNLAR: { id: SiralamaOyunu; ad: string }[] = [
  { id: 'kelime', ad: 'Kelime' },
  { id: 'quiz', ad: 'Sorular' },
]
const DONEMLER: { id: SiralamaDonemi; ad: string }[] = [
  { id: 'gun', ad: 'Bugün' },
  { id: 'dun', ad: 'Dün' },
  { id: 'hafta', ad: 'Bu hafta' },
]
const BOS_METIN: Record<SiralamaDonemi, string> = {
  gun: 'Bugün henüz kimse puan almadı. İlk sen ol.',
  dun: 'Dün kimse puan almadı.',
  hafta: 'Bu hafta henüz kimse puan almadı. İlk sen ol.',
}

function donemMetni(s: Siralama, donem: SiralamaDonemi) {
  if (donem === 'gun') return gunAy(s.baslangic)
  if (donem === 'dun') return s.kesin ? gunAy(s.baslangic) : `${gunAy(s.baslangic)} · bu gece 23:59'a kadar oynanabilir`
  return `${aralikMetni(s.baslangic, s.bitis)} · cuma 00:00'da sıfırlanır`
}

/** Oyuncunun adı; oyuncu sayfasına götürür (eski sunucuda kimlik yoksa düz metin). */
function OyuncuAdi({ s }: { s: Pick<SiralamaSatiri, 'ad' | 'kimlik'> }) {
  return s.kimlik ? (
    <a className="siralama-ad-baglanti" href={`#/oyuncu/${s.kimlik}`}>
      {s.ad}
    </a>
  ) : (
    <>{s.ad}</>
  )
}

function SampiyonKarti({ veri, oyun }: { veri: Sampiyonlar; oyun: SiralamaOyunu }) {
  const liste = veri[oyun]
  if (!liste.length) return null
  return (
    <section className="sampiyonlar" aria-labelledby="sampiyonlar-baslik">
      <h2 id="sampiyonlar-baslik">Geçen haftanın şampiyonları</h2>
      <p className="aciklama kucuk">
        {aralikMetni(veri.baslangic, veri.bitis)}
        {!veri.kesin && " · cumartesi 00:00'da kesinleşir"}
      </p>
      <ol className="sampiyon-liste">
        {liste.map((s) => (
          <li key={`${s.sira}-${s.ad}`}>
            <span className="sampiyon-sira">{s.sira}.</span>
            <span className="siralama-ad">
              <OyuncuAdi s={s} />
            </span>
            <span className="siralama-puan">{s.puan}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Günlük, dünkü ve haftalık sıralama; kelime ve sorular ayrı. Üstte geçen haftanın şampiyonları. */
export function SiralamaEkrani({ oyun, donem }: { oyun: SiralamaOyunu; donem: SiralamaDonemi }) {
  const oyuncu = useOyuncu()
  const [veri, setVeri] = useState<Siralama | null>(null)
  const [sampiyonlar, setSampiyonlar] = useState<Sampiyonlar | null>(null)
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

  // Şampiyonlar iki oyun için birlikte gelir; yüklenemezse kart gösterilmez.
  useEffect(() => {
    let iptal = false
    sampiyonlariGetir()
      .then((s) => !iptal && setSampiyonlar(s))
      .catch(() => undefined)
    return () => {
      iptal = true
    }
  }, [deneme])

  const benListede = !!veri?.liste.some((s) => s.ben)
  const gec = (o: SiralamaOyunu, d: SiralamaDonemi) => {
    if (o === oyun && d === donem) return
    sesCal('tik')
    degistir(`/siralama/${o}${d === 'gun' ? '' : `/${d}`}`)
  }

  return (
    <div className="sayfa siralama">
      <h1>Sıralama</h1>
      <div className="sekmeler" role="tablist" aria-label="Oyun">
        {OYUNLAR.map((o) => (
          <button key={o.id} role="tab" className="sekme" aria-selected={oyun === o.id} onClick={() => gec(o.id, donem)}>
            {o.ad}
          </button>
        ))}
      </div>

      {sampiyonlar && <SampiyonKarti veri={sampiyonlar} oyun={oyun} />}

      <div className="bolumlu-secici siralama-donem" role="radiogroup" aria-label="Dönem">
        {DONEMLER.map((d) => (
          <button key={d.id} role="radio" aria-checked={donem === d.id} onClick={() => gec(oyun, d.id)}>
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
        <p className="bos-durum">{BOS_METIN[donem]}</p>
      ) : (
        <ol className="siralama-liste">
          {veri.liste.map((s) => (
            <li key={`${s.sira}-${s.ad}`} className={s.ben ? 'ben' : undefined} aria-current={s.ben ? 'true' : undefined}>
              <span className="siralama-sira">{s.sira}</span>
              <span className="siralama-ad">
                <OyuncuAdi s={s} />
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
          {veri.ben.kimlik && (
            <>
              {' · '}
              <a className="metin-dugme" href={`#/oyuncu/${veri.ben.kimlik}`}>
                Sonuçların
              </a>
            </>
          )}
        </p>
      )}

      {veri && veri.liste.length > 0 && <p className="siralama-not aciklama kucuk">Bir oyuncunun haftalık sonuçları için adına dokun.</p>}

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
        <p>
          Süre Başla'ya basınca başlar ve durmaz. Her günün soruları ve kelimeleri o gün ve ertesi gün 23:59'a kadar puan getirir; puan
          sorunun ya da kelimenin gününe yazılır. Hafta cuma başlar, perşembe biter. Eşit puanda toplam süresi kısa olan öndedir.
        </p>
      </details>
    </div>
  )
}
