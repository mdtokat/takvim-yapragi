// Google hesabıyla giriş (Firebase Authentication) ve kullanıcı verisinin Firestore ile eşitlenmesi.
// Oyun her zaman önce cihazdaki depoya yazar; girişli kullanıcı varsa kayıt ayrıca buluta gider.
// Girişte buluttaki kayıtlar cihazdakilerle birleşir: daha ileri olan (daha çok tahmin/cevap) kalır.
// Firestore düzeni: kullanicilar/{uid}/kelime/{2026-10-19_sabah}, kullanicilar/{uid}/quiz/{2026-10-19}
import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { oku, yaz } from './depo'
import { firebaseAyarli, firebaseYukle, type FirebaseServisleri } from './firebase'
import { yerelUygulama } from './platform'
import { bulutYaziciAyarla, depoDegisti, type KayitTuru } from './senkron'
import { kelimeBirlestir, kelimeDeposunuTemizle, kelimeKayitlari, type KelimeKaydi } from './kelimeDepo'
import { quizBirlestir, quizDeposunuTemizle, quizKayitlari, type QuizKaydi } from './quizDepo'

export interface Hesap {
  uid: string
  ad: string | null
  eposta: string | null
}

/** kapali: Firebase ayarlanmamış (giriş gizlenir). */
export type HesapDurumu = 'kapali' | 'yukleniyor' | 'girissiz' | 'girisli'

interface Durum {
  durum: HesapDurumu
  hesap: Hesap | null
}

export class HesapHatasi extends Error {
  constructor(public kod: 'android' | 'iptal' | 'baglanti' | 'bilinmeyen', mesaj?: string) {
    super(mesaj ?? kod)
  }
}

const GIRISLI = 'hesap-girisli' // bu cihazda girişli kullanıcı var mı: Firebase açılışta yalnızca o zaman yüklenir
const ESITLEME = 'hesap-esitleme' // { [uid]: { sunucu: son çekilen belgenin sunucu zamanı, yerel: son eşitlemenin cihaz saati } }

type EsitlemeIzi = Record<string, { sunucu: number; yerel: number }>

let durum: Durum = {
  durum: !firebaseAyarli ? 'kapali' : oku(GIRISLI, false) ? 'yukleniyor' : 'girissiz',
  hesap: null,
}
const dinleyiciler = new Set<(d: Durum) => void>()
function ayarla(d: Durum) {
  durum = d
  dinleyiciler.forEach((f) => f(durum))
}

/** React dışından hesap değişikliklerini dinler (ör. sıralama modülü); dinlemeyi bırakan fonksiyon döner. */
export function hesapDinle(f: (d: Durum) => void): () => void {
  dinleyiciler.add(f)
  f(durum)
  return () => {
    dinleyiciler.delete(f)
  }
}

export function useHesap(): Durum {
  const [d, setD] = useState(durum)
  useEffect(() => {
    dinleyiciler.add(setD)
    setD(durum)
    return () => {
      dinleyiciler.delete(setD)
    }
  }, [])
  return d
}

const hesapBilgisi = (u: User): Hesap => ({ uid: u.uid, ad: u.displayName, eposta: u.email })

let dinleme: Promise<FirebaseServisleri> | null = null

/** Oturum değişikliklerini dinlemeye başlar; girişte eşitler, çıkışta bulut yazıcısını kapatır. */
function dinlemeyeBasla(): Promise<FirebaseServisleri> {
  if (!dinleme) {
    dinleme = firebaseYukle()
      .then((fb) => {
        fb.authModulu.onAuthStateChanged(fb.auth, (u) => {
          if (u) {
            yaz(GIRISLI, true)
            ayarla({ durum: 'girisli', hesap: hesapBilgisi(u) })
            bulutYaziciAyarla((tur, anahtar, kayit) => void bulutaYaz(fb, u.uid, tur, anahtar, kayit))
            void esitle(fb, u.uid)
          } else {
            yaz(GIRISLI, false)
            bulutYaziciAyarla(null)
            ayarla({ durum: 'girissiz', hesap: null })
          }
        })
        return fb
      })
      .catch((e) => {
        dinleme = null
        // Çevrimdışı açılış: oyun cihazdaki depoyla sürer, eşitleme sonraki açılışta yapılır.
        ayarla({ durum: 'girissiz', hesap: null })
        throw e
      })
  }
  return dinleme
}

/** Girişli kullanıcının Firebase oturum anahtarı (sıralama istekleri için); girişsizse null. */
export async function kimlikAnahtari(): Promise<string | null> {
  if (durum.durum !== 'girisli' || !dinleme) return null
  const fb = await dinleme
  return (await fb.auth.currentUser?.getIdToken()) ?? null
}

/** Uygulama açılışında çağrılır. Bu cihazda daha önce giriş yapılmadıysa Firebase hiç yüklenmez. */
export function hesabiBaslat() {
  if (firebaseAyarli && oku(GIRISLI, false)) void dinlemeyeBasla().catch(() => undefined)
}

/** Firestore `undefined` kabul etmez (ör. seyrek quiz cevap dizisi); kayıt cihazdaki JSON biçimine indirgenir. */
const duzKayit = (kayit: unknown) => JSON.parse(JSON.stringify(kayit)) as Record<string, unknown>

async function bulutaYaz(fb: FirebaseServisleri, uid: string, tur: KayitTuru, anahtar: string, kayit: unknown) {
  const { doc, setDoc, serverTimestamp } = fb.dbModulu
  try {
    await setDoc(doc(fb.db, 'kullanicilar', uid, tur, anahtar), { ...duzKayit(kayit), sunucuZamani: serverTimestamp() })
  } catch (e) {
    // Yazılamayan kayıt cihazda kalır; bir sonraki eşitlemede yeniden gönderilir.
    console.warn('Kayıt buluta yazılamadı', e)
  }
}

let esitleniyor = false

/**
 * Son eşitlemeden beri buluta yazılmış kayıtları çeker ve cihazdakilerle birleştirir; ardından cihazda
 * son eşitlemeden beri değişmiş ve buluttakinden ileri olan kayıtları buluta yazar.
 */
async function esitle(fb: FirebaseServisleri, uid: string) {
  if (esitleniyor) return
  esitleniyor = true
  const { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, Timestamp } = fb.dbModulu
  const iz = oku<EsitlemeIzi>(ESITLEME, {})
  const onceki = iz[uid] ?? { sunucu: 0, yerel: 0 }
  const baslangic = Date.now()
  try {
    let enYeniSunucu = onceki.sunucu
    const cek = async <T,>(tur: KayitTuru) => {
      const sonuc: Record<string, T> = {}
      const q = query(collection(fb.db, 'kullanicilar', uid, tur), where('sunucuZamani', '>', Timestamp.fromMillis(onceki.sunucu)))
      for (const belge of (await getDocs(q)).docs) {
        const { sunucuZamani, ...veri } = belge.data()
        if (sunucuZamani instanceof Timestamp) enYeniSunucu = Math.max(enYeniSunucu, sunucuZamani.toMillis())
        sonuc[belge.id] = veri as T
      }
      return sonuc
    }
    const [bulutKelime, bulutQuiz] = await Promise.all([cek<KelimeKaydi>('kelime'), cek<QuizKaydi>('quiz')])
    const ileriKelime = kelimeBirlestir(bulutKelime)
    const ileriQuiz = quizBirlestir(bulutQuiz)
    depoDegisti()

    // Cihazda son eşitlemeden beri değişmiş ve buluttakinden ileri olan kayıtlar gönderilir
    // (zamanı olmayan eski quiz kayıtları ilk eşitlemede gider).
    const kelimeler = kelimeKayitlari()
    const quizler = quizKayitlari()
    const gonderilecek: [KayitTuru, string, unknown][] = [
      ...ileriKelime.filter((a) => kelimeler[a].guncelleme > onceki.yerel).map((a): [KayitTuru, string, unknown] => ['kelime', a, kelimeler[a]]),
      ...ileriQuiz.filter((t) => (quizler[t].guncelleme ?? 1) > onceki.yerel).map((t): [KayitTuru, string, unknown] => ['quiz', t, quizler[t]]),
    ]
    for (let i = 0; i < gonderilecek.length; i += 400) {
      const batch = writeBatch(fb.db)
      for (const [tur, anahtar, kayit] of gonderilecek.slice(i, i + 400))
        batch.set(doc(fb.db, 'kullanicilar', uid, tur, anahtar), { ...duzKayit(kayit), sunucuZamani: serverTimestamp() })
      await batch.commit()
    }
    yaz(ESITLEME, { ...oku<EsitlemeIzi>(ESITLEME, {}), [uid]: { sunucu: enYeniSunucu, yerel: baslangic } })
  } catch (e) {
    console.warn('Hesap eşitlenemedi', e)
  } finally {
    esitleniyor = false
  }
}

/** Google hesabıyla giriş. Webde açılır pencere, engellenirse sayfa yönlendirmesi kullanılır. */
export async function googleIleGiris(): Promise<void> {
  // Android'de Google girişi yerel eklenti ister (google-services.json gelince eklenecek).
  if (yerelUygulama()) throw new HesapHatasi('android')
  let fb: FirebaseServisleri
  try {
    fb = await dinlemeyeBasla()
  } catch {
    throw new HesapHatasi('baglanti')
  }
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = fb.authModulu
  const saglayici = new GoogleAuthProvider()
  saglayici.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(fb.auth, saglayici)
  } catch (e) {
    const kod = (e as { code?: string }).code ?? ''
    if (kod === 'auth/popup-blocked') {
      // Yönlendirmeden dönünce Firebase'in açılışta yüklenip girişi tamamlaması için.
      yaz(GIRISLI, true)
      return signInWithRedirect(fb.auth, saglayici)
    }
    if (kod === 'auth/popup-closed-by-user' || kod === 'auth/cancelled-popup-request') throw new HesapHatasi('iptal')
    if (kod === 'auth/network-request-failed') throw new HesapHatasi('baglanti')
    throw new HesapHatasi('bilinmeyen', kod)
  }
}

/** Çıkışta cihazdaki oyun ve quiz kayıtları silinir (hesapta kalırlar); oyun girişsiz devam eder. */
export async function cikisYap(): Promise<void> {
  const fb = await dinlemeyeBasla()
  // Bekleyen yazılar bitsin; bağlantı yoksa en fazla 3 saniye beklenir.
  await Promise.race([fb.dbModulu.waitForPendingWrites(fb.db), new Promise((r) => setTimeout(r, 3000))])
  await fb.authModulu.signOut(fb.auth)
  kelimeDeposunuTemizle()
  quizDeposunuTemizle()
  depoDegisti()
}

/** Hesabı ve buluttaki bütün verisini siler (Google Play hesap silme şartı). */
export async function hesabiSil(): Promise<void> {
  const fb = await dinlemeyeBasla()
  const kullanici = fb.auth.currentUser
  if (!kullanici) return
  const { collection, getDocs, writeBatch } = fb.dbModulu
  for (const tur of ['kelime', 'quiz'] as const) {
    const belgeler = (await getDocs(collection(fb.db, 'kullanicilar', kullanici.uid, tur))).docs
    for (let i = 0; i < belgeler.length; i += 400) {
      const batch = writeBatch(fb.db)
      belgeler.slice(i, i + 400).forEach((b) => batch.delete(b.ref))
      await batch.commit()
    }
  }
  const { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } = fb.authModulu
  try {
    await deleteUser(kullanici)
  } catch (e) {
    // Firebase, hesap silmeden önce yakın zamanda giriş yapılmış olmasını ister.
    if ((e as { code?: string }).code !== 'auth/requires-recent-login') throw e
    await reauthenticateWithPopup(kullanici, new GoogleAuthProvider())
    await deleteUser(kullanici)
  }
  const iz = oku<EsitlemeIzi>(ESITLEME, {})
  delete iz[kullanici.uid]
  yaz(ESITLEME, iz)
  kelimeDeposunuTemizle()
  quizDeposunuTemizle()
  depoDegisti()
}
