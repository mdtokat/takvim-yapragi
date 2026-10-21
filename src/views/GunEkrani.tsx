import { useEffect, useMemo, useRef, useState } from 'react'
import { gunuGetir, onbellektekiGun, rastgeleDoluGun } from '../lib/api'
import { bugun, gunEkle, tarihCoz, artikYil, puanliGun, saatteMetni, trBugun, trZamani } from '../lib/tarih'
import { degistir, git } from '../lib/yonlendirme'
import { ayarlariGuncelle, useAyarlar } from '../lib/ayarlar'
import { cevabi, cevapSayisi, quizKaydi, quizTamam, seri, soruDurumlari, useAcilisYenile, type QuizKaydi, type SoruDurumu } from '../lib/quizDepo'
import { SLOT_ADI, SLOT_SAATI, type Slot } from '../lib/sabitler'
import { kelimeKaydi } from '../lib/kelimeDepo'
import { useOyuncu } from '../lib/siralama'
import { TURLER, type GunVerisi, type GununBilgisi, type Tur } from '../lib/tipler'
import { sesCal } from '../lib/ses'
import { useDepoSurumu } from '../lib/senkron'
import { hareketAzalt } from '../lib/platform'
import { Yaprak } from '../components/Yaprak'
import { OlayListesi } from '../components/OlayListesi'
import { KategoriSecici } from '../components/KategoriSecici'
import { KelimeIkonu, SoruIkonu } from '../components/KoseIkonu'

function soruDurumMetni(durumlar: SoruDurumu[], kayit: QuizKaydi | null): string {
  if (quizTamam(kayit)) return `${kayit!.dogru}/3 doğru`
  const acik = durumlar.filter((d) => d.soru && cevabi(kayit, d) === null)
  if (acik.length === 3) return 'Üç soru seni bekliyor'
  if (acik.length > 0) return acik[0].slot ? `${SLOT_ADI[acik[0].slot]} sorusu açıldı` : 'Sıradaki soruyu çöz'
  const siradaki = durumlar.find((d) => !d.soru)
  if (siradaki?.acilis) return `${cevapSayisi(kayit) ? 'Sıradaki' : 'İlk'} soru ${saatteMetni(siradaki.acilis)} açılır`
  return 'Cevaplarını gör'
}

/** Kelimeler videolarla birlikte açılır; köşe açık olanı ve sıradakinin saatini yazar. */
function kelimeDurumMetni(simdi = Date.now()): string {
  const gun = trBugun(new Date(simdi))
  const slotlar = Object.keys(SLOT_SAATI) as Slot[]
  const acilis = (s: Slot, g = gun) => trZamani(g, SLOT_SAATI[s])
  const acik = slotlar.filter((s) => acilis(s) <= simdi)
  const siradaki = slotlar.find((s) => acilis(s) > simdi)
  if (!siradaki) return `Üç kelime de açık. Yarın ilki ${saatteMetni(new Date(acilis('sabah', gunEkle(gun, 1))).toISOString())}`
  const saat = saatteMetni(new Date(acilis(siradaki)).toISOString())
  if (acik.length === 0) return `İlk kelime ${saat} açılıyor`
  return `${SLOT_ADI[acik[acik.length - 1]]} kelimesi açık. Sıradaki ${saat}`
}

/** Geçmiş bir günün kelimeleri: cihazdaki oyunlara göre. */
function gecmisKelimeMetni(tarih: string): string {
  const oyunlar = (Object.keys(SLOT_SAATI) as Slot[]).map((s) => kelimeKaydi(tarih, s))
  const biten = oyunlar.filter((k) => k && k.durum !== 'devam')
  if (!oyunlar.some((k) => k && k.tahminler.length > 0)) return 'Üç kelime seni bekliyor'
  if (biten.length < 3) return `${biten.length}/3 kelime bitti`
  return `${biten.filter((k) => k!.durum === 'kazandi').length}/3 kelime bulundu`
}

interface Gecis {
  no: number
  yon: 'ileri' | 'geri'
  tarih: string
  bilgi: GununBilgisi | null | undefined
  cekme: number
}

interface Durum {
  veri: GunVerisi | null
  yukleniyor: boolean
  hata: boolean
  onbellekten: boolean
}

export function GunEkrani({ tarih: hamTarih }: { tarih: string }) {
  useDepoSurumu() // quiz sonucu hesap eşitlemesiyle değişince köşe yenilensin
  const tarih = tarihCoz(hamTarih) ? hamTarih : bugun()
  const ayar = useAyarlar()
  const oyuncu = useOyuncu()
  const [tur, setTur] = useState<Tur>('olay')
  const [deneme, setDeneme] = useState(0)
  const [durum, setDurum] = useState<Durum>(() => {
    const ob = onbellektekiGun(tarih)
    return { veri: ob, yukleniyor: true, hata: false, onbellekten: !!ob }
  })
  // Gün değişirken eski yaprak bir an daha gösterilir: ileri giderken koparılıp düşer,
  // geri giderken yeni yaprağın altında kalır.
  const [gecis, setGecis] = useState<Gecis | null>(null)
  const gecisNo = useRef(0)
  useEffect(() => {
    let iptal = false
    const ob = onbellektekiGun(tarih)
    setDurum({ veri: ob, yukleniyor: true, hata: false, onbellekten: !!ob })
    gunuGetir(tarih)
      .then((s) => !iptal && setDurum({ veri: s.veri, yukleniyor: false, hata: false, onbellekten: s.onbellekten }))
      .catch(() => !iptal && setDurum((d) => ({ ...d, yukleniyor: false, hata: true })))
    return () => {
      iptal = true
    }
  }, [tarih, deneme])

  useEffect(() => {
    if (!gecis) return
    const t = setTimeout(() => setGecis((g) => (g === gecis ? null : g)), 900)
    return () => clearTimeout(t)
  }, [gecis])

  const gunGit = (t: string, cekme = 0) => {
    if (t === tarih) return
    const yon = t > tarih ? 'ileri' : 'geri'
    sesCal(yon === 'ileri' ? 'yirt' : 'geriAl')
    if (!hareketAzalt()) {
      const bilgi = durum.veri ? durum.veri.bilgi : durum.yukleniyor ? undefined : null
      setGecis({ no: ++gecisNo.current, yon, tarih, bilgi, cekme })
    }
    degistir(t === bugun() ? '/' : `/gun/${t}`)
  }
  const gunDegis = (n: number, cekme = 0) => gunGit(gunEkle(tarih, n), cekme)

  // Masaüstünde ok tuşlarıyla gün değiştirme.
  const gunDegisRef = useRef(gunDegis)
  gunDegisRef.current = gunDegis
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const hedef = e.target as HTMLElement | null
      if (hedef?.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowLeft') gunDegisRef.current(-1)
      else if (e.key === 'ArrowRight') gunDegisRef.current(1)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])

  const filtreli = useMemo(() => {
    const liste = durum.veri?.olaylar ?? []
    return ayar.kategoriler.length ? liste.filter((o) => ayar.kategoriler.includes(o.kategori)) : liste
  }, [durum.veri, ayar.kategoriler])

  const sayilar = useMemo(() => {
    const s: Record<Tur, number> = { olay: 0, dogum: 0, olum: 0 }
    filtreli.forEach((o) => s[o.tur]++)
    return s
  }, [filtreli])

  const gosterilen = filtreli.filter((o) => o.tur === tur)
  const veri = durum.veri
  const durumlar = useMemo(() => soruDurumlari(veri), [veri])
  useAcilisYenile(durumlar, () => setDeneme((n) => n + 1))
  const quizHazir = durumlar.length === 3 && tarih <= bugun()
  // Dünün soruları ve kelimeleri bu gece 23:59'a kadar sıralamaya girer.
  const dunMu = tarih !== trBugun() && puanliGun(tarih)
  const puanliNotu = dunMu && oyuncu.durum === 'kayitli' ? <span className="seri">23:59'a kadar puanlı</span> : null
  const quizSonucu = quizKaydi(tarih)
  const buYil = tarihCoz(tarih)!.getFullYear() === new Date().getFullYear()

  const rastgele = async () => {
    const g = await rastgeleDoluGun()
    if (!g) return
    let y = new Date().getFullYear()
    if (g.ay === 2 && g.gun === 29) while (!artikYil(y)) y--
    git(`/gun/${y}-${String(g.ay).padStart(2, '0')}-${String(g.gun).padStart(2, '0')}`)
  }

  return (
    <div className="gun-ekrani">
      <header className="manset">
        <p className="manset-ad">Mindmash</p>
        <p className="manset-alt">Tarihte bugün, günün bilgisi ve soruları</p>
      </header>
      <div className="yaprak-yigini">
        {gecis?.yon === 'geri' && <Yaprak key={`g${gecis.no}`} tarih={gecis.tarih} bilgi={gecis.bilgi} kopya="alttaki" />}
        <Yaprak
          key={tarih}
          tarih={tarih}
          bilgi={veri ? veri.bilgi : durum.yukleniyor ? undefined : null}
          inis={gecis?.yon === 'geri'}
          onDegis={gunDegis}
          onGit={gunGit}
        />
        {gecis?.yon === 'ileri' && (
          <Yaprak
            key={`g${gecis.no}`}
            tarih={gecis.tarih}
            bilgi={gecis.bilgi}
            kopya="kopan"
            cekme={gecis.cekme}
            onBitti={() => setGecis((g) => (g?.no === gecis.no ? null : g))}
          />
        )}
      </div>

      {durum.onbellekten && !durum.yukleniyor && (
        <p className="uyari" role="status">
          Çevrimdışı gösteriliyor. Bağlantı gelince içerik güncellenir.
        </p>
      )}

      {(quizHazir || tarih === bugun() || dunMu) && (
        <div className="koseler">
          {quizHazir && (
            <a className="kose" href={`#/quiz/${tarih}`}>
              <span className="kose-ust">
                <SoruIkonu />
                <span className="kose-baslik">Günün soruları</span>
              </span>
              <span className="kose-durum">{soruDurumMetni(durumlar, quizSonucu)}</span>
              {tarih === bugun() && seri() > 0 && <span className="seri">{seri()} günlük seri</span>}
              {puanliNotu}
            </a>
          )}
          {tarih === bugun() && (
            <a className="kose" href="#/kelime">
              <span className="kose-ust">
                <KelimeIkonu />
                <span className="kose-baslik">Günün kelimesi</span>
              </span>
              <span className="kose-durum">{kelimeDurumMetni()}</span>
            </a>
          )}
          {dunMu && (
            <a className="kose" href={`#/kelime/${tarih}`}>
              <span className="kose-ust">
                <KelimeIkonu />
                <span className="kose-baslik">Günün kelimesi</span>
              </span>
              <span className="kose-durum">{gecmisKelimeMetni(tarih)}</span>
              {puanliNotu}
            </a>
          )}
        </div>
      )}

      {durum.hata && !veri ? (
        <div className="bos-durum">
          <p>İçerik yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.</p>
          <button className="dugme" onClick={() => setDeneme((n) => n + 1)}>
            Yeniden dene
          </button>
        </div>
      ) : !veri ? (
        <div className="liste-iskelet" aria-busy="true" aria-label="Yükleniyor">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="iskelet satir" />
          ))}
        </div>
      ) : veri.olaylar.length === 0 ? (
        <div className="bos-durum">
          <p>Bu günün yaprağı henüz hazırlanıyor. Yeni günler her gece ekleniyor.</p>
          <button className="dugme" onClick={() => void rastgele()}>
            Hazır bir gün aç
          </button>
        </div>
      ) : (
        <section className="olaylar" aria-labelledby="olaylar-baslik">
          <h2 id="olaylar-baslik" className="olaylar-baslik">
            Tarihte bugün
          </h2>
          <div className="sekmeler" role="tablist">
            {TURLER.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tur === t.id}
                className="sekme"
                onClick={() => {
                  if (tur !== t.id) sesCal('tik')
                  setTur(t.id)
                }}
              >
                {t.ad}
                <span className="sekme-sayi">{sayilar[t.id]}</span>
              </button>
            ))}
          </div>
          <KategoriSecici secili={ayar.kategoriler} onDegis={(k) => ayarlariGuncelle({ kategoriler: k })} />
          {gosterilen.length ? (
            <OlayListesi olaylar={gosterilen} yilDonumu={buYil} />
          ) : (
            <p className="bos-not">Bu filtreyle gösterilecek kayıt yok.</p>
          )}
        </section>
      )}
    </div>
  )
}
