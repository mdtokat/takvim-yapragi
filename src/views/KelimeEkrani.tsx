import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DENEME_SAYISI, KELIME_UZUNLUGU, harfDurumlari, harfNormalle, kazanildi, oyunBitti, zorModHatasi } from '../lib/harfler'
import { OyunHatasi, bugunuSor, degerlendir, kelimeOner, type KelimeSlotu, type Satir } from '../lib/kelimeOyunu'
import { kelimeAnahtari, kelimeKaydet, kelimeKayitlari, type KelimeKaydi } from '../lib/kelimeDepo'
import { useDepoSurumu } from '../lib/senkron'
import { istatistikHesapla, type Istatistik } from '../lib/istatistik'
import { ayarlariGuncelle, ayarlariOku, useAyarlar } from '../lib/ayarlar'
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

const satirlariOlustur = (k: KelimeKaydi | undefined | null): Satir[] =>
  k ? k.tahminler.map((tahmin, i) => ({ tahmin, sonuc: k.sonuclar[i] ?? [] })) : BOS

const tarihBasligi = (t: string) => {
  const [, a, g] = t.split('-').map(Number)
  return t ? `${g} ${AYLAR[a - 1]}` : ''
}

export function KelimeEkrani() {
  const ayar = useAyarlar()
  const depoSurumu = useDepoSurumu()
  const [asama, setAsama] = useState<Asama>('yukleniyor')
  const [tarih, setTarih] = useState('')
  // Günde üç kelime: her biri kendi videosunun (sabah, öğlen, akşam) yayın saatinde açılır.
  const [slotlar, setSlotlar] = useState<KelimeSlotu[]>([])
  const [secili, setSecili] = useState<Slot | null>(null)
  const [renkliSatir, setRenkliSatir] = useState(0)
  const [mevcut, setMevcut] = useState('')
  const [simdi, setSimdi] = useState(() => Date.now())
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [animasyon, setAnimasyon] = useState(false)
  const [acilanSatir, setAcilanSatir] = useState<number | null>(null)
  const [sallanan, setSallanan] = useState(false)
  const [zipla, setZipla] = useState<number | null>(null)
  const [pencere, setPencere] = useState<PencereAdi>(null)
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([])
  const bildirimNo = useRef(0)

  // Oyun durumu cihazdaki depodadır (girişliyse hesapla eşitlenir); depo değişince yeniden okunur.
  const kayitlar = useMemo(() => kelimeKayitlari(), [depoSurumu])
  const oyunlar = useMemo(() => {
    const o: Partial<Record<Slot, Satir[]>> = {}
    for (const s of slotlar) o[s.slot] = satirlariOlustur(kayitlar[kelimeAnahtari(tarih, s.slot)])
    return o
  }, [kayitlar, slotlar, tarih])
  const istatistik = useMemo<Istatistik>(
    () =>
      istatistikHesapla(
        Object.values(kayitlar)
          .filter((k) => k.durum !== 'devam')
          .map((k) => ({ tarih: k.tarih, deneme: k.tahminler.length, kazandi: k.durum === 'kazandi' })),
        tarih || trBugun(),
      ),
    [kayitlar, tarih],
  )

  const kayit = secili && tarih ? (kayitlar[kelimeAnahtari(tarih, secili)] ?? null) : null
  const bitis = kayit?.bitis ?? null
  const satirlar = (secili && oyunlar[secili]) || BOS
  const seciliSlot = slotlar.find((s) => s.slot === secili) ?? null
  const kilitli = !!seciliSlot && !seciliSlot.acik
  const kazandi = kazanildi(satirlar)
  const bitti = oyunBitti(satirlar)
  // Oyun başladıktan sonra zor mod o kelime için sabit kalır; ayar değişikliği sonraki kelimede geçerli olur.
  const zorMod = kayit && satirlar.length > 0 ? kayit.zorMod : ayar.zorMod
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

  /** Tahtayı seçilen kelimeye geçirir. */
  const slotSec = useCallback((slot: Slot, s: Satir[]) => {
    setSecili(slot)
    setRenkliSatir(s.length)
    setMevcut('')
    setAcilanSatir(null)
    setZipla(null)
  }, [])

  const baslat = useCallback(
    async (istenen?: Slot) => {
      setAsama('yukleniyor')
      setPencere(null)
      try {
        const b = await bugunuSor()
        setTarih(b.tarih)
        setSlotlar(b.slotlar)
        if (b.slotlar.length === 0) {
          setAsama('hazirlaniyor')
          return
        }
        const k = kelimeKayitlari()
        const oyun = (s: Slot) => satirlariOlustur(k[kelimeAnahtari(b.tarih, s)])
        // İstenen kelime yoksa en yeni açılmış ve bitmemiş kelime, o da yoksa en yeni açılmış kelime seçilir.
        const aciklar = b.slotlar.filter((s) => s.acik)
        const sec =
          b.slotlar.find((s) => s.slot === istenen) ??
          [...aciklar].reverse().find((s) => !oyunBitti(oyun(s.slot))) ??
          aciklar.at(-1) ??
          b.slotlar[0]
        const s = oyun(sec.slot)
        slotSec(sec.slot, s)
        setAsama('oyun')
        if (!sec.acik) return
        if (oyunBitti(s)) setPencere('sonuc')
        else if (!ayarlariOku().yardimGoruldu) {
          setPencere('yardim')
          ayarlariGuncelle({ yardimGoruldu: true })
        }
      } catch {
        setAsama('hata')
      }
    },
    [slotSec],
  )

  useEffect(() => {
    void baslat()
  }, [baslat])

  // Hesap eşitlemesi seçili kelimenin tahtasını değiştirdiyse (başka cihazda oynanmış) renkler güncellenir.
  useEffect(() => {
    if (!animasyon) setRenkliSatir(satirlar.length)
  }, [satirlar.length, animasyon])

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
      const tahminler = [...satirlar.map((s) => s.tahmin), kelime]
      const r = await degerlendir(tarih, slot, tahminler)
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
      const sira = satirlar.length
      kelimeKaydet({
        tarih,
        slot,
        tahminler,
        sonuclar: r.sonuclar,
        durum: !r.bitti ? 'devam' : r.dogru ? 'kazandi' : 'kaybetti',
        zorMod,
        bitis: r.bitis,
        guncelleme: Date.now(),
      })
      setMevcut('')
      setAcilanSatir(sira)
      setAnimasyon(true)
      setTimeout(
        () => {
          setRenkliSatir(tahminler.length)
          setAnimasyon(false)
          if (!r.bitti) return
          if (r.dogru) {
            setZipla(sira)
            sesCal('tamam')
            bildir(TEBRIK[sira])
          } else if (r.bitis) {
            sesCal('yanlis')
            bildir(`Kelime: ${r.bitis.cevap}`, undefined, 4000)
          }
          setTimeout(() => setPencere('sonuc'), 1700)
        },
        hareketAzalt() ? 0 : ACILIS_MS,
      )
    } catch (e) {
      if (e instanceof OyunHatasi && (e.kod === 'oyun_bitti' || e.kod === 'bulmaca_yok')) await baslat(slot)
      else bildir('Bağlantı kurulamadı. Yeniden dene.')
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
    slotSec(s.slot, oyunlar[s.slot] ?? [])
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
          zorMod={!!kayit?.zorMod}
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
