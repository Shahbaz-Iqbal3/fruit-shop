import { createClient } from '@supabase/supabase-js'
export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'x')
export const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL
export const TAGS: Record<string,string> = { fresh: 'Fresh', one_day_old: '1 day old', on_sale: 'On sale' }
