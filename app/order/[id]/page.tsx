'use client'
import { useEffect, useState, use } from 'react'
import { sb } from '@/lib/supabase'
import { useShop, waLink } from '@/lib/shop'
import { Icon, I } from '@/lib/icons'
const STEPS = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered']
const LABEL: Record<string, string> = { placed: 'Order placed', accepted: 'Accepted', preparing: 'Being prepared', out_for_delivery: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' }
export default function Track({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [o, setO] = useState<any>(null)
  const [shop] = useShop()
  useEffect(() => { const load = () => sb.rpc('get_order', { p_id: id }).then(x => setO(x.data?.[0])); load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [id])
  if (!o) return <div className="mx-auto w-full max-w-md space-y-3 p-4"><div className="h-24 animate-pulse rounded-2xl bg-stone-200" /><div className="h-64 animate-pulse rounded-2xl bg-stone-200" /></div>
  const at = STEPS.indexOf(o.status), done = o.status === 'delivered', bad = o.status === 'cancelled'
  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4">
      <section aria-live="polite" className={'rounded-2xl p-5 text-white ' + (bad ? 'bg-stone-700' : done ? 'bg-green-700' : 'bg-[var(--brand)]')}>
        <p className="text-sm opacity-90">{shop.name} · Order {id.slice(0, 8)}</p>
        <h1 className="text-2xl font-bold">{LABEL[o.status]}</h1>
        {bad && <p className="mt-1 text-sm">The shop cancelled this order. Please contact them.</p>}
      </section>
      {!bad && <ol className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">{STEPS.map((s, i) => (
        <li key={s} className="flex gap-4">
          <div className="flex flex-col items-center"><span className={'flex h-8 w-8 items-center justify-center rounded-full ' + (i <= at ? 'bg-[var(--brand)] text-white' : 'bg-stone-200 text-stone-500')}>{i <= at ? <Icon d={I.check} className="h-4 w-4" /> : i + 1}</span>{i < STEPS.length - 1 && <span className={'h-8 w-0.5 ' + (i < at ? 'bg-[var(--brand)]' : 'bg-stone-200')} />}</div>
          <p className={'pt-1 font-medium ' + (i <= at ? 'text-stone-900' : 'text-stone-600')}>{LABEL[s]}{i === at && !done && <span className="ml-2 text-sm font-normal text-stone-600">Current</span>}</p>
        </li>))}</ol>}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <h2 className="mb-2 font-bold">Your items</h2>
        <ul className="space-y-1 text-stone-700">{o.items.map((l: any) => <li key={l.id} className="flex justify-between"><span>{l.name} × {l.qty} {l.unit}</span><span>Rs {l.price * l.qty}</span></li>)}</ul>
        <p className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-lg font-bold"><span>Total · Cash on delivery</span><span>Rs {o.total}</span></p>
      </section>
      {shop.whatsapp && <a href={waLink(shop.whatsapp, `Hi, about my order ${id.slice(0, 8)}`)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-green-700 font-semibold text-white"><Icon d={I.chat} />Message {shop.name} on WhatsApp</a>}
    </main>)
}
