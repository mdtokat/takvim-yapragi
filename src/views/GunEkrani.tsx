import { useEffect, useMemo, useRef, useState } from 'react'
import { gunuGetir, onbellektekiGun, rastgeleDoluGun } from '../lib/api'
import { bugun, gunEkle, tarihCoz, artikYil } from '../lib/tarih'
import { degistir, git } from '../lib/yonlendirme'
import { ayarlariGuncelle, useAyarlar } from '../lib/ayarlar'
import { quizKaydi, seri } from '../lib/quizDepo'
import { TURLER, type GunVerisi, type Tur } from '../lib/tipler'
import { Yaprak } from '../components/Yaprak'
import { OlayListesi } from '../components/OlayListesi'
import { KategoriSecici } from '../components/KategoriSecici'

interface Durum {
  veri: GunVerisi | null
  yukleniyor: boolean
  hata: boolean
  onbellekten: boolean
}

export function GunEkrani({ tarih: hamTarih }: { tarih: string }) {
  const tarih = tarihCoz(hamTarih) ? hamTarih : bugun()
  const ayar = useAyarlar()
  const [tur, setTur] = useState<Tur>('olay')
  const [deneme, setDeneme] = useState(0)
  const [durum, setDurum] = useState<Durum>(() => {
    const ob = onbellektekiGun(tarih)
    return { veri: ob, yukleniyor: true, hata: false, onbellekten: !!ob }
  })
  // Yaprak animasyonunun yönü: render sırasında önceki tarihle karşılaştırılır.
  const yonRef = useRef<{ t: string; yon: 'ileri' | 'geri' | null }>({ t: tarih, yon: null })
  if (yonRef.current.t !== tarih) {
    yonRef.current = { t: tarih, yon: tarih > yonRef.current.t ? 'ileri' : 'geri' }
  }
  const yon = yonRef.current.yon

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

  const gunDegis = (n: number) => degistir(`/gun/${gunEkle(tarih, n)}`)
  const gunGit = (t: string) => degistir(t === bugun() ? '/' : `/gun/${t}`)

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
  const quizHazir = !!veri && veri.quiz.length === 3 && tarih <= bugun()
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
      <Yaprak
        key={tarih}
        tarih={tarih}
        bilgi={veri ? veri.bilgi : durum.yukleniyor ? undefined : null}
        yon={yon}
        onDegis={gunDegis}
        onGit={gunGit}
      />

      {durum.onbellekten && !durum.yukleniyor && (
        <p className="uyari" role="status">
          Çevrimdışı gösteriliyor. Bağlantı gelince içerik güncellenir.
        </p>
      )}

      {quizHazir && (
        <a className="quiz-serit" href={`#/quiz/${tarih}`}>
          <span className="quiz-serit-metin">
            {quizSonucu ? `Günün soruları: ${quizSonucu.dogru}/3 doğru` : 'Günün üç sorusunu çöz'}
          </span>
          {tarih === bugun() && seri() > 0 && <span className="seri">{seri()} günlük seri</span>}
        </a>
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
        <section className="olaylar" aria-label="Tarihte bugün">
          <div className="sekmeler" role="tablist">
            {TURLER.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tur === t.id}
                className="sekme"
                onClick={() => setTur(t.id)}
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
