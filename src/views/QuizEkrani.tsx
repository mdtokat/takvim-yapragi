import { useEffect, useMemo, useState } from 'react'
import { gunuGetir, onbellektekiGun } from '../lib/api'
import { AYLAR, bugun, saatMetni, tarihCoz } from '../lib/tarih'
import {
  cevabi,
  cevapSayisi,
  quizKaydet,
  quizKaydi,
  quizTamam,
  seri,
  soruDurumlari,
  useAcilisYenile,
  type QuizKaydi,
  type SoruDurumu,
} from '../lib/quizDepo'
import { linkAc, paylas } from '../lib/platform'
import { SLOT_ADI, UYGULAMA_ADI, VIDEO_VARSAYILAN_URL } from '../lib/sabitler'
import type { GunVerisi, QuizSorusu } from '../lib/tipler'
import { GeriDugmesi } from '../components/GeriDugmesi'
import { Konfeti } from '../components/Konfeti'
import { sesCal } from '../lib/ses'
import { useDepoSurumu } from '../lib/senkron'

const HARF = ['A', 'B', 'C', 'D']

const videoAdi = (d: { slot: SoruDurumu['slot'] }) => (d.slot ? `${SLOT_ADI[d.slot].toLocaleLowerCase('tr-TR')} videosu` : '')

function SoruBaglantilari({ soru }: { soru: QuizSorusu }) {
  if (!soru.slot && !soru.kaynak_url) return null
  return (
    <p className="quiz-baglantilar">
      {soru.slot && (
        <button className="metin-dugme" onClick={() => void linkAc(soru.video_url ?? VIDEO_VARSAYILAN_URL)}>
          Videoyu izle
        </button>
      )}
      {soru.kaynak_url && (
        <button className="metin-dugme" onClick={() => void linkAc(soru.kaynak_url!)}>
          Kaynak
        </button>
      )}
    </p>
  )
}

function OzetSatiri({ soru, secim }: { soru: QuizSorusu; secim: number }) {
  const dogru = secim === soru.dogru_index
  return (
    <li className={dogru ? 'dogru' : 'yanlis'}>
      {soru.slot && <p className="quiz-video-etiket">{SLOT_ADI[soru.slot]} videosu{soru.video_baslik ? ` · ${soru.video_baslik}` : ''}</p>}
      <p className="quiz-ozet-soru">{soru.soru}</p>
      <p>
        {dogru ? 'Doğru: ' : `Senin cevabın: ${soru.secenekler[secim]}. Doğrusu: `}
        <strong>{soru.secenekler[soru.dogru_index]}</strong>
      </p>
      {soru.aciklama && <p className="quiz-aciklama">{soru.aciklama}</p>}
      <SoruBaglantilari soru={soru} />
    </li>
  )
}

export function QuizEkrani({ tarih }: { tarih: string }) {
  const d = tarihCoz(tarih)
  const [veri, setVeri] = useState<GunVerisi | null>(() => onbellektekiGun(tarih))
  const [hata, setHata] = useState(false)
  const [deneme, setDeneme] = useState(0)
  const [kayit, setKayit] = useState<QuizKaydi | null>(() => quizKaydi(tarih))
  // Hesap eşitlemesi (başka cihazdaki cevaplar) depoyu değiştirirse kayıt yeniden okunur.
  const depoSurumu = useDepoSurumu()
  useEffect(() => setKayit(quizKaydi(tarih)), [tarih, depoSurumu])
  // Cevaplandıktan sonra geri bildirimi gösterilen sorunun sıra numarası
  const [gosterilen, setGosterilen] = useState<number | null>(null)
  const [paylasimNotu, setPaylasimNotu] = useState('')
  const [yeniBitti, setYeniBitti] = useState(false)

  useEffect(() => {
    gunuGetir(tarih)
      .then((s) => {
        setVeri(s.veri)
        setHata(false)
      })
      .catch(() => setHata(true))
  }, [tarih, deneme])

  const durumlar = useMemo(() => soruDurumlari(veri), [veri])
  useAcilisYenile(durumlar, () => setDeneme((n) => n + 1))

  const baslik = d ? `${d.getDate()} ${AYLAR[d.getMonth()]} soruları` : 'Günün soruları'
  const donusYolu = tarih === bugun() ? '#/' : `#/gun/${tarih}`

  if (!d || tarih > bugun()) {
    return (
      <div className="sayfa">
        <GeriDugmesi />
        <p className="bos-durum">Bu günün soruları o gün açılacak.</p>
      </div>
    )
  }
  if (!veri) {
    return (
      <div className="sayfa">
        <GeriDugmesi />
        {hata ? <p className="bos-durum">Sorular yüklenemedi. Bağlantını kontrol edip yeniden dene.</p> : <div className="iskelet iskelet-buyuk" />}
      </div>
    )
  }
  if (durumlar.length < 3) {
    return (
      <div className="sayfa">
        <GeriDugmesi />
        <p className="bos-durum">Bu günün soruları henüz hazır değil. Biraz sonra yeniden bak.</p>
      </div>
    )
  }

  const cevaplanmamis = durumlar.filter((x) => x.soru && cevabi(kayit, x) === null)
  const aktif = durumlar.find((x) => x.sira === gosterilen) ?? cevaplanmamis[0] ?? null
  const siradaki = durumlar.find((x) => !x.soru) ?? null

  const ilerleme = (
    <p className="quiz-ilerleme" aria-label={`${cevapSayisi(kayit)} / 3 soru cevaplandı`}>
      {durumlar.map((x) => {
        const c = cevabi(kayit, x)
        let sinif = 'nokta'
        if (c !== null && x.soru) sinif += c === x.soru.dogru_index ? ' dogru' : ' yanlis'
        else if (x.sira === aktif?.sira) sinif += ' simdiki'
        else if (!x.soru) sinif += ' kilitli'
        return <span key={x.sira} className={sinif} />
      })}
    </p>
  )

  const cevaplananlar = durumlar.filter((x) => x.soru && cevabi(kayit, x) !== null)

  // Tamamlanmış quiz: özet
  if (quizTamam(kayit) && gosterilen === null) {
    const k = kayit!
    const dogruSayi = k.dogru
    const isaretler = durumlar.map((x) => (x.soru && cevabi(k, x) === x.soru.dogru_index ? '✅' : '❌')).join('')
    const paylasimMetni = `${UYGULAMA_ADI}, ${baslik.replace(' soruları', '')}: ${dogruSayi}/3 ${isaretler}`
    return (
      <div className="sayfa quiz">
        {yeniBitti && dogruSayi === 3 && <Konfeti />}
        <GeriDugmesi />
        <h1>{baslik}</h1>
        <p className="quiz-skor">
          <span className={`quiz-skor-sayi${yeniBitti ? ' quiz-skor-yeni' : ''}`}>{dogruSayi}/3</span>
          {tarih === bugun() && seri() > 0 && <span className="seri">{seri()} günlük seri</span>}
        </p>
        <ol className="quiz-ozet">
          {cevaplananlar.map((x) => (
            <OzetSatiri key={x.sira} soru={x.soru!} secim={cevabi(k, x)!} />
          ))}
        </ol>
        <div className="dugme-grubu">
          <button
            className="dugme"
            onClick={async () => {
              const r = await paylas(paylasimMetni)
              setPaylasimNotu(r === 'kopyalandi' ? 'Sonuç panoya kopyalandı.' : r === 'olmadi' ? 'Paylaşılamadı. Yeniden dene.' : '')
            }}
          >
            Sonucu paylaş
          </button>
          <a className="dugme dugme-ikincil" href={donusYolu}>
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

  // Açık soru yok: bir sonraki videoyu bekle
  if (!aktif || !aktif.soru) {
    return (
      <div className="sayfa quiz">
        <GeriDugmesi />
        <h1>{baslik}</h1>
        {ilerleme}
        <div className="quiz-bekleme" role="status">
          {siradaki?.acilis ? (
            <>
              <p className="quiz-bekleme-saat">{saatMetni(siradaki.acilis)}</p>
              <p>
                {cevaplananlar.length ? 'Sıradaki soru' : 'Günün ilk sorusu'}
                {siradaki.slot ? ` ${videoAdi(siradaki)}yla birlikte` : ''} açılacak.
              </p>
            </>
          ) : (
            <p>Sıradaki soru henüz hazır değil. Biraz sonra yeniden bak.</p>
          )}
        </div>
        {cevaplananlar.length > 0 && (
          <ol className="quiz-ozet">
            {cevaplananlar.map((x) => (
              <OzetSatiri key={x.sira} soru={x.soru!} secim={cevabi(kayit, x)!} />
            ))}
          </ol>
        )}
        <div className="dugme-grubu">
          <a className="dugme dugme-ikincil" href={donusYolu}>
            Yaprağa dön
          </a>
        </div>
      </div>
    )
  }

  const soru = aktif.soru
  const secilen = cevabi(kayit, aktif)
  const cevaplandi = secilen !== null

  const sec = (i: number) => {
    if (cevaplandi) return
    const cevaplar = [0, 1, 2].map((j) => kayit?.cevaplar[j] ?? null)
    cevaplar[aktif.sira - 1] = i
    const dogru = durumlar.filter((x) => x.soru && cevaplar[x.sira - 1] === x.soru.dogru_index).length
    const yeni: QuizKaydi = { cevaplar, dogru, cozulme: bugun() }
    quizKaydet(tarih, yeni)
    setKayit(yeni)
    setGosterilen(aktif.sira)
    sesCal(i === soru.dogru_index ? 'dogru' : 'yanlis')
  }

  const kalanAcik = cevaplanmamis.filter((x) => x.sira !== aktif.sira).length
  const sonDurum = quizTamam(kayit)
  const ilerle = () => {
    setGosterilen(null)
    if (sonDurum) {
      sesCal((kayit?.dogru ?? 0) >= 2 ? 'tamam' : 'tik')
      setYeniBitti(true)
    } else sesCal('tik')
  }

  return (
    <div className="sayfa quiz">
      <GeriDugmesi />
      <h1>{baslik}</h1>
      {ilerleme}
      {soru.slot && (
        <p className="quiz-video-etiket">
          {SLOT_ADI[soru.slot]} videosundan{soru.video_baslik ? ` · ${soru.video_baslik}` : ''}
        </p>
      )}
      <h2 key={aktif.sira} className="quiz-soru">
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
          <SoruBaglantilari soru={soru} />
          <button className="dugme" onClick={ilerle}>
            {sonDurum ? 'Sonucu gör' : kalanAcik > 0 ? 'Sonraki soru' : 'Tamam'}
          </button>
        </div>
      )}
    </div>
  )
}
