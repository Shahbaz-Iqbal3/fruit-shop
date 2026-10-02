'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import { useShop, waLink } from '@/lib/shop'
import CustomerNav from '@/lib/nav'
import { Icon, I } from '@/lib/icons'
const STEPS = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered']
const LBL: Record<string, string> = { placed: 'Order placed', accepted: 'Accepted', preparing: 'Being prepared', out_for_delivery: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' }
const HINT: Record<string, string> = { placed: 'We got your order. Waiting for the shop to accept it.', accepted: 'The shop accepted your order.', preparing: 'Your fruit is being picked and packed.', out_for_delivery: 'Your order is on its way. Keep your phone nearby.', delivered: 'Delivered. Enjoy your fruit!', cancelled: 'The shop cancelled this order. Please contact them.' }
const ago = (d: string) => { const m = Math.round((Date.now() - +new Date(d)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(d).toLocaleDateString() }
export default function Track() {
  const [shop] = useShop()
  const [phone, setPhone] = useState(''), [orders, setOrders] = useState<any[] | null>(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [asked, setAsked] = useState('')
  const run = async (p: string) => {
    if (p.replace(/\D/g, '').length < 10) { setErr('Enter the full phone number used for the order, e.g. 0300 1234567'); return }
    setErr(''); setBusy(true); setAsked(p)
    const { data, error } = await sb.rpc('orders_by_phone', { p_phone: p })
    if (error) setErr('Could not load orders. Please try again.'); else { setOrders(data || []); try { const q = new URL(location.href); q.searchParams.set('phone', p); history.replaceState(null, '', q) } catch {} }
    setBusy(false)
  }
  useEffect(() => { let p = new URLSearchParams(location.search).get('phone') || ''; if (!p) try { p = JSON.parse(localStorage.getItem('cust') || '{}').phone || '' } catch {} if (p) { setPhone(p); run(p) } }, [])
  useEffect(() => { if (!asked) return; const t = setInterval(() => sb.rpc('orders_by_phone', { p_phone: asked }).then(x => x.data && setOrders(x.data)), 10000); return () => clearInterval(t) }, [asked])
  return (<>
    <CustomerNav active="track" />
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-28 pt-6 md:pb-10">
      <div><h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">My orders</h1><p className="text-stone-600">Enter the phone number you ordered with to see your orders and their status.</p></div>
      <form onSubmit={e => { e.preventDefault(); run(phone) }} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <label className="block text-sm font-semibold text-stone-700">Phone number
          <input type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" value={phone} onChange={e => setPhone(e.target.value)} aria-invalid={!!err} className={'mt-1 min-h-12 w-full rounded-xl border bg-white px-3 text-base font-normal ' + (err ? 'border-red-600' : 'border-stone-300')} />
          {err && <span role="alert" className="mt-1 block text-sm font-normal text-red-700">{err}</span>}</label>
        <button disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-lg font-bold text-white disabled:opacity-50"><Icon d={I.search} />{busy ? 'Looking…' : 'Find my orders'}</button>
      </form>
      {orders?.length === 0 && <p className="rounded-3xl bg-white p-8 text-center text-stone-700 ring-1 ring-stone-200">No orders found for this number. Check the number and try again.</p>}
      {orders?.map(o => { const at = STEPS.indexOf(o.status), bad = o.status === 'cancelled'; return (
        <section key={o.id} className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <div className="flex items-center justify-between"><h2 className={'text-lg font-bold ' + (bad ? 'text-stone-700' : o.status === 'delivered' ? 'text-green-800' : 'text-[var(--brand)]')}>{LBL[o.status]}</h2><span className="text-sm text-stone-600">{ago(o.created_at)}</span></div>
          {!bad && <div role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={at + 1} aria-label="Order progress" className="flex gap-1.5">{STEPS.map((s, i) => <span key={s} className={'h-2 flex-1 rounded-full ' + (i <= at ? 'bg-[var(--brand)]' : 'bg-stone-200')} />)}</div>}
          <p className="text-stone-700">{HINT[o.status]}</p>
          <ul className="space-y-1 border-t border-stone-200 pt-3 text-stone-800">{o.items.map((l: any) => <li key={l.id} className="flex justify-between"><span>{l.name} × {l.qty} {l.unit}</span><span>Rs {l.price * l.qty}</span></li>)}</ul>
          <p className="flex justify-between text-lg font-bold"><span>Total · Cash on delivery</span><span>Rs {o.total}</span></p>
          {shop.whatsapp && <a href={waLink(shop.whatsapp, `Hi, about my order of Rs ${o.total}`)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-green-700 font-semibold text-white"><Icon d={I.chat} />Ask {shop.name} on WhatsApp</a>}
        </section>) })}
    </main></>)
}
