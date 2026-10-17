import { useEffect, useState } from 'react'
import { gunuGetir, onbellektekiGun } from '../lib/api'
import { AYLAR, bugun, tarihCoz } from '../lib/tarih'
import { quizKaydet, quizKaydi, seri } from '../lib/quizDepo'
import { paylas } from '../lib/platform'
import type { QuizSorusu } from '../lib/tipler'
import { GeriDugmesi } from '../components/GeriDugmesi'
import { Konfeti } from '../components/Konfeti'
import { sesCal } from '../lib/ses'

const HARF = ['A', 'B', 'C', 'D']

export function QuizEkrani({ tarih }: { tarih: string }) {
  const d = tarihCoz(tarih)
  const [sorular, setSorular] = useState<QuizSorusu[] | null>(() => onbellektekiGun(tarih)?.quiz ?? null)
  const [hata, setHata] = useState(false)
  const [kayit, setKayit] = useState(() => quizKaydi(tarih))
  const [sira, setSira] = useState(0)
  const [cevaplar, setCevaplar] = useState<number[]>([])
  const [paylasimNotu, setPaylasimNotu] = useState('')
  const [yeniBitti, setYeniBitti] = useState(false)

  useEffect(() => {
    gunuGetir(tarih)
      .then((s) => setSorular(s.veri.quiz))
      .catch(() => setHata(true))
  }, [tarih])

  const baslik = d ? `${d.getDate()} ${AYLAR[d.getMonth()]} soruları` : 'Günün soruları'

  if (!d || tarih > bugun()) {
    return (
      <div className="sayfa">
        <GeriDugmesi />
        <p className="bos-durum">Bu günün soruları o gün açılacak.</p>
      </div>
    )
  }
  if (!sorular) {
    return (
      <div className="sayfa">
        <GeriDugmesi />
        {hata ? <p className="bos-durum">Sorular yüklenemedi. Bağlantını kontrol edip yeniden dene.</p> : <div className="iskelet iskelet-buyuk" />}
      </div>
    )
  }
  if (sorular.length < 3) {
    return (
      <div className="sayfa">
        <GeriDugmesi />
        <p className="bos-durum">Bu günün soruları henüz hazır değil. Biraz sonra yeniden bak.</p>
      </div>
    )
  }

  // Tamamlanmış quiz: özet
  if (kayit) {
    const isaretler = sorular.map((s, i) => (kayit.cevaplar[i] === s.dogru_index ? '✅' : '❌')).join('')
    const paylasimMetni = `Takvim Yaprağı, ${baslik.replace(' soruları', '')}: ${kayit.dogru}/3 ${isaretler}`
    return (
      <div className="sayfa quiz">
        {yeniBitti && kayit.dogru === 3 && <Konfeti />}
        <GeriDugmesi />
        <h1>{baslik}</h1>
        <p className="quiz-skor">
          <span className={`quiz-skor-sayi${yeniBitti ? ' quiz-skor-yeni' : ''}`}>{kayit.dogru}/3</span>
          {tarih === bugun() && seri() > 0 && <span className="seri">{seri()} günlük seri</span>}
        </p>
        <ol className="quiz-ozet">
          {sorular.map((s, i) => {
            const dogru = kayit.cevaplar[i] === s.dogru_index
            return (
              <li key={s.id} className={dogru ? 'dogru' : 'yanlis'}>
                <p className="quiz-ozet-soru">{s.soru}</p>
                <p>
                  {dogru ? 'Doğru: ' : `Senin cevabın: ${s.secenekler[kayit.cevaplar[i]]}. Doğrusu: `}
                  <strong>{s.secenekler[s.dogru_index]}</strong>
                </p>
                {s.aciklama && <p className="quiz-aciklama">{s.aciklama}</p>}
              </li>
            )
          })}
        </ol>
        <div className="dugme-grubu">
          <button
            className="dugme"
            onClick={async () => {
              const r = await paylas(paylasimMetni)
              setPaylasimNotu(r === 'kopyalandi' ? 'Sonuç panoya kopyalandı.' : r === 'olmadi' ? 'Paylaşılamadı.' : '')
            }}
          >
            Sonucu paylaş
          </button>
          <a className="dugme dugme-ikincil" href={tarih === bugun() ? '#/' : `#/gun/${tarih}`}>
            Yaprağa dön
          </a>
        </div>
        {paylasimNotu && (
          <p className="basari" role="status">
            {paylasimNotu}
          </p>
        )}
      </div>
    )
  }

  const soru = sorular[sira]
  const secilen = cevaplar[sira]
  const cevaplandi = secilen !== undefined

  const sec = (i: number) => {
    if (cevaplandi) return
    const yeni = [...cevaplar]
    yeni[sira] = i
    setCevaplar(yeni)
    sesCal(i === soru.dogru_index ? 'dogru' : 'yanlis')
  }

  const ilerle = () => {
    if (sira < 2) {
      sesCal('tik')
      setSira(sira + 1)
      return
    }
    const dogru = sorular.filter((s, i) => cevaplar[i] === s.dogru_index).length
    const yeni = { cevaplar, dogru, cozulme: bugun() }
    quizKaydet(tarih, yeni)
    sesCal(dogru >= 2 ? 'tamam' : 'tik')
    setYeniBitti(true)
    setKayit(yeni)
  }

  return (
    <div className="sayfa quiz">
      <GeriDugmesi />
      <h1>{baslik}</h1>
      <p className="quiz-ilerleme" aria-label={`Soru ${sira + 1} / 3`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`nokta${i < sira || (i === sira && cevaplandi) ? (cevaplar[i] === sorular[i].dogru_index ? ' dogru' : ' yanlis') : i === sira ? ' simdiki' : ''}`}
          />
        ))}
      </p>
      <h2 key={sira} className="quiz-soru">
        {soru.soru}
      </h2>
      <div className="quiz-secenekler">
        {soru.secenekler.map((s, i) => {
          let sinif = 'secenek'
          if (cevaplandi && i === soru.dogru_index) sinif += ' dogru'
          else if (cevaplandi && i === secilen) sinif += ' yanlis'
          return (
            <button key={i} className={sinif} onClick={() => sec(i)} disabled={cevaplandi && i !== secilen && i !== soru.dogru_index}>
              <span className="secenek-harf">{HARF[i]}</span>
              {s}
            </button>
          )
        })}
      </div>
      {cevaplandi && (
        <div className="quiz-geri-bildirim" role="status">
          <p className="quiz-sonuc-metni">{secilen === soru.dogru_index ? 'Doğru.' : 'Yanlış.'}</p>
          {soru.aciklama && <p className="quiz-aciklama">{soru.aciklama}</p>}
          <button className="dugme" onClick={ilerle}>
            {sira < 2 ? 'Sonraki soru' : 'Sonucu gör'}
          </button>
        </div>
      )}
    </div>
  )
}
