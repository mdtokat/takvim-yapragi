// localStorage erişimi bazı ortamlarda hata verebilir; her çağrı korunur.
export function oku<T>(anahtar: string, varsayilan: T): T {
  try {
    const ham = localStorage.getItem(anahtar)
    return ham === null ? varsayilan : (JSON.parse(ham) as T)
  } catch {
    return varsayilan
  }
}

export function yaz(anahtar: string, deger: unknown): void {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger))
  } catch {
    /* depolama dolu veya kapalı: sessizce geç */
  }
}
