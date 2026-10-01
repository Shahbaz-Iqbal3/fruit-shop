'use client'
import { useEffect, useState } from 'react'
import { sb } from './supabase'
export type Shop = { id: string; slug: string; name: string; logo_url: string | null; color: string; whatsapp: string | null; status: string }
export const DEFAULT_SHOP: Shop = { id: '', slug: '', name: 'Shop', logo_url: null, color: '#be123c', whatsapp: null, status: 'active' }
export const waLink = (n: string | null, text = '') => (n ? `https://wa.me/${n.replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(text)}` : '')
export function useShop(slug?: string) {
  const [shop, setShop] = useState<Shop>(DEFAULT_SHOP), [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!slug) return
    sb.from('shops').select('*').eq('slug', slug).maybeSingle().then(x => { if (x.data) { setShop(x.data); document.documentElement.style.setProperty('--brand', x.data.color); document.title = x.data.name } setLoaded(true) })
  }, [slug])
  return [shop, setShop, loaded] as const
}
export const ShopTheme = () => null
