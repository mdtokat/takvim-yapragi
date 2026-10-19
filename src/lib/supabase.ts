import { createClient } from '@supabase/supabase-js'

// Publishable (anon) anahtarın istemcide bulunması normaldir; erişim RLS ve RPC fonksiyonlarıyla sınırlıdır.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qjiurxkgzzlqqemkzgli.supabase.co'
export const SUPABASE_ANAHTARI = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zukXoYnYRUe77jomho-1Uw_NpZ6X6Wt'

// Supabase yalnızca içerik içindir ve kullanıcıyı tanımaz; hesaplar Firebase'dedir (src/lib/hesap.ts).
// Bu yüzden oturum açılmaz ve saklanmaz; her istek publishable anahtarla gider.
// Sıralama istekleri Firebase oturum anahtarıyla ayrı bir istemciden gider (src/lib/siralama.ts).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANAHTARI, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
