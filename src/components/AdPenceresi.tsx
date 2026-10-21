import { Pencere } from './kelime/Pencere'
import { AdFormu } from './AdFormu'
import { adSormayiAtla, adSorulsun, useOyuncu } from '../lib/siralama'

/** Google ile girişten sonra bir kez açılır: sıralamada görünecek adı sorar. Atlanırsa Ayarlar'dan seçilebilir. */
export function AdPenceresi() {
  const oyuncu = useOyuncu()
  if (!adSorulsun(oyuncu)) return null
  return (
    <Pencere baslik="Sıralamada hangi adla görünmek istersin?" sinif="pencere-ad" onKapat={adSormayiAtla}>
      <p>Instagram kullanıcı adını (@ ile) ya da Facebook'taki adını yaz. Bu ad ve haftalık sonuçların sıralamalarda herkese görünür.</p>
      <AdFormu />
      <p className="aciklama kucuk">
        Sıralamaya giren sorularda 30, kelimelerde 90 saniye süren olur. Adını Ayarlar'dan değiştirebilirsin. Başkasına ait bir ad
        kullanma; bildirilen adlar kaldırılır.
      </p>
      <button className="metin-dugme" onClick={adSormayiAtla}>
        Şimdilik sıralamaya girme
      </button>
    </Pencere>
  )
}
