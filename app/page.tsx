'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sb, configured, TAGS } from '@/lib/supabase'
import { useShop, waLink } from '@/lib/shop'
import { Icon, I } from '@/lib/icons'
const TAG_STYLE: Record<string, string> = { on_sale: 'bg-rose-700 text-white', fresh: 'bg-green-700 text-white', one_day_old: 'bg-amber-600 text-white' }
const disp = 'font-[family-name:var(--font-display)]'
export default function Shop() {
  const r = useRouter()
  const [shop] = useShop()
  const [items, setItems] = useState<any[] | null>(null), [cart, setCart] = useState<Record<string, number>>({}), [open, setOpen] = useState(false), [filter, setFilter] = useState('all'), [q, setQ] = useState('')
  const [f, setF] = useState({ name: '', phone: '', address: '', note: '' }), [known, setKnown] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  useEffect(() => { try { const c = localStorage.getItem('cust'); if (c) { setF(JSON.parse(c)); setKnown(true) } } catch {} }, [])
  useEffect(() => { if (!configured) { r.replace('/setup'); return } sb.from('items').select('*').eq('available', true).order('created_at', { ascending: false }).then(x => setItems(x.data || [])) }, [r])
  const price = (i: any) => (i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price)
  const shown = (items || []).filter(i => (filter === 'all' || i.tag === filter) && (i.name + (i.name_ur || '')).toLowerCase().includes(q.toLowerCase()))
  const lines = (items || []).filter(i => cart[i.id]).map(i => ({ id: i.id, name: i.name, unit: i.unit, price: price(i), qty: cart[i.id] }))
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0), count = lines.reduce((s, l) => s + l.qty, 0)
  const add = (id: string, d: number) => { navigator.vibrate?.(10); setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) })) }
  const place = async () => {
    setBusy(true); setErr('')
    const { data, error } = await sb.rpc('place_order', { p_name: f.name, p_phone: f.phone, p_address: f.address, p_note: f.note, p_items: lines, p_total: total })
    if (data) { try { localStorage.setItem('cust', JSON.stringify({ ...f, note: '' })) } catch {} r.push('/order/' + data) } else { setErr(error?.message || 'Could not place the order. Please try again.'); setBusy(false) }
  }
  const step = (id: string) => (
    <div className="flex items-center justify-between gap-2 rounded-full bg-stone-100 p-1">
      <button aria-label="Remove one" onClick={() => add(id, -1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"><Icon d={I.minus} /></button>
      <span className="min-w-6 text-center text-lg font-bold" aria-live="polite">{cart[id]}</span>
      <button aria-label="Add one more" onClick={() => add(id, 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-sm"><Icon d={I.plus} /></button>
    </div>)
  const field = (k: keyof typeof f, label: string, extra: object = {}) => (
    <label className="block text-sm font-semibold text-stone-700">{label}
      <input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} className="mt-1 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base font-normal" {...extra} /></label>)
  return (
    <div className="mx-auto w-full max-w-4xl pb-32">
      <section className="px-5 pb-10 pt-8 text-white sm:rounded-b-3xl" style={{ background: 'linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, black))' }}>
        <div className="flex items-center gap-4">
          {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/60" /> : <span className={disp + ' flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold'}>{shop.name[0]}</span>}
          <div className="min-w-0 flex-1"><p className="text-sm text-white/85">Fresh fruit, delivered to you</p><h1 className={disp + ' truncate text-3xl font-bold leading-tight'}>{shop.name}</h1></div>
          {shop.whatsapp && <a href={waLink(shop.whatsapp, 'Hi, I have a question')} aria-label="Chat on WhatsApp" className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--brand)] shadow"><Icon d={I.chat} /></a>}
        </div>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm font-medium">{['Cash on delivery', 'Live order tracking', 'Picked fresh daily'].map(t => <li key={t} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><Icon d={I.check} className="h-4 w-4" />{t}</li>)}</ul>
      </section>
      <div className="sticky top-0 z-10 space-y-3 bg-[#fbf8f3]/95 px-4 py-3 backdrop-blur">
        <label className="relative block"><span className="sr-only">Search fruit</span><Icon d={I.search} className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-stone-500" /><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search fruit" className="min-h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-3 text-base shadow-sm" /></label>
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filter">{[['all', 'All'], ['fresh', 'Fresh'], ['on_sale', 'On sale'], ['one_day_old', '1 day old']].map(([k, l]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} className={'min-h-11 shrink-0 rounded-full px-5 text-sm font-semibold ring-1 ' + (filter === k ? 'bg-[var(--brand)] text-white ring-[var(--brand)]' : 'bg-white text-stone-800 ring-stone-300')}>{l}</button>)}</div>
      </div>
      <main className="px-4 pt-2">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items === null && [0, 1, 2, 3, 4, 5].map(n => <li key={n} className="h-72 animate-pulse rounded-3xl bg-stone-200" />)}
          {shown.map(i => (
            <li key={i.id} className={'flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ' + (cart[i.id] ? 'ring-2 ring-[var(--brand)]' : 'ring-1 ring-stone-200')}>
              <div className="relative aspect-square bg-stone-100">
                <a href={'/item/' + i.id} aria-label={'Details of ' + i.name}>{i.image_url && <img src={i.image_url} alt={i.name} loading="lazy" className="h-full w-full object-cover" />}</a>
                <span className={'absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-xs font-bold ' + TAG_STYLE[i.tag]}>{i.tag === 'on_sale' && i.sale_price ? `${Math.round((1 - i.sale_price / i.price) * 100)}% off` : TAGS[i.tag]}</span>
                {!cart[i.id] && <button aria-label={'Add ' + i.name} onClick={() => add(i.id, 1)} className="absolute bottom-2.5 right-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg"><Icon d={I.plus} className="h-6 w-6" /></button>}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <div><p className={disp + ' text-lg font-semibold leading-tight'}>{i.name}</p>{i.name_ur && <p dir="rtl" className="text-sm text-stone-600">{i.name_ur}</p>}</div>
                <p className="mt-auto"><span className="text-xl font-bold">Rs {price(i)}</span> <span className="text-sm text-stone-600">/ {i.unit}</span>{i.tag === 'on_sale' && i.sale_price && <s className="ml-1.5 text-sm text-stone-500">{i.price}</s>}</p>
                {cart[i.id] ? step(i.id) : null}
              </div>
            </li>))}
        </ul>
        {items && shown.length === 0 && <p className="rounded-3xl bg-white p-10 text-center text-stone-600 ring-1 ring-stone-200">No fruit matches. Try another search or filter.</p>}
      </main>
      {count > 0 && <div className="fixed inset-x-0 bottom-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><button onClick={() => setOpen(true)} className="mx-auto flex min-h-16 w-full max-w-4xl items-center gap-3 rounded-3xl bg-stone-900 px-5 text-white shadow-2xl"><span className="relative"><Icon d={I.cart} className="h-6 w-6" /><span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-xs font-bold">{count}</span></span><span className="flex-1 text-left font-semibold">View your order</span><span className="text-lg font-bold">Rs {total}</span></button></div>}
      {open && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/50" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Your order" onClick={e => e.stopPropagation()} style={{ animation: 'sheet 250ms ease-out' }} className="mx-auto max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between"><h2 className={disp + ' text-2xl font-bold'}>Your order</h2><button aria-label="Close" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"><Icon d={I.x} /></button></div>
            <ul className="divide-y divide-stone-200">{lines.map(l => <li key={l.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-semibold">{l.name}</p><p className="text-sm text-stone-600">Rs {l.price * l.qty}</p></div><div className="w-36 shrink-0">{step(l.id)}</div></li>)}</ul>
            <p className="flex justify-between text-lg font-bold"><span>Total</span><span>Rs {total}</span></p>
            <div className="space-y-3 rounded-2xl bg-[var(--brand-soft)] p-4">
              <h3 className="font-bold">Delivery details{known && <span className="ml-2 text-sm font-normal text-stone-700">Filled from your last order</span>}</h3>
              {field('name', 'Your name', { autoComplete: 'name' })}{field('phone', 'Phone number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}{field('address', 'Delivery address', { autoComplete: 'street-address' })}{field('note', 'Note for the shop (optional)')}
            </div>
            {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
            <button onClick={place} disabled={busy || !f.name || !f.phone || !f.address} className="min-h-14 w-full rounded-2xl bg-[var(--brand)] text-lg font-bold text-white disabled:opacity-40">{busy ? 'Placing order…' : `Place order · Rs ${total}`}</button>
            <p className="text-center text-sm text-stone-600">Pay with cash when your fruit arrives</p>
          </div>
        </div>)}
    </div>)
}
