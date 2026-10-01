'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { sb, configured, TAGS } from '@/lib/supabase'
import { useShop, waLink } from '@/lib/shop'
import { Icon, I } from '@/lib/icons'
const TAG_STYLE: Record<string, string> = { on_sale: 'bg-rose-700 text-white', fresh: 'bg-green-700 text-white', one_day_old: 'bg-amber-600 text-white' }
export default function Shop() {
  const r = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const [shop, , loaded] = useShop(slug)
  const [items, setItems] = useState<any[] | null>(null), [cart, setCart] = useState<Record<string, number>>({}), [open, setOpen] = useState(false), [filter, setFilter] = useState('all')
  const [f, setF] = useState({ name: '', phone: '', address: '', note: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  useEffect(() => { try { const c = localStorage.getItem('cust'); if (c) setF(JSON.parse(c)) } catch {} }, [])
  useEffect(() => { if (!configured) { r.replace('/setup'); return } if (!shop.id) return; sb.from('items').select('*').eq('shop_id', shop.id).eq('available', true).order('created_at', { ascending: false }).then(x => setItems(x.data || [])) }, [r, shop.id])
  const price = (i: any) => (i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price)
  const shown = (items || []).filter(i => filter === 'all' || i.tag === filter)
  const lines = (items || []).filter(i => cart[i.id]).map(i => ({ id: i.id, name: i.name, unit: i.unit, price: price(i), qty: cart[i.id] }))
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0), count = lines.reduce((s, l) => s + l.qty, 0)
  const add = (id: string, d: number) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }))
  const place = async () => {
    setBusy(true); setErr('')
    const { data, error } = await sb.rpc('place_order', { p_shop_id: shop.id, p_name: f.name, p_phone: f.phone, p_address: f.address, p_note: f.note, p_items: lines, p_total: total })
    if (data) { try { localStorage.setItem('cust', JSON.stringify({ ...f, note: '' })) } catch {} r.push(`/s/${slug}/order/${data}`) } else { setErr(error?.message || 'Could not place the order. Please try again.'); setBusy(false) }
  }
  const step = (id: string) => (
    <div className="flex items-center justify-between gap-2">
      <button aria-label="Remove one" onClick={() => add(id, -1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-800"><Icon d={I.minus} /></button>
      <span className="min-w-6 text-center text-lg font-semibold" aria-live="polite">{cart[id]}</span>
      <button aria-label="Add one more" onClick={() => add(id, 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-white"><Icon d={I.plus} /></button>
    </div>)
  const field = (k: keyof typeof f, label: string, extra: object = {}) => (
    <label className="block text-sm font-medium text-stone-700">{label}
      <input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base" {...extra} /></label>)
  if (loaded && !shop.id) return <p className="p-8 text-center text-stone-700">Shop not found.</p>
  if (shop.status === 'suspended') return <p className="p-8 text-center text-stone-700">{shop.name} is temporarily closed.</p>
  return (
    <div className="mx-auto w-full max-w-4xl pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
        {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-lg font-bold text-white">{shop.name[0]}</span>}
        <h1 className="flex-1 truncate text-xl font-bold">{shop.name}</h1>
        {shop.whatsapp && <a href={waLink(shop.whatsapp, 'Hi, I have a question')} aria-label="Chat on WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-full bg-green-700 text-white"><Icon d={I.chat} /></a>}
      </header>
      <main className="space-y-4 px-4 pt-5">
        <div><h2 className="text-2xl font-bold">Fresh picks today</h2><p className="text-stone-600">Order now, pay cash on delivery.</p></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
          {[['all', 'All'], ['fresh', 'Fresh'], ['on_sale', 'On sale'], ['one_day_old', '1 day old']].map(([k, l]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} className={'min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ' + (filter === k ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-800 ring-stone-300')}>{l}</button>)}
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items === null && [0, 1, 2, 3, 4, 5].map(n => <li key={n} className="h-64 animate-pulse rounded-2xl bg-stone-200" />)}
          {shown.map(i => (
            <li key={i.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
              <a href={`/s/${slug}/item/${i.id}`} className="relative block aspect-[4/3] bg-stone-100">
                {i.image_url && <img src={i.image_url} alt={i.name} loading="lazy" className="h-full w-full object-cover" />}
                <span className={'absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold ' + TAG_STYLE[i.tag]}>{TAGS[i.tag]}</span>
              </a>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div><p className="font-semibold leading-tight">{i.name}</p>{i.name_ur && <p dir="rtl" className="text-sm text-stone-600">{i.name_ur}</p>}</div>
                <p className="mt-auto"><span className="text-lg font-bold">Rs {price(i)}</span> <span className="text-sm text-stone-600">/ {i.unit}</span>{i.tag === 'on_sale' && i.sale_price && <s className="ml-1 text-sm text-stone-500">{i.price}</s>}</p>
                {cart[i.id] ? step(i.id) : <button onClick={() => add(i.id, 1)} className="min-h-11 rounded-xl bg-[var(--brand)] font-semibold text-white">Add</button>}
              </div>
            </li>))}
        </ul>
        {items && shown.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-stone-600 ring-1 ring-stone-200">Nothing here right now. Check back soon.</p>}
      </main>
      {count > 0 && <div className="fixed inset-x-0 bottom-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><button onClick={() => setOpen(true)} className="mx-auto flex min-h-14 w-full max-w-4xl items-center gap-3 rounded-2xl bg-[var(--brand)] px-4 text-white shadow-lg"><Icon d={I.cart} /><span className="flex-1 text-left font-semibold">View order · {count} {count === 1 ? 'item' : 'items'}</span><span className="text-lg font-bold">Rs {total}</span></button></div>}
      {open && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/50" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Your order" onClick={e => e.stopPropagation()} style={{ animation: 'sheet 250ms ease-out' }} className="mx-auto max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Your order</h2><button aria-label="Close" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"><Icon d={I.x} /></button></div>
            <ul className="divide-y divide-stone-200">{lines.map(l => <li key={l.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{l.name}</p><p className="text-sm text-stone-600">Rs {l.price} / {l.unit}</p></div><div className="w-36">{step(l.id)}</div></li>)}</ul>
            {field('name', 'Your name', { autoComplete: 'name' })}{field('phone', 'Phone number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}{field('address', 'Delivery address', { autoComplete: 'street-address' })}{field('note', 'Note for the shop (optional)')}
            {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
            <button onClick={place} disabled={busy || !f.name || !f.phone || !f.address} className="min-h-14 w-full rounded-2xl bg-[var(--brand)] text-lg font-bold text-white disabled:opacity-40">{busy ? 'Placing order…' : `Place order · Rs ${total}`}</button>
            <p className="text-center text-sm text-stone-600">Cash on delivery</p>
          </div>
        </div>)}
    </div>)
}
