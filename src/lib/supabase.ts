import { createClient } from '@supabase/supabase-js'

// Publishable (anon) anahtarın istemcide bulunması normaldir; erişim RLS ile sınırlıdır.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://qjiurxkgzzlqqemkzgli.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zukXoYnYRUe77jomho-1Uw_NpZ6X6Wt'

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
