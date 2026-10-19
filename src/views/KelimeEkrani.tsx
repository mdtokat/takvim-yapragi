import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DENEME_SAYISI, KELIME_UZUNLUGU, harfDurumlari, harfNormalle, kazanildi, oyunBitti, zorModHatasi } from '../lib/harfler'
import {
  OyunHatasi,
  bitisBilgisi,
  bugunuSor,
  denemeleriGetir,
  kelimeOner,
  oturumHazirla,
  oturumuYenile,
  tahminGonder,
  tumDenemeler,
  type BitisBilgisi,
  type KelimeSlotu,
  type Satir,
} from '../lib/kelimeOyunu'
import { istatistikHesapla, type Istatistik } from '../lib/istatistik'
import { ayarlariGuncelle, ayarlariOku, useAyarlar, zorModOyunu, zorModOyunuKaydet } from '../lib/ayarlar'
import { hareketAzalt } from '../lib/platform'
import { SLOT_ADI, SLOT_SAATI, type Slot } from '../lib/sabitler'
import { sesCal } from '../lib/ses'
import { AYLAR, gunEkle, saatMetni, saatteMetni, sureMetni, trBugun, trZamani } from '../lib/tarih'
import { Izgara } from '../components/kelime/Izgara'
import { Klavye } from '../components/kelime/Klavye'
import { KelimeProgrami } from '../components/kelime/KelimeProgrami'
import { Bildirimler, type Bildirim } from '../components/kelime/Bildirimler'
import { YardimPenceresi } from '../components/kelime/YardimPenceresi'
import { SonucPenceresi } from '../components/kelime/SonucPenceresi'

type Asama = 'yukleniyor' | 'oyun' | 'hazirlaniyor' | 'hata'
type PencereAdi = 'yardim' | 'sonuc' | null

const TEBRIK = ['Dahice!', 'Olağanüstü!', 'Harika!', 'Çok iyi!', 'Güzel!', 'Son anda!']
const ACILIS_MS = 260 * (KELIME_UZUNLUGU - 1) + 520

const BOS: Satir[] = []

const tarihBasligi = (t: string) => {
  const [, a, g] = t.split('-').map(Number)
  return t ? `${g} ${AYLAR[a - 1]}` : ''
}

export function KelimeEkrani() {
  const ayar = useAyarlar()
  const [asama, setAsama] = useState<Asama>('yukleniyor')
  const [hataAyrinti, setHataAyrinti] = useState('')
  const [tarih, setTarih] = useState('')
  // Günde üç kelime: her biri kendi videosunun (sabah, öğlen, akşam) yayın saatinde açılır.
  const [slotlar, setSlotlar] = useState<KelimeSlotu[]>([])
  const [secili, setSecili] = useState<Slot | null>(null)
  const [oyunlar, setOyunlar] = useState<Partial<Record<Slot, Satir[]>>>({})
  const [renkliSatir, setRenkliSatir] = useState(0)
  const [mevcut, setMevcut] = useState('')
  const [simdi, setSimdi] = useState(() => Date.now())
  const [bitis, setBitis] = useState<BitisBilgisi | null>(null)
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [animasyon, setAnimasyon] = useState(false)
  const [acilanSatir, setAcilanSatir] = useState<number | null>(null)
  const [sallanan, setSallanan] = useState(false)
  const [zipla, setZipla] = useState<number | null>(null)
  const [pencere, setPencere] = useState<PencereAdi>(null)
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([])
  const [istatistik, setIstatistik] = useState<Istatistik | null>(null)
  const bildirimNo = useRef(0)
  const seciliRef = useRef<Slot | null>(null)
  seciliRef.current = secili

  const satirlar = (secili && oyunlar[secili]) || BOS
  const seciliSlot = slotlar.find((s) => s.slot === secili) ?? null
  const kilitli = !!seciliSlot && !seciliSlot.acik
  const kazandi = kazanildi(satirlar)
  const bitti = oyunBitti(satirlar)
  // Oyun başladıktan sonra zor mod o kelime için sabit kalır; ayar değişikliği sonraki kelimede geçerli olur.
  const zorMod = satirlar.length > 0 && secili ? zorModOyunu(tarih, secili) : ayar.zorMod
  const durumlar = useMemo(() => harfDurumlari(satirlar.slice(0, renkliSatir)), [satirlar, renkliSatir])

  const bildir = useCallback((metin: string, eylem?: Bildirim['eylem'], sure = 2200) => {
    const id = ++bildirimNo.current
    setBildirimler((l) => [...l.slice(-2), { id, metin, eylem }])
    setTimeout(() => setBildirimler((l) => l.filter((b) => b.id !== id)), sure)
  }, [])

  const salla = useCallback(() => {
    setSallanan(true)
    sesCal('yanlis')
    setTimeout(() => setSallanan(false), 450)
  }, [])

  const istatistikYukle = useCallback(async (t: string) => {
    try {
      setIstatistik(istatistikHesapla(await tumDenemeler(), t))
    } catch {
      /* istatistik yüklenemezse pencere onsuz açılır */
    }
  }, [])

  /** Tahtayı seçilen kelimeye geçirir. Kelime bitmişse cevap bilgisi sunucudan gelir. */
  const slotSec = useCallback((t: string, slot: Slot, s: Satir[]) => {
    setSecili(slot)
    seciliRef.current = slot
    setRenkliSatir(s.length)
    setMevcut('')
    setAcilanSatir(null)
    setZipla(null)
    setBitis(null)
    if (oyunBitti(s)) void bitisBilgisi(t, slot).then((b) => seciliRef.current === slot && setBitis(b))
  }, [])

  const baslat = useCallback(async (istenen?: Slot) => {
    setAsama('yukleniyor')
    setPencere(null)
    try {
      await oturumHazirla()
      const b = await bugunuSor()
      setTarih(b.tarih)
      setSlotlar(b.slotlar)
      if (b.slotlar.length === 0) {
        setAsama('hazirlaniyor')
        return
      }
      const satirlari = await Promise.all(b.slotlar.map((s) => (s.acik ? denemeleriGetir(b.tarih, s.slot) : Promise.resolve([]))))
      const yeni: Partial<Record<Slot, Satir[]>> = {}
      b.slotlar.forEach((s, i) => (yeni[s.slot] = satirlari[i]))
      setOyunlar(yeni)
      // İstenen kelime yoksa en yeni açılmış ve bitmemiş kelime, o da yoksa en yeni açılmış kelime seçilir.
      const aciklar = b.slotlar.filter((s) => s.acik)
      const sec =
        b.slotlar.find((s) => s.slot === istenen) ??
        [...aciklar].reverse().find((s) => !oyunBitti(yeni[s.slot] ?? [])) ??
        aciklar.at(-1) ??
        b.slotlar[0]
      const s = yeni[sec.slot] ?? []
      slotSec(b.tarih, sec.slot, s)
      setAsama('oyun')
      void istatistikYukle(b.tarih)
      if (!sec.acik) return
      if (oyunBitti(s)) setPencere('sonuc')
      else if (!ayarlariOku().yardimGoruldu) {
        setPencere('yardim')
        ayarlariGuncelle({ yardimGoruldu: true })
      }
    } catch (e) {
      setHataAyrinti(
        e instanceof OyunHatasi && e.kod === 'anonim_kapali'
          ? 'Geliştirici notu: Supabase projesinde anonim girişler kapalı. Authentication ayarlarından "Anonymous sign-ins" seçeneğini aç.'
          : '',
      )
      setAsama('hata')
    }
  }, [istatistikYukle, slotSec])

  useEffect(() => {
    void baslat()
  }, [baslat])

  // Gün değişimi ve video saati: uygulama öne gelince veya dakikada bir kontrol et.
  useEffect(() => {
    const kontrol = () => {
      if (document.visibilityState !== 'visible' || !tarih) return
      if (trBugun() !== tarih) {
        void baslat()
        return
      }
      const acilan = slotlar.filter((s) => !s.acik && Date.parse(s.acilis) <= Date.now())
      if (acilan.length === 0) return
      if (acilan.some((s) => s.slot === secili)) void baslat(secili ?? undefined)
      else void bugunuSor().then((b) => b.tarih === tarih && setSlotlar(b.slotlar)).catch(() => undefined)
    }
    document.addEventListener('visibilitychange', kontrol)
    const t = setInterval(kontrol, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', kontrol)
      clearInterval(t)
    }
  }, [tarih, slotlar, secili, baslat])

  // Geri sayımlar için saniyelik saat.
  useEffect(() => {
    const t = setInterval(() => setSimdi(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const oynanabilir = asama === 'oyun' && !kilitli && !bitti && !gonderiliyor && !animasyon
  const gonderilebilir = oynanabilir && [...mevcut].length === KELIME_UZUNLUGU
  // Sıradaki kelime: bugünün açılmamış videosu, yoksa yarın sabah 08:00.
  const siradaki = slotlar.find((s) => !s.acik) ?? null
  const yarinIlk = tarih ? trZamani(gunEkle(tarih, 1), SLOT_SAATI.sabah) : 0
  const sonrakiAcilis = siradaki ? Date.parse(siradaki.acilis) : yarinIlk
  // Bitmiş bir kelimeden sonra geçilebilecek, açık ve bitmemiş başka bir kelime
  const digerAcik = slotlar.find((s) => s.acik && s.slot !== secili && !oyunBitti(oyunlar[s.slot] ?? []))

  const harfEkle = (h: string) => {
    if (!oynanabilir) return
    setMevcut((m) => (m.length < KELIME_UZUNLUGU ? m + h : m))
  }
  const harfSil = () => {
    if (!oynanabilir) return
    setMevcut((m) => [...m].slice(0, -1).join(''))
  }

  const gonder = async () => {
    if (!oynanabilir || !secili) return
    const slot = secili
    const kelime = mevcut
    if ([...kelime].length < KELIME_UZUNLUGU) {
      salla()
      bildir('Kelime 5 harfli olmalı')
      return
    }
    if (zorMod) {
      const h = zorModHatasi(kelime, satirlar)
      if (h) {
        salla()
        bildir(h)
        return
      }
    }
    setGonderiliyor(true)
    try {
      const r = await tahminGonder(kelime, slot)
      if (!r.gecerli) {
        salla()
        bildir(
          'Sözlükte yok',
          {
            ad: 'Kelimeyi öner',
            f: async () => bildir((await kelimeOner(kelime)) ? 'Önerin alındı, incelenecek' : 'Öneri gönderilemedi. Bağlantını kontrol edip yeniden dene.'),
          },
          4500,
        )
        return
      }
      if (r.tarih && r.tarih !== tarih) {
        bildir('Yeni gün başladı')
        await baslat()
        return
      }
      if (satirlar.length === 0 && ayar.zorMod) zorModOyunuKaydet(tarih, slot)
      const sira = satirlar.length
      const yeni = [...satirlar, { tahmin: kelime, sonuc: r.sonuc ?? [] }]
      setOyunlar((o) => ({ ...o, [slot]: yeni }))
      setMevcut('')
      setAcilanSatir(sira)
      setAnimasyon(true)
      setTimeout(
        () => {
          setRenkliSatir(yeni.length)
          setAnimasyon(false)
          if (!r.bitti) return
          if (r.cevap) setBitis({ cevap: r.cevap, anlam: r.anlam ?? '', ornek: r.ornek ?? '', videoBaslik: null })
          // Tahmin cevabı videoyu taşımaz; video bilgisi bitiş fonksiyonundan tamamlanır.
          void bitisBilgisi(tarih, slot).then((b) => b && seciliRef.current === slot && setBitis(b))
          if (r.dogru) {
            setZipla(sira)
            sesCal('tamam')
            bildir(TEBRIK[sira])
          } else if (r.cevap) {
            sesCal('yanlis')
            bildir(`Kelime: ${r.cevap}`, undefined, 4000)
          }
          void istatistikYukle(tarih)
          setTimeout(() => setPencere('sonuc'), 1700)
        },
        hareketAzalt() ? 0 : ACILIS_MS,
      )
    } catch (e) {
      if (e instanceof OyunHatasi && (e.kod === 'oyun_bitti' || e.kod === 'bulmaca_yok' || e.kod === 'cakisma')) {
        await baslat(slot)
      } else if (e instanceof OyunHatasi && e.kod === 'oturum') {
        await oturumuYenile().catch(() => undefined)
        bildir('Oturum yenilendi, yeniden dene')
      } else {
        bildir('Bağlantı kurulamadı. Yeniden dene.')
      }
    } finally {
      setGonderiliyor(false)
    }
  }

  // Fiziksel klavye
  const isleyiciler = useRef({ harfEkle, harfSil, gonder })
  isleyiciler.current = { harfEkle, harfSil, gonder }
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return
      const hedef = e.target as HTMLElement | null
      if (hedef?.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'Enter') {
        e.preventDefault()
        void isleyiciler.current.gonder()
      } else if (e.key === 'Backspace') isleyiciler.current.harfSil()
      else {
        const h = harfNormalle(e.key)
        if (h) isleyiciler.current.harfEkle(h)
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])

  const videodan = !!seciliSlot?.videoBaslik
  const sec = (s: KelimeSlotu) => {
    if (secili === s.slot) return
    sesCal('tik')
    slotSec(tarih, s.slot, oyunlar[s.slot] ?? [])
  }

  return (
    <div className="kelime">
      <header className="kelime-ust">
        <button className="ikon-dugme" onClick={() => setPencere('yardim')} aria-label="Nasıl oynanır">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.8v.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1.1" fill="currentColor" />
          </svg>
        </button>
        <div className="kelime-baslik">
          <h1>Kelime</h1>
          <p>{tarih ? `${tarihBasligi(tarih)} · her videoya bir kelime` : 'Her videoya bir kelime'}</p>
        </div>
        <button className="ikon-dugme" onClick={() => setPencere('sonuc')} aria-label="İstatistikler" disabled={asama !== 'oyun' || kilitli}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 20V12M10 20V6M15 20v-9M20 20V9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {slotlar.length > 0 && (
        <KelimeProgrami slotlar={slotlar} oyunlar={oyunlar} secili={secili} simdi={simdi} pasif={gonderiliyor || animasyon} onSec={sec} />
      )}

      {asama === 'oyun' && !(kilitli && siradaki?.slot === secili) && (
        <p className="kelime-sonraki">
          {siradaki
            ? `Sıradaki kelime ${SLOT_ADI[siradaki.slot].toLocaleLowerCase('tr-TR')} videosuyla ${saatteMetni(siradaki.acilis)} açılıyor.`
            : `Bugünün üç kelimesi de açık. Yarının ilk kelimesi ${saatteMetni(new Date(yarinIlk).toISOString())} açılıyor.`}
        </p>
      )}

      <Bildirimler liste={bildirimler} />

      <div className="tahta" aria-busy={asama === 'yukleniyor'}>
        {asama === 'hazirlaniyor' ? (
          <div className="bos-durum">
            <p>Bugünün kelimeleri hazırlanıyor. Yeni bulmacalar her gün ekleniyor.</p>
            <button className="dugme" onClick={() => void baslat()}>
              Yeniden dene
            </button>
          </div>
        ) : asama === 'hata' ? (
          <div className="bos-durum">
            <p>Oyuna bağlanılamadı. İnternet bağlantını kontrol edip yeniden dene.</p>
            {hataAyrinti && <p className="kucuk">{hataAyrinti}</p>}
            <button className="dugme" onClick={() => void baslat()}>
              Yeniden dene
            </button>
          </div>
        ) : kilitli && seciliSlot ? (
          <div className="kelime-bekleme">
            <p className="bekleme-ad">{SLOT_ADI[seciliSlot.slot]} kelimesi</p>
            <p className="bekleme-saat">{saatMetni(seciliSlot.acilis)}</p>
            <p>{SLOT_ADI[seciliSlot.slot]} videosuyla birlikte açılır.</p>
            <p className="bekleme-kalan">
              {Date.parse(seciliSlot.acilis) > simdi ? `${sureMetni(Date.parse(seciliSlot.acilis) - simdi)} kaldı` : 'Açılıyor…'}
            </p>
          </div>
        ) : (
          <Izgara satirlar={satirlar} mevcut={mevcut} acilanSatir={acilanSatir} sallanan={sallanan} zipla={zipla} yaziliyor={oynanabilir} />
        )}
      </div>

      {asama === 'oyun' && !kilitli && secili && !bitti && (
        <>
          <p className="kelime-durum">
            Deneme {Math.min(satirlar.length + 1, DENEME_SAYISI)}/{DENEME_SAYISI}
            {videodan && ` · ${SLOT_ADI[secili].toLocaleLowerCase('tr-TR')} videosunda geçiyor`}
          </p>
          <div className="kelime-eylem">
            <button className="dugme gonder-dugmesi" onClick={() => void gonder()} disabled={!gonderilebilir}>
              {gonderiliyor ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          </div>
          <Klavye durumlar={durumlar} pasif={!oynanabilir} onHarf={harfEkle} onSil={harfSil} />
        </>
      )}

      {asama === 'oyun' && !kilitli && secili && bitti && !animasyon && (
        <section className="kelime-ozet" aria-label="Sonuç">
          <p className="ozet-baslik">{kazandi ? `${satirlar.length}. denemede buldun` : 'Bu sefer olmadı'}</p>
          {bitis && (
            <p className="ozet-kelime">
              <strong>{bitis.cevap}</strong> · {bitis.anlam}
            </p>
          )}
          <div className="ozet-dugmeler">
            <button className="dugme" onClick={() => setPencere('sonuc')}>
              Sonucu gör
            </button>
            {digerAcik && (
              <button className="dugme dugme-ikincil" onClick={() => sec(digerAcik)}>
                {SLOT_ADI[digerAcik.slot]} kelimesine geç
              </button>
            )}
          </div>
        </section>
      )}

      {pencere === 'yardim' && <YardimPenceresi onKapat={() => setPencere(null)} />}
      {pencere === 'sonuc' && (
        <SonucPenceresi
          tarih={tarih}
          slot={secili}
          sonrakiAcilis={sonrakiAcilis}
          satirlar={satirlar}
          bitti={bitti}
          kazandi={kazandi}
          bitis={bitis}
          istatistik={istatistik}
          onKapat={() => setPencere(null)}
          onBildir={bildir}
        />
      )}
    </div>
  )
}
