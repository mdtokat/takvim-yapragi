import { createClient } from '@supabase/supabase-js'

// Publishable (anon) anahtarın istemcide bulunması normaldir; erişim RLS ve RPC fonksiyonlarıyla sınırlıdır.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://qjiurxkgzzlqqemkzgli.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zukXoYnYRUe77jomho-1Uw_NpZ6X6Wt'

// Anonim oturum yalnızca kelime oyunu açılınca kurulur. Saklama anahtarı Harfiyen'le aynı kalır;
// böylece aynı adreste oynamış web oyuncularının istatistikleri korunur.
export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'harfiyen-oturum' },
})
