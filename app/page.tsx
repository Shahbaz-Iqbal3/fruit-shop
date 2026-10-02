'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sb, configured, TAGS } from '@/lib/supabase'
import { useShop, waLink } from '@/lib/shop'
import { Icon, I } from '@/lib/icons'
import CustomerNav from '@/lib/nav'
const PAGE = 20
const disp = 'font-[family-name:var(--font-display)]'
const rail = 'flex gap-2 overflow-x-auto snap-x overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
const price = (i: any) => (i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price)
export default function Shop() {
  const r = useRouter()
  const [shop] = useShop()
  const [items, setItems] = useState<any[] | null>(null), [hasMore, setHasMore] = useState(false), [loading, setLoading] = useState(false), [cats, setCats] = useState<any[]>([]), [pinned, setPinned] = useState<any>(null)
  const [cat, setCat] = useState('all'), [tag, setTag] = useState('all'), [sort, setSort] = useState('new'), [q, setQ] = useState(''), [dq, setDq] = useState('')
  const [cart, setCart] = useState<Record<string, { i: any; qty: number }>>({}), [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', address: '', note: '' }), [known, setKnown] = useState(false), [tried, setTried] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const io = useRef<IntersectionObserver | null>(null), moreRef = useRef<() => void>(() => {})
  useEffect(() => { try { const c = localStorage.getItem('cust'); if (c) { setF(JSON.parse(c)); setKnown(true) } } catch {} }, [])
  useEffect(() => { const t = setTimeout(() => setDq(q.trim().replace(/[,()%*]/g, '')), 300); return () => clearTimeout(t) }, [q])
  useEffect(() => {
    if (!configured) { r.replace('/setup'); return }
    sb.from('categories').select('*').order('sort').order('created_at').then(x => setCats(x.data || []))
    const id = new URLSearchParams(location.search).get('item')
    if (id) sb.from('items').select('*').eq('id', id).eq('available', true).maybeSingle().then(x => setPinned(x.data))
  }, [r])
  const fetchPage = useCallback(async (from: number) => {
    let qy = sb.from('items').select('*').eq('available', true)
    if (cat !== 'all') qy = qy.eq('category_id', cat)
    if (tag !== 'all') qy = qy.eq('tag', tag)
    if (dq) qy = qy.or(`name.ilike.%${dq}%,name_ur.ilike.%${dq}%`)
    qy = sort === 'low' ? qy.order('price') : sort === 'high' ? qy.order('price', { ascending: false }) : qy.order('created_at', { ascending: false })
    return (await qy.range(from, from + PAGE - 1)).data || []
  }, [cat, tag, dq, sort])
  useEffect(() => { if (!configured) return; let live = true; setItems(null); fetchPage(0).then(d => { if (live) { setItems(d); setHasMore(d.length === PAGE) } }); return () => { live = false } }, [fetchPage])
  moreRef.current = async () => { if (loading || !hasMore || !items) return; setLoading(true); const d = await fetchPage(items.length); setItems(x => [...(x || []), ...d]); setHasMore(d.length === PAGE); setLoading(false) }
  const sentinel = useCallback((el: HTMLDivElement | null) => { io.current?.disconnect(); if (!el) return; io.current = new IntersectionObserver(e => e[0].isIntersecting && moreRef.current(), { rootMargin: '600px' }); io.current.observe(el) }, [])
  const add = (i: any, d: number) => { navigator.vibrate?.(10); setCart(c => { const qty = Math.max(0, (c[i.id]?.qty || 0) + d); const n = { ...c }; if (qty) n[i.id] = { i, qty }; else delete n[i.id]; return n }) }
  const lines = Object.values(cart).map(({ i, qty }) => ({ id: i.id, name: i.name, unit: i.unit, price: price(i), qty }))
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0), count = lines.reduce((s, l) => s + l.qty, 0)
  const place = async () => {
    setBusy(true); setErr('')
    const { data, error } = await sb.rpc('place_order', { p_name: f.name, p_phone: f.phone, p_address: f.address, p_note: f.note, p_items: lines, p_total: total })
    if (data) { try { localStorage.setItem('cust', JSON.stringify({ ...f, note: '' })) } catch {} r.push('/track?phone=' + encodeURIComponent(f.phone)) } else { setErr(error?.message || 'Could not place the order. Please try again.'); setBusy(false) }
  }
  const digits = f.phone.replace(/\D/g, '').length
  const errs: Record<string, string> = { name: f.name.trim() ? '' : 'Please enter your name', phone: digits >= 10 ? '' : 'Enter the full phone number, e.g. 0300 1234567', address: f.address.trim().length >= 8 ? '' : 'Enter your full address so we can find you' }
  const submit = () => { setTried(true); const bad = ['name', 'phone', 'address'].find(k => errs[k]); if (bad) { document.getElementById('f-' + bad)?.focus(); return } place() }
  const field = (k: keyof typeof f, label: string, extra: object = {}) => { const bad = tried && errs[k]; return (
    <label className="block text-sm font-semibold text-stone-700">{label}
      <input id={'f-' + k} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} aria-invalid={!!bad} className={'mt-1 min-h-12 w-full rounded-xl border bg-white px-3 text-base font-normal ' + (bad ? 'border-red-600' : 'border-stone-300')} {...extra} />
      {bad && <span role="alert" className="mt-1 block text-sm font-normal text-red-700">{bad}</span>}</label>) }
  const step = (i: any) => (
    <div className="flex items-center justify-between gap-2 rounded-full bg-stone-100 p-1">
      <button aria-label="Remove one" onClick={() => add(i, -1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:scale-90"><Icon d={I.minus} /></button>
      <span key={cart[i.id]?.qty} style={{ animation: 'pop 200ms ease-out' }} className="min-w-6 text-center text-lg font-bold" aria-live="polite">{cart[i.id]?.qty}</span>
      <button aria-label="Add one more" onClick={() => add(i, 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-sm active:scale-90"><Icon d={I.plus} /></button>
    </div>)
  const tile = (i: any, n: number) => {
    const c = cart[i.id]?.qty || 0, sale = i.tag === 'on_sale' && i.sale_price
    return (
      <li key={i.id} style={{ animation: 'rise 420ms ease-out both', animationDelay: Math.min(n % PAGE, 10) * 35 + 'ms' }} className="group flex flex-col">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">
          {i.image_url ? <img src={i.image_url} alt={i.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="flex h-full items-center justify-center text-4xl text-stone-300">{i.name[0]}</span>}
          {sale && <span className="absolute left-0 top-2.5 rounded-r-full bg-rose-700 px-2.5 py-1 text-xs font-bold text-white">{Math.round((1 - i.sale_price / i.price) * 100)}% OFF</span>}
          {c ? (
            <div key={c} style={{ animation: 'pop 200ms ease-out' }} className="absolute bottom-2 right-2 flex items-center rounded-full bg-[var(--brand)] text-white shadow-lg">
              <button aria-label={'Remove one ' + i.name} onClick={() => add(i, -1)} className="flex h-11 w-9 items-center justify-center active:scale-90"><Icon d={I.minus} className="h-4 w-4" /></button>
              <span className="min-w-5 text-center font-bold">{c}</span>
              <button aria-label={'Add one more ' + i.name} onClick={() => add(i, 1)} className="flex h-11 w-9 items-center justify-center active:scale-90"><Icon d={I.plus} className="h-4 w-4" /></button>
            </div>
          ) : <button aria-label={'Add ' + i.name} onClick={() => add(i, 1)} className="absolute bottom-2 right-2 min-h-11 rounded-xl border border-[var(--brand)] bg-white px-4 text-sm font-extrabold uppercase text-[var(--brand)] shadow active:scale-95">Add</button>}
        </div>
        <div className="space-y-0.5 px-0.5 pt-2">
          <p className="flex items-baseline gap-1.5"><span className="text-base font-extrabold">Rs {price(i)}</span>{sale && <s className="text-sm text-stone-500">Rs {i.price}</s>}</p>
          <p className="line-clamp-2 text-sm font-medium leading-snug">{i.name}{i.name_ur && <span dir="rtl" className="block truncate text-stone-600">{i.name_ur}</span>}</p>
          <p className="text-xs text-stone-600">per {i.unit}{i.tag !== 'on_sale' && ` · ${TAGS[i.tag]}`}</p>
        </div>
      </li>)
  }
  const chip = (on: boolean) => 'min-h-11 shrink-0 snap-start rounded-full px-5 text-sm font-semibold ring-1 transition-colors ' + (on ? 'bg-[var(--brand)] text-white ring-[var(--brand)]' : 'bg-white text-stone-800 ring-stone-300')
  const grid = 'grid grid-cols-2 gap-x-2.5 gap-y-4 sm:gap-x-3 sm:gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
  return (
    <div className="mx-auto w-full max-w-7xl pb-40 md:pb-32">
      <CustomerNav active="shop" />
      <section className="px-4 pb-5 pt-5 text-white sm:rounded-b-3xl sm:px-5 sm:pb-7 sm:pt-6" style={{ background: 'linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, black))' }}>
        <div className="flex items-center gap-4">
          {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/60" /> : <span className={disp + ' flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold'}>{shop.name[0]}</span>}
          <div className="min-w-0 flex-1"><p className="text-sm text-white/85">Fresh fruit, delivered to you</p><h1 className={disp + ' truncate text-2xl font-bold leading-tight sm:text-3xl'}>{shop.name}</h1></div>
          {shop.whatsapp && <a href={waLink(shop.whatsapp, 'Hi, I have a question')} aria-label="Chat on WhatsApp" className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--brand)] shadow"><Icon d={I.chat} /></a>}
        </div>
        <ul className={rail + ' mt-3 text-sm font-medium sm:mt-4'}>{['Cash on delivery', 'Live order tracking', 'Picked fresh daily'].map(t => <li key={t} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><Icon d={I.check} className="h-4 w-4" />{t}</li>)}</ul>
      </section>
      <div className="sticky top-0 z-10 space-y-2 bg-[#fbf8f3]/95 px-3 py-2 backdrop-blur sm:px-4 sm:py-3 md:top-16">
        <label className="relative block"><span className="sr-only">Search fruit</span><Icon d={I.search} className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500" /><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search fruit" className="min-h-11 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-3 text-base shadow-sm sm:min-h-12" /></label>
        {cats.length > 0 && <div className={rail} role="group" aria-label="Categories">{[{ id: 'all', name: 'All' }, ...cats].map(c => <button key={c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>{c.name}</button>)}</div>}
      </div>
      <main className="space-y-4 px-3 pt-1 sm:space-y-5 sm:px-4 sm:pt-2">
        {pinned && <section className="rounded-3xl bg-[var(--brand-soft)] p-4"><p className="mb-3 font-bold">Shared with you</p><ul className={grid}>{tile(pinned, 0)}</ul></section>}
        <div className="flex items-center gap-2"><div className={rail + ' flex-1'} role="group" aria-label="Filter">{[['all', 'All'], ['fresh', 'Fresh'], ['on_sale', 'On sale'], ['one_day_old', '1 day old']].map(([k, l]) => <button key={k} aria-pressed={tag === k} onClick={() => setTag(k)} className={chip(tag === k)}>{l}</button>)}</div>
          <label className="shrink-0"><span className="sr-only">Sort</span><select value={sort} onChange={e => setSort(e.target.value)} className="min-h-11 rounded-full border border-stone-300 bg-white px-3 text-sm font-semibold"><option value="new">Newest</option><option value="low">Price: low</option><option value="high">Price: high</option></select></label></div>
        <ul className={grid}>
          {items === null && Array.from({ length: 10 }, (_, n) => <li key={n}><div className="aspect-square animate-pulse rounded-2xl bg-stone-200" /><div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-stone-200" /><div className="mt-1.5 h-4 w-full animate-pulse rounded bg-stone-200" /></li>)}
          {items?.map(tile)}
        </ul>
        {items && items.length === 0 && <p className="rounded-3xl bg-white p-10 text-center text-stone-600 ring-1 ring-stone-200">No fruit matches. Try another search or filter.</p>}
        {hasMore && <div ref={sentinel} key={items?.length} className="flex justify-center py-6"><span className="h-7 w-7 animate-spin rounded-full border-4 border-stone-300 border-t-[var(--brand)]" role="status" aria-label="Loading more" /></div>}
      </main>
      {count > 0 && <div style={{ animation: 'rise 300ms ease-out' }} className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] px-4 pb-3 md:bottom-0 md:pb-6"><button onClick={() => setOpen(true)} className="mx-auto flex min-h-14 w-full max-w-4xl items-center gap-3 rounded-2xl bg-stone-900 px-5 text-white shadow-2xl active:scale-[0.99]"><span className="relative"><Icon d={I.cart} className="h-6 w-6" /><span key={count} style={{ animation: 'pop 200ms ease-out' }} className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-xs font-bold">{count}</span></span><span className="flex-1 text-left font-semibold">View your order</span><span className="text-lg font-bold">Rs {total}</span></button></div>}
      {open && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/50 md:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Your order" onClick={e => e.stopPropagation()} style={{ animation: 'sheet 250ms ease-out' }} className="mx-auto max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl">
            <div className="flex items-center justify-between"><h2 className={disp + ' text-2xl font-bold'}>Your order</h2><button aria-label="Close" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"><Icon d={I.x} /></button></div>
            {lines.length === 0 ? <p className="py-6 text-center text-stone-600">Your order is empty.</p> : <ul className="divide-y divide-stone-200">{Object.values(cart).map(({ i }) => <li key={i.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-semibold">{i.name}</p><p className="text-sm text-stone-600">Rs {price(i) * cart[i.id].qty}</p></div><div className="w-36 shrink-0">{step(i)}</div></li>)}</ul>}
            <p className="flex justify-between text-lg font-bold"><span>Total</span><span>Rs {total}</span></p>
            <div className="space-y-3 rounded-2xl bg-[var(--brand-soft)] p-4">
              <h3 className="font-bold">Delivery details{known && <span className="ml-2 text-sm font-normal text-stone-700">Filled from your last order</span>}</h3>
              {field('name', 'Your name', { autoComplete: 'name' })}{field('phone', 'Phone number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}{field('address', 'Delivery address', { autoComplete: 'street-address' })}{field('note', 'Note for the shop (optional)')}
            </div>
            {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
            <div className="sticky bottom-0 -mx-5 -mb-5 bg-white/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"><button onClick={submit} disabled={busy || !lines.length} className="min-h-14 w-full rounded-2xl bg-[var(--brand)] text-lg font-bold text-white disabled:opacity-40">{busy ? 'Placing order…' : `Place order · Rs ${total}`}</button>
            <p className="mt-1.5 text-center text-xs text-stone-600">Pay with cash when your fruit arrives</p></div>
          </div>
        </div>)}
    </div>)
}
