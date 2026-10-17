import { ayarlariOku } from './ayarlar'

// Ses efektleri Web Audio ile anında üretilir; ses dosyası indirilmez.
// Tarayıcılar sesi ancak bir kullanıcı eyleminden sonra açtığı için bağlam ilk çalmada kurulur.

export type SesTuru = 'yirt' | 'geriAl' | 'tik' | 'dogru' | 'yanlis' | 'tamam'

let baglam: AudioContext | null = null
let gurultu: AudioBuffer | null = null

function hazirla(): AudioContext | null {
  try {
    if (!baglam) {
      const Kurucu = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Kurucu) return null
      baglam = new Kurucu()
    }
    if (baglam.state === 'suspended') void baglam.resume()
    return baglam
  } catch {
    return null
  }
}

function gurultuTamponu(b: AudioContext): AudioBuffer {
  if (gurultu) return gurultu
  const uzunluk = Math.floor(b.sampleRate * 0.6)
  gurultu = b.createBuffer(1, uzunluk, b.sampleRate)
  const veri = gurultu.getChannelData(0)
  for (let i = 0; i < uzunluk; i++) veri[i] = Math.random() * 2 - 1
  return gurultu
}

/** Kağıt sesi: süzülmüş gürültü, hızlı titreşen bir zarfla (yırtılma çıtırtısı). */
function kagit(b: AudioContext, sure: number, frekans: number, citirti: number, ses: number) {
  const t = b.currentTime
  const kaynak = b.createBufferSource()
  kaynak.buffer = gurultuTamponu(b)
  const suzgec = b.createBiquadFilter()
  suzgec.type = 'bandpass'
  suzgec.frequency.setValueAtTime(frekans, t)
  suzgec.frequency.exponentialRampToValueAtTime(frekans * 0.45, t + sure)
  suzgec.Q.value = 0.9
  const kazanc = b.createGain()
  kazanc.gain.setValueAtTime(0.0001, t)
  // Lifler tek tek koparken ses düzensiz dalgalanır.
  const adim = sure / citirti
  for (let i = 0; i < citirti; i++) {
    const tepe = ses * (0.45 + Math.random() * 0.55) * (1 - i / (citirti * 1.4))
    kazanc.gain.linearRampToValueAtTime(tepe, t + i * adim + adim * 0.3)
    kazanc.gain.linearRampToValueAtTime(tepe * 0.25, t + (i + 1) * adim)
  }
  kazanc.gain.exponentialRampToValueAtTime(0.0001, t + sure + 0.05)
  kaynak.connect(suzgec).connect(kazanc).connect(b.destination)
  kaynak.start(t)
  kaynak.stop(t + sure + 0.1)
}

function nota(b: AudioContext, frekans: number, baslangic: number, sure: number, ses: number, dalga: OscillatorType = 'sine') {
  const t = b.currentTime + baslangic
  const osc = b.createOscillator()
  osc.type = dalga
  osc.frequency.setValueAtTime(frekans, t)
  const kazanc = b.createGain()
  kazanc.gain.setValueAtTime(0.0001, t)
  kazanc.gain.exponentialRampToValueAtTime(ses, t + 0.012)
  kazanc.gain.exponentialRampToValueAtTime(0.0001, t + sure)
  osc.connect(kazanc).connect(b.destination)
  osc.start(t)
  osc.stop(t + sure + 0.02)
}

export function sesCal(tur: SesTuru) {
  if (!ayarlariOku().ses) return
  const b = hazirla()
  if (!b) return
  try {
    switch (tur) {
      case 'yirt':
        kagit(b, 0.32, 3200, 9, 0.5)
        break
      case 'geriAl':
        kagit(b, 0.18, 1800, 3, 0.3)
        nota(b, 180, 0.16, 0.08, 0.12, 'triangle')
        break
      case 'tik':
        nota(b, 1250, 0, 0.045, 0.08, 'triangle')
        break
      case 'dogru':
        nota(b, 659.25, 0, 0.18, 0.16)
        nota(b, 987.77, 0.09, 0.32, 0.16)
        break
      case 'yanlis':
        nota(b, 220, 0, 0.14, 0.14, 'triangle')
        nota(b, 174.61, 0.11, 0.24, 0.14, 'triangle')
        break
      case 'tamam':
        ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(b, f, i * 0.09, 0.35, 0.13))
        break
    }
  } catch {
    /* ses çalınamadı: uygulama sessiz devam eder */
  }
}
