'use client'
import { useEffect, useState } from 'react'
import { sb } from './supabase'
export type Shop = { name: string; logo_url: string | null; color: string; whatsapp: string | null }
export const DEFAULT_SHOP: Shop = { name: 'Fresh Fruit Shop', logo_url: null, color: '#be123c', whatsapp: null }
export const waLink = (n: string | null, text = '') => (n ? `https://wa.me/${n.replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(text)}` : '')
export function useShop() {
  const [shop, setShop] = useState<Shop>(DEFAULT_SHOP)
  useEffect(() => { sb.from('shop_settings').select('*').eq('id', 1).maybeSingle().then(x => { if (x.data) setShop(x.data) }) }, [])
  return [shop, setShop] as const
}
export function ShopTheme() {
  const [shop] = useShop()
  useEffect(() => { document.documentElement.style.setProperty('--brand', shop.color); document.title = shop.name }, [shop])
  return null
}
