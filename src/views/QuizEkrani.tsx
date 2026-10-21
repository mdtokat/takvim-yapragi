import { useEffect, useMemo, useRef, useState } from 'react'
import { gunuGetir, onbellektekiGun } from '../lib/api'
import { AYLAR, bugun, puanliGun, saatMetni, tarihCoz, trBugun } from '../lib/tarih'
import {
  SURE_DOLDU,
  cevabi,
  cevapSayisi,
  dogruCevabi,
  gunPuani,
  quizKaydet,
  quizKaydi,
  quizTamam,
  seri,
  soruDurumlari,
  useAcilisYenile,
  type QuizKaydi,
  type SoruDurumu,
} from '../lib/quizDepo'
import {
  QUIZ_SURESI,
  SiralamaHatasi,
  oyuncuBekleniyor,
  oyuncuyuYenile,
  quizCevapla,
  quizDurumuGetir,
  useOyuncu,
  type QuizSonucu,
} from '../lib/siralama'
import { linkAc, paylas } from '../lib/platform'
import { SLOT_ADI, UYGULAMA_ADI, VIDEO_VARSAYILAN_URL } from '../lib/sabitler'
import type { GunVerisi, QuizSorusu } from '../lib/tipler'
import { GeriDugmesi } from '../components/GeriDugmesi'
import { Konfeti } from '../components/Konfeti'
import { SureSayaci } from '../components/SureSayaci'
import { sesCal } from '../lib/ses'
import { useDepoSurumu } from '../lib/senkron'

const HARF = ['A', 'B', 'C', 'D']

const videoAdi = (d: { slot: SoruDurumu['slot'] }) => (d.slot ? `${SLOT_ADI[d.slot].toLocaleLowerCase('tr-TR')} videosu` : '')

/** Sıralamaya giren sorunun durumu: kapali (süresiz oynanır), bekliyor (Başla'ya basılmadı), suruyor (süre işliyor). */
type SiraliDurum = { tur: 'yukleniyor' } | { tur: 'kapali' } | { tur: 'bekliyor' } | { tur: 'suruyor'; bitis: number } | { tur: 'hata' }

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

function OzetSatiri({ soru, secim, dogruIndex, puan }: { soru: QuizSorusu; secim: number; dogruIndex: number | null; puan: number | null }) {
  const dogru = secim === dogruIndex
  return (
    <li className={dogru ? 'dogru' : 'yanlis'}>
      {soru.slot && <p className="quiz-video-etiket">{SLOT_ADI[soru.slot]} videosu{soru.video_baslik ? ` · ${soru.video_baslik}` : ''}</p>}
      <p className="quiz-ozet-soru">{soru.soru}</p>
      {dogruIndex !== null && (
        <p>
          {dogru ? 'Doğru: ' : secim === SURE_DOLDU ? 'Süre doldu. Doğrusu: ' : `Senin cevabın: ${soru.secenekler[secim]}. Doğrusu: `}
          <strong>{soru.secenekler[dogruIndex]}</strong>
          {puan !== null && <span className="quiz-puan"> · {puan} puan</span>}
        </p>
      )}
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
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [cevapHatasi, setCevapHatasi] = useState('')
  // Sıralama: girişli ve adı kayıtlı oyuncu bugünün ve dünün sorularını 30 saniyede cevaplar.
  const oyuncu = useOyuncu()
  const siraliGun = oyuncu.durum === 'kayitli' && puanliGun(tarih)
  const bugununMu = tarih === trBugun()
  const [sirali, setSirali] = useState<Record<number, SiraliDurum>>({})
  useEffect(() => setSirali({}), [tarih, oyuncu.durum])

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

  /** Sunucunun döndüğü sonucu cihazdaki kayda yazar (hesapla eşitlenir). */
  const kaydet = (sira: number, r: QuizSonucu) => {
    const k = quizKaydi(tarih)
    const cevaplar = [0, 1, 2].map((j) => k?.cevaplar[j] ?? null)
    const dogrular = [0, 1, 2].map((j) => k?.dogrular?.[j] ?? null)
    const puanlar = [0, 1, 2].map((j) => k?.puanlar?.[j] ?? null)
    cevaplar[sira - 1] = r.secim ?? SURE_DOLDU
    dogrular[sira - 1] = r.dogruIndex
    puanlar[sira - 1] = r.puan
    const dogru = cevaplar.filter((c, j) => c !== null && c === dogrular[j]).length
    const yeni: QuizKaydi = { cevaplar, dogrular, puanlar, dogru, cozulme: bugun() }
    quizKaydet(tarih, yeni)
    setKayit(yeni)
    return yeni
  }

  const cevaplanmamis = durumlar.filter((x) => x.soru && cevabi(kayit, x) === null)
  const aktif = durumlar.find((x) => x.sira === gosterilen) ?? cevaplanmamis[0] ?? null
  const aktifSira = aktif && aktif.soru && cevabi(kayit, aktif) === null ? aktif.sira : null

  // Sıralamaya giren sorunun sunucudaki durumu: başlamış mı, süresi ne kadar kaldı, cevaplanmış mı.
  useEffect(() => {
    if (aktifSira === null || !siraliGun || sirali[aktifSira]) return
    const sira = aktifSira
    setSirali((s) => ({ ...s, [sira]: { tur: 'yukleniyor' } }))
    quizDurumuGetir(tarih, sira, false)
      .then((q) => {
        if (q.basladi && q.sonuc) {
          kaydet(sira, q.sonuc)
          setGosterilen(sira)
          setSirali((s) => ({ ...s, [sira]: { tur: 'kapali' } }))
        } else
          setSirali((s) => ({ ...s, [sira]: q.basladi ? { tur: 'suruyor', bitis: Date.now() + q.kalanMs } : { tur: 'bekliyor' } }))
      })
      .catch((e) => {
        if (e instanceof SiralamaHatasi && e.kod === 'oyuncu_yok') oyuncuyuYenile()
        // Sunucu bu soruyu sıralamaya almıyorsa (ör. cihazın tarihi farklı) soru süresiz oynanır.
        setSirali((s) => ({ ...s, [sira]: e instanceof SiralamaHatasi && e.kod !== 'baglanti' ? { tur: 'kapali' } : { tur: 'hata' } }))
      })
  }, [aktifSira, siraliGun, tarih, sirali])

  // Eski kayıtlarda doğru cevap yoktur; cevaplanmış sorunun doğrusu sunucudan bir kez alınır.
  const tamamlaniyor = useRef(false)
  useEffect(() => {
    const eksik = durumlar.filter((x) => x.soru && cevabi(kayit, x) !== null && cevabi(kayit, x)! >= 0 && dogruCevabi(kayit, x) === null)
    if (!eksik.length || tamamlaniyor.current) return
    tamamlaniyor.current = true
    void Promise.all(eksik.map((x) => quizCevapla(tarih, x.sira, cevabi(kayit, x)).then((r) => ({ sira: x.sira, r }))))
      .then((l) => {
        const k = quizKaydi(tarih)
        if (!k) return
        const dogrular = [0, 1, 2].map((j) => k.dogrular?.[j] ?? null)
        for (const { sira, r } of l) dogrular[sira - 1] = r.dogruIndex
        const yeni = { ...k, dogrular, dogru: k.cevaplar.filter((c, j) => c !== null && c === dogrular[j]).length }
        quizKaydet(tarih, yeni)
        setKayit(yeni)
      })
      .catch(() => undefined)
      .finally(() => {
        tamamlaniyor.current = false
      })
  }, [durumlar, kayit, tarih])

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

  const siradaki = durumlar.find((x) => !x.soru) ?? null

  const ilerleme = (
    <p className="quiz-ilerleme" aria-label={`${cevapSayisi(kayit)} / 3 soru cevaplandı`}>
      {durumlar.map((x) => {
        const c = cevabi(kayit, x)
        let sinif = 'nokta'
        if (c !== null && x.soru) sinif += c === dogruCevabi(kayit, x) ? ' dogru' : ' yanlis'
        else if (x.sira === aktif?.sira) sinif += ' simdiki'
        else if (!x.soru) sinif += ' kilitli'
        return <span key={x.sira} className={sinif} />
      })}
    </p>
  )

  const cevaplananlar = durumlar.filter((x) => x.soru && cevabi(kayit, x) !== null)
  const puan = gunPuani(kayit)
  const ozetListesi = (k: QuizKaydi | null) => (
    <ol className="quiz-ozet">
      {cevaplananlar.map((x) => (
        <OzetSatiri key={x.sira} soru={x.soru!} secim={cevabi(k, x)!} dogruIndex={dogruCevabi(k, x)} puan={k?.puanlar?.[x.sira - 1] ?? null} />
      ))}
    </ol>
  )
  const siralamaSatiri =
    puanliGun(tarih) && (puan !== null || oyuncu.durum === 'kayitli') ? (
      <p className="quiz-siralama">
        {puan !== null && (
          <span>
            {bugununMu ? 'Bugünkü' : 'Dünkü'} puanın: {puan}
          </span>
        )}
        <a className="metin-dugme" href={`#/siralama/quiz${bugununMu ? '' : '/dun'}`}>
          Sıralamayı gör
        </a>
      </p>
    ) : null

  // Tamamlanmış quiz: özet
  if (quizTamam(kayit) && gosterilen === null) {
    const k = kayit!
    const dogruSayi = k.dogru
    const isaretler = durumlar.map((x) => (x.soru && cevabi(k, x) === dogruCevabi(k, x) ? '✅' : '❌')).join('')
    const paylasimMetni = `${UYGULAMA_ADI}, ${baslik.replace(' soruları', '')}: ${dogruSayi}/3 ${isaretler}${puan !== null ? ` · ${puan} puan` : ''}`
    return (
      <div className="sayfa quiz">
        {yeniBitti && dogruSayi === 3 && <Konfeti />}
        <GeriDugmesi />
        <h1>{baslik}</h1>
        <p className="quiz-skor">
          <span className={`quiz-skor-sayi${yeniBitti ? ' quiz-skor-yeni' : ''}`}>{dogruSayi}/3</span>
          {tarih === bugun() && seri() > 0 && <span className="seri">{seri()} günlük seri</span>}
        </p>
        {siralamaSatiri}
        {ozetListesi(k)}
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
        {siralamaSatiri}
        {cevaplananlar.length > 0 && ozetListesi(kayit)}
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
  const dogruIndex = dogruCevabi(kayit, aktif)
  const siraliDurum: SiraliDurum = cevaplandi
    ? { tur: 'kapali' }
    : siraliGun
      ? (sirali[aktif.sira] ?? { tur: 'yukleniyor' })
      : puanliGun(tarih) && oyuncuBekleniyor(oyuncu)
        ? { tur: 'yukleniyor' }
        : { tur: 'kapali' }

  /** i null: süre doldu. Cevap sunucuda değerlendirilir; doğru cevap ancak o zaman gelir. */
  const sec = async (i: number | null) => {
    if (cevaplandi || gonderiliyor) return
    const sira = aktif.sira
    setGonderiliyor(true)
    setCevapHatasi('')
    try {
      const r = await quizCevapla(tarih, sira, i)
      kaydet(sira, r)
      setGosterilen(sira)
      sesCal(r.dogru ? 'dogru' : 'yanlis')
    } catch {
      setCevapHatasi('Cevap gönderilemedi. Bağlantını kontrol edip yeniden dene.')
    } finally {
      setGonderiliyor(false)
    }
  }

  const sureyiBaslat = async () => {
    const sira = aktif.sira
    setGonderiliyor(true)
    setCevapHatasi('')
    try {
      const q = await quizDurumuGetir(tarih, sira, true)
      if (q.basladi && q.sonuc) {
        kaydet(sira, q.sonuc)
        setGosterilen(sira)
      } else if (q.basladi) {
        sesCal('tik')
        setSirali((s) => ({ ...s, [sira]: { tur: 'suruyor', bitis: Date.now() + q.kalanMs } }))
      }
    } catch (e) {
      if (e instanceof SiralamaHatasi && e.kod !== 'baglanti') setSirali((s) => ({ ...s, [sira]: { tur: 'kapali' } }))
      else setCevapHatasi('Süre başlatılamadı. Bağlantını kontrol edip yeniden dene.')
    } finally {
      setGonderiliyor(false)
    }
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

  const videoEtiketi = soru.slot && (
    <p className="quiz-video-etiket">
      {SLOT_ADI[soru.slot]} videosundan{soru.video_baslik ? ` · ${soru.video_baslik}` : ''}
    </p>
  )

  // Sıralamaya giren soru: metin, Başla'ya basılana kadar gösterilmez.
  if (siraliDurum.tur === 'yukleniyor' || siraliDurum.tur === 'bekliyor' || siraliDurum.tur === 'hata') {
    return (
      <div className="sayfa quiz">
        <GeriDugmesi />
        <h1>{baslik}</h1>
        {ilerleme}
        {videoEtiketi}
        <div className="sure-baslat">
          {siraliDurum.tur === 'yukleniyor' ? (
            <div className="iskelet iskelet-buyuk" />
          ) : siraliDurum.tur === 'hata' ? (
            <>
              <p>Sıralamaya bağlanılamadı. Bağlantını kontrol edip yeniden dene.</p>
              <button
                className="dugme"
                onClick={() =>
                  setSirali((s) => {
                    const { [aktif.sira]: _, ...kalan } = s
                    return kalan
                  })
                }
              >
                Yeniden dene
              </button>
            </>
          ) : (
            <>
              <p className="sure-baslat-baslik">Bu soru sıralamaya giriyor</p>
              <p>30 saniyen var. Doğru cevap 50 puan, kalan her saniye 1 puan daha getirir.</p>
              <p className="aciklama kucuk">Süre Başla'ya basınca başlar; uygulamadan çıksan da durmaz.</p>
              {!bugununMu && <p className="aciklama kucuk">Dünün sorusu: puanın dünün sıralamasına yazılır.</p>}
              <button className="dugme" onClick={() => void sureyiBaslat()} disabled={gonderiliyor}>
                {gonderiliyor ? 'Başlıyor…' : 'Başla'}
              </button>
            </>
          )}
        </div>
        {cevapHatasi && <p className="uyari">{cevapHatasi}</p>}
      </div>
    )
  }

  return (
    <div className="sayfa quiz">
      <GeriDugmesi />
      <h1>{baslik}</h1>
      {ilerleme}
      {videoEtiketi}
      {siraliDurum.tur === 'suruyor' && !cevaplandi && (
        <SureSayaci bitis={siraliDurum.bitis} toplam={QUIZ_SURESI} onBitti={() => void sec(null)} />
      )}
      <h2 key={aktif.sira} className="quiz-soru">
        {soru.soru}
      </h2>
      <div className="quiz-secenekler">
        {soru.secenekler.map((s, i) => {
          let sinif = 'secenek'
          if (cevaplandi && i === dogruIndex) sinif += ' dogru'
          else if (cevaplandi && i === secilen) sinif += ' yanlis'
          return (
            <button
              key={i}
              className={sinif}
              onClick={() => void sec(i)}
              disabled={gonderiliyor || (cevaplandi && i !== secilen && i !== dogruIndex)}
            >
              <span className="secenek-harf">{HARF[i]}</span>
              {s}
            </button>
          )
        })}
      </div>
      {cevapHatasi && <p className="uyari">{cevapHatasi}</p>}
      {cevaplandi && (
        <div className="quiz-geri-bildirim" role="status">
          <p className="quiz-sonuc-metni">
            {secilen === SURE_DOLDU ? 'Süre doldu.' : secilen === dogruIndex ? 'Doğru.' : 'Yanlış.'}
            {typeof kayit?.puanlar?.[aktif.sira - 1] === 'number' && <span className="quiz-puan"> +{kayit.puanlar[aktif.sira - 1]} puan</span>}
          </p>
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
