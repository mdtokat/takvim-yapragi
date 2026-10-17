import { Pencere } from './Pencere'
import type { Durum } from '../../lib/harfler'

function Ornek({ kelime, vurgu, durum }: { kelime: string; vurgu: number; durum: Durum }) {
  return (
    <div className="ornek-satir" aria-hidden="true">
      {[...kelime].map((h, i) => (
        <span key={i} className={`karo karo-kucuk${i === vurgu ? ` karo-${durum}` : ' karo-dolu'}`}>
          {h}
        </span>
      ))}
    </div>
  )
}

export function YardimPenceresi({ onKapat }: { onKapat: () => void }) {
  return (
    <Pencere baslik="Nasıl oynanır" onKapat={onKapat}>
      <p>Günün kelimesini 6 denemede bul. Her tahmin, sözlükte bulunan 5 harfli bir Türkçe kelime olmalı.</p>
      <p>Her tahminden sonra karoların rengi, harfin kelimedeki yerini gösterir.</p>
      <Ornek kelime="KALEM" vurgu={0} durum="yesil" />
      <p className="ornek-metin">K kelimede var ve doğru yerde.</p>
      <Ornek kelime="SEHPA" vurgu={2} durum="sari" />
      <p className="ornek-metin">H kelimede var ama başka bir yerde.</p>
      <Ornek kelime="ÇİÇEK" vurgu={4} durum="gri" />
      <p className="ornek-metin">K kelimede yok.</p>
      <p>Aynı harf kelimede kaç kez geçiyorsa en fazla o kadar karo renklenir. Sözlükte olmayan tahminler hak harcatmaz.</p>
      <p>Her gece Türkiye saatiyle 00:00'da yeni kelime gelir. Kelimeyi bulduğunda anlamını ve örnek bir cümleyi görürsün.</p>
      <p>Kelime çoğu gün o günün videolarından birinde geçer. Hangi videoda geçtiği tahtanın üstünde ipucu olarak yazar.</p>
    </Pencere>
  )
}
