// Firebase yalnızca kullanıcı hesabı ve kullanıcı verisi içindir; içerik Supabase'dedir.
// Web yapılandırma değerleri gizli değildir (Supabase publishable anahtarı gibi); erişimi Firestore
// güvenlik kuralları sınırlar. Değerler verilmezse giriş özelliği gizlenir, oyun girişsiz çalışır.
import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

const yapilandirma = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const firebaseAyarli = !!(yapilandirma.apiKey && yapilandirma.authDomain && yapilandirma.projectId && yapilandirma.appId)

export interface FirebaseServisleri {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  authModulu: typeof import('firebase/auth')
  dbModulu: typeof import('firebase/firestore')
}

let yukleme: Promise<FirebaseServisleri> | null = null

/** Firebase kütüphanesi yalnızca gerekince (girişli kullanıcı veya giriş isteği) yüklenir. */
export function firebaseYukle(): Promise<FirebaseServisleri> {
  if (!firebaseAyarli) return Promise.reject(new Error('firebase_ayarli_degil'))
  if (!yukleme) {
    yukleme = Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])
      .then(([appModulu, authModulu, dbModulu]) => {
        const app = appModulu.initializeApp(yapilandirma)
        const auth = authModulu.getAuth(app)
        auth.languageCode = 'tr'
        return { app, auth, db: dbModulu.getFirestore(app), authModulu, dbModulu }
      })
      .catch((e) => {
        yukleme = null
        throw e
      })
  }
  return yukleme
}
