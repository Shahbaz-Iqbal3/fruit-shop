'use client'
import { useEffect, useState, use } from 'react'
import { sb } from '@/lib/supabase'
import { useShop, waLink } from '@/lib/shop'
const STEPS = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered']
const LABEL: Record<string, string> = { placed: 'Order placed', accepted: 'Accepted', preparing: 'Being prepared', out_for_delivery: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' }
export default function Track({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [o, setO] = useState<any>(null)
  const [shop] = useShop()
  useEffect(() => { const load = () => sb.rpc('get_order', { p_id: id }).then(x => setO(x.data?.[0])); load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [id])
  if (!o) return <p className="p-6">Loading…</p>
  const at = STEPS.indexOf(o.status)
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">{LABEL[o.status]}</h1>
      {o.status === 'cancelled' ? <p className="text-[var(--brand)]">The shop cancelled this order. Please call them.</p> :
        <ol className="space-y-3">{STEPS.map((s, i) => <li key={s} className={'flex items-center gap-3 ' + (i <= at ? 'text-stone-900' : 'text-stone-400')}><span className={'h-4 w-4 rounded-full ' + (i <= at ? 'bg-[var(--brand)]' : 'bg-stone-300')} />{LABEL[s]}</li>)}</ol>}
      <p className="text-stone-600">Total Rs {o.total} · Cash on delivery</p>
      {shop.whatsapp && <a href={waLink(shop.whatsapp, `Hi, about my order ${id.slice(0, 8)}`)} className="block rounded-xl bg-green-600 py-3 text-center font-semibold text-white">Message {shop.name} on WhatsApp</a>}
    </main>)
}
