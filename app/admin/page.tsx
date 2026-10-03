'use client'
import { useEffect, useRef, useState } from 'react'
import { sb, TAGS } from '@/lib/supabase'
import { useShop } from '@/lib/shop'
import { Icon, I } from '@/lib/icons'
import Camera from '@/lib/camera'
import Reports from './reports'
import Notifications from './notifications'
import ShareSheet from './share'
const NEXT: Record<string, string> = { placed: 'accepted', accepted: 'preparing', preparing: 'out_for_delivery', out_for_delivery: 'delivered' }
const ACT: Record<string, string> = { placed: 'Accept order', accepted: 'Start preparing', preparing: 'Out for delivery', out_for_delivery: 'Mark delivered' }
const LBL: Record<string, string> = { placed: 'New', accepted: 'Accepted', preparing: 'Preparing', out_for_delivery: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' }
const PILL: Record<string, string> = { placed: 'bg-rose-100 text-rose-900', accepted: 'bg-sky-100 text-sky-900', preparing: 'bg-amber-100 text-amber-900', out_for_delivery: 'bg-violet-100 text-violet-900', delivered: 'bg-green-100 text-green-900', cancelled: 'bg-stone-200 text-stone-800' }
const SKIN: Record<string, { label: string; card: string; bar: string; btn: string }> = {
  placed: { label: 'NEW ORDER · accept now', card: 'bg-rose-50 ring-2 ring-rose-600', bar: 'bg-rose-600 text-white', btn: 'bg-rose-600' },
  accepted: { label: 'Accepted', card: 'bg-sky-50 ring-1 ring-sky-300', bar: 'bg-sky-600 text-white', btn: 'bg-sky-600' },
  preparing: { label: 'Preparing', card: 'bg-amber-50 ring-1 ring-amber-300', bar: 'bg-amber-700 text-white', btn: 'bg-amber-700' },
  out_for_delivery: { label: 'Out for delivery', card: 'bg-violet-50 ring-1 ring-violet-300', bar: 'bg-violet-600 text-white', btn: 'bg-violet-600' },
  delivered: { label: 'Delivered', card: 'bg-green-50 ring-1 ring-green-300', bar: 'bg-green-700 text-white', btn: 'bg-green-700' },
  cancelled: { label: 'Cancelled', card: 'bg-stone-100 ring-1 ring-stone-300', bar: 'bg-stone-500 text-white', btn: 'bg-stone-600' },
}
const blank = { name: '', name_ur: '', description: '', price: '', unit: 'kg', tag: 'fresh', sale_price: '', available: true, stock_status: 'in_stock', image_url: '' }
const ago = (d: string) => { const m = Math.round((Date.now() - +new Date(d)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }
const inp = 'mt-1 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base font-normal'
const card = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200'
const disp = 'font-[family-name:var(--font-display)]'
export default function Admin() {
  const [user, setUser] = useState<any>(null), [cr, setCr] = useState({ email: '', password: '' }), [err, setErr] = useState('')
  const [tab, setTab] = useState<'orders' | 'items' | 'reports' | 'brand'>('orders'), [view, setView] = useState<'active' | 'done'>('active')
  const [orders, setOrders] = useState<any[]>([]), [reportOrders, setReportOrders] = useState<any[]>([]), [items, setItems] = useState<any[]>([]), [form, setForm] = useState<any>(null), [sel, setSel] = useState<string[]>([])
  const [shop, setShop] = useShop(), [saved, setSaved] = useState(false)
  const [cats, setCats] = useState<any[]>([]), [catSheet, setCatSheet] = useState(false), [newCat, setNewCat] = useState(''), [q, setQ] = useState(''), [cf, setCf] = useState('all'), [af, setAf] = useState('all'), [shown, setShown] = useState(20), [oShown, setOShown] = useState(15), [shopTab, setShopTab] = useState<'look' | 'notify'>('look'), [checking, setChecking] = useState(true), [loaded, setLoaded] = useState(false), [oq, setOq] = useState(''), [oRes, setORes] = useState<any[] | null>(null), [shareItems, setShareItems] = useState<any[] | null>(null), io = useRef<IntersectionObserver | null>(null)
  useEffect(() => { setShown(20); setOShown(15) }, [q, cf, af, tab, view])
  const [cam, setCam] = useState(false), [tried, setTried] = useState(false), [upBusy, setUpBusy] = useState(false), [armed, setArmed] = useState(false), [repeatAlarm, setRepeatAlarm] = useState(false), audio = useRef<HTMLAudioElement | null>(null)
  useEffect(() => { const t = oq.trim(); if (t.length < 3) { setORes(null); return } let live = true; const id = setTimeout(() => sb.rpc('search_orders', { q: t }).then(x => live && setORes(x.data || [])), 300); return () => { live = false; clearTimeout(id) } }, [oq])
  useEffect(() => { sb.auth.getSession().then(x => { setUser(x.data.session?.user ?? null); setChecking(false) }) }, [])
  useEffect(() => { try { setRepeatAlarm(localStorage.getItem('repeatAlarm') === 'true') } catch {} }, [])
  const load = async () => {
    const [catResult, orderResult, itemResult] = await Promise.all([
      sb.from('categories').select('*').order('sort').order('created_at'),
      sb.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
      sb.from('items').select('*').order('created_at', { ascending: false }),
    ])
    setCats(catResult.data || [])
    setOrders(orderResult.data || [])
    setItems(itemResult.data || [])
    const allOrders: any[] = []
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from('orders').select('*').order('created_at', { ascending: false }).range(from, from + 999)
      allOrders.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    setReportOrders(allOrders)
  }
  useEffect(() => { if (!user) return; load().finally(() => setLoaded(true)); const ch = sb.channel('o').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load).subscribe(); return () => { sb.removeChannel(ch) } }, [user])
  const fresh = orders.filter(o => o.status === 'placed').length
  useEffect(() => {
    if (armed && fresh > 0) {
      const a = audio.current = new Audio('/alarm.wav')
      a.volume = 0.9
      a.loop = repeatAlarm
      a.play().catch(() => {})
    }
    return () => { if (audio.current) { audio.current.pause(); audio.current = null } }
  }, [armed, fresh, repeatAlarm])
  const arm = () => { (navigator as any).wakeLock?.request('screen').catch(() => {}); setArmed(true) }
  const login = async () => { const { data, error } = await sb.auth.signInWithPassword(cr); if (error) setErr(error.message); else setUser(data.user) }
  const setStatus = async (id: string, status: string) => { await sb.from('orders').update({ status }).eq('id', id); load() }
  const upload = async (file: File, cb: (url: string) => void) => { const p = Date.now() + '-' + file.name.replace(/\W/g, ''); setUpBusy(true); await sb.storage.from('items').upload(p, file); setUpBusy(false); cb(sb.storage.from('items').getPublicUrl(p).data.publicUrl) }
  const save = async () => { setTried(true); if (!form.name.trim() || !(+form.price > 0)) return; const { id, created_at, ...row } = form; row.category_id = row.category_id || null; row.price = +row.price; row.sale_price = row.sale_price ? +row.sale_price : null; await (id ? sb.from('items').update(row).eq('id', id) : sb.from('items').insert(row)); setForm(null); load() }
  const toggle = async (i: any) => { await sb.from('items').update({ stock_status: i.stock_status === 'sold_out' || i.stock_status === 'back_tomorrow' ? 'in_stock' : 'sold_out' }).eq('id', i.id); load() }
  const remove = async (i: any) => { if (!confirm(`Delete ${i.name}? This cannot be undone.`)) return; await sb.from('items').delete().eq('id', i.id); setForm(null); setSel(s => s.filter(x => x !== i.id)); load() }
  const addCat = async () => { const n = newCat.trim(); if (!n) return; await sb.from('categories').insert({ name: n, sort: (cats.at(-1)?.sort ?? -1) + 1 }); setNewCat(''); load() }
  const renameCat = async (c: any, name: string) => { if (name.trim() && name.trim() !== c.name) { await sb.from('categories').update({ name: name.trim() }).eq('id', c.id); load() } }
  const moveCat = async (idx: number, d: number) => { const a = cats[idx], b = cats[idx + d]; if (!b) return; await Promise.all([sb.from('categories').update({ sort: b.sort }).eq('id', a.id), sb.from('categories').update({ sort: a.sort }).eq('id', b.id)]); load() }
  const delCat = async (c: any) => { if (!confirm(`Delete category "${c.name}"? Its fruit will become uncategorized.`)) return; await sb.from('categories').delete().eq('id', c.id); if (cf === c.id) setCf('all'); load() }
  const sentinel = (set: (f: (n: number) => number) => void) => (el: HTMLDivElement | null) => { io.current?.disconnect(); if (!el) return; io.current = new IntersectionObserver(e => e[0].isIntersecting && set(n => n + 15), { rootMargin: '500px' }); io.current.observe(el) }
  const saveShop = async () => { await sb.from('shop_settings').upsert({ id: 1, name: shop.name, logo_url: shop.logo_url, color: shop.color, whatsapp: shop.whatsapp }); document.documentElement.style.setProperty('--brand', shop.color); setSaved(true) }
  const share = async () => {
    const chosen = items.filter(i => sel.includes(i.id)), text = chosen.map(i => `${i.name} – Rs ${i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price}/${i.unit}\n${location.origin}/?item=${i.id}`).join('\n\n')
    try { const files = await Promise.all(chosen.filter(i => i.image_url).slice(0, 5).map(async i => { const b = await (await fetch(i.image_url)).blob(); return new File([b], i.name + '.jpg', { type: b.type }) })); if (files.length && navigator.canShare?.({ files })) { await navigator.share({ files, text }); return } } catch {}
    if (navigator.share) navigator.share({ text }).catch(() => {}); else navigator.clipboard.writeText(text)
  }
  const lab = (t: string, n: React.ReactNode) => <label className="block text-sm font-semibold text-stone-700">{t}{n}</label>
  if (checking || (user && !loaded)) return (
    <main role="status" aria-live="polite" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#fbf8f3]">
      <img src="/icon-192.png" alt="" className="h-20 w-20 rounded-3xl shadow-lg" />
      <span className="h-7 w-7 animate-spin rounded-full border-4 border-stone-300 border-t-[var(--brand)]" />
      <p className="text-stone-600">Loading your shop…</p>
    </main>)
  if (!user) return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className={disp + ' text-3xl font-bold'}>Owner login</h1>
      <p className="text-stone-600">Manage your orders, fruit and shop look.</p>
      {lab('Email', <input className={inp} type="email" autoComplete="username" onChange={e => setCr({ ...cr, email: e.target.value })} />)}
      {lab('Password', <input className={inp} type="password" autoComplete="current-password" onChange={e => setCr({ ...cr, password: e.target.value })} />)}
      {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
      <button onClick={login} className="min-h-14 rounded-2xl bg-[var(--brand)] text-lg font-bold text-white">Log in</button>
    </main>)
  const vis = items.filter(i => (cf === 'all' || (cf === 'none' ? !i.category_id : i.category_id === cf)) && (af === 'all' || (af === 'on') === i.available) && (i.name + (i.name_ur || '')).toLowerCase().includes(q.toLowerCase()))
  const list = oRes ?? orders.filter(o => (view === 'active') === !['delivered', 'cancelled'].includes(o.status))
  const tabs = [['orders', 'Orders', I.orders], ['items', 'Fruit', I.bag], ['reports', 'Reports', I.chart], ['brand', 'Shop', I.brand]] as const
  return (
    <div className="mx-auto w-full max-w-3xl pb-32 lg:max-w-5xl lg:pb-10 lg:pl-56">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-[#fbf8f3]/95 px-4 py-3 backdrop-blur">
        {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className={disp + ' flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)] font-bold text-white'}>{shop.name[0]}</span>}
        <h1 className={disp + ' flex-1 truncate text-xl font-bold'}>{shop.name}</h1>
        {armed ? <span className={'flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold ' + (fresh ? 'animate-pulse bg-rose-700 text-white' : 'bg-green-100 text-green-900')}><Icon d={I.bell} className="h-4 w-4" />{fresh ? `${fresh} new` : 'Sound on'}</span> : <button onClick={arm} className="flex min-h-11 items-center gap-2 rounded-full bg-[var(--brand)] px-4 text-sm font-bold text-white"><Icon d={I.bell} className="h-4 w-4" />Start orders</button>}
      </header>
      <main key={tab + shopTab} style={{ animation: 'rise 300ms ease-out' }} className="space-y-3 px-4 pt-2">
        {tab === 'orders' && <>
          {!armed && <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">Tap “Start taking orders” so new orders ring loudly. Keep this page open.</p>}
          <label className="relative block"><span className="sr-only">Search orders</span><Icon d={I.search} className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500" /><input type="search" value={oq} onChange={e => setOq(e.target.value)} placeholder="Search by name, phone or address" className={inp + ' mt-0! pl-11'} /></label>
          <div className={'flex gap-2' + (oRes ? ' hidden' : '')}>{(['active', 'done'] as const).map(v => <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={'min-h-11 rounded-full px-5 text-sm font-semibold ring-1 ' + (view === v ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white ring-stone-300')}>{v === 'active' ? 'Active' : 'History'}</button>)}</div>
          {list.slice(0, oShown).map(o => (
            <section key={o.id} style={o.status === 'placed' ? { animation: 'alert 1.4s ease-out infinite' } : undefined} className={'overflow-hidden rounded-2xl p-4 shadow-sm ' + (SKIN[o.status]?.card || 'bg-white ring-1 ring-stone-200')}>
              <div className={'-mx-4 -mt-4 mb-3 flex items-center justify-between px-4 py-2.5 ' + (SKIN[o.status]?.bar || '')}><span className="font-bold">{SKIN[o.status]?.label || LBL[o.status]}</span><span className="text-sm opacity-90">{ago(o.created_at)}</span></div>
              <div className="mt-3 flex items-start justify-between gap-3"><div><p className="text-lg font-bold">{o.customer_name}</p><p><a href={'tel:' + o.phone} className="font-semibold text-[var(--brand)] underline">{o.phone}</a></p><p className="text-stone-700">{o.address}</p>{o.note && <p className="text-sm text-stone-600">Note: {o.note}</p>}</div><a href={'tel:' + o.phone} aria-label={'Call ' + o.customer_name} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-700 text-white"><Icon d={I.phone} /></a></div>
              <ul className="mt-3 space-y-1 border-t border-stone-200 pt-3">{o.items.map((l: any) => <li key={l.id} className="flex justify-between"><span>{l.name} × {l.qty} {l.unit}</span><span>Rs {l.price * l.qty}</span></li>)}</ul>
              <p className="mt-2 flex justify-between text-lg font-bold"><span>Total · Cash</span><span>Rs {o.total}</span></p>
              {NEXT[o.status] && <div className="mt-3 flex gap-2"><button onClick={() => setStatus(o.id, NEXT[o.status])} className={'min-h-14 flex-1 rounded-2xl text-lg font-bold text-white ' + (SKIN[o.status]?.btn || 'bg-[var(--brand)]')}>{ACT[o.status]}</button><button onClick={() => confirm('Cancel this order?') && setStatus(o.id, 'cancelled')} className="min-h-14 rounded-2xl bg-white px-4 font-semibold ring-1 ring-stone-300">Cancel</button></div>}
            </section>))}
          {list.length > oShown && <div ref={sentinel(setOShown)} key={oShown} className="h-8" />}
          {list.length === 0 && <p className={card + ' py-10 text-center text-stone-600'}>{oRes ? 'No orders match that search.' : view === 'active' ? 'No active orders. New ones will appear here.' : 'No past orders yet.'}</p>}
        </>}
        {tab === 'items' && <>
          <div className="flex items-center justify-between"><h2 className={disp + ' text-2xl font-bold'}>Your fruit <span className="text-base font-normal text-stone-600">({vis.length})</span></h2><div className="flex gap-2"><button aria-label="Share shop link" onClick={() => setShareItems([])} className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100"><Icon d={I.share} /></button><button onClick={() => { setTried(false); setForm(blank) }} className="flex min-h-12 items-center gap-2 rounded-full bg-[var(--brand)] px-5 font-bold text-white"><Icon d={I.plus} />Add</button></div></div>
          <div className="flex gap-2"><input type="search" aria-label="Search fruit" placeholder="Search fruit" value={q} onChange={e => setQ(e.target.value)} className={inp + ' mt-0! min-w-0 flex-1'} /><select aria-label="Availability" value={af} onChange={e => setAf(e.target.value)} className={inp + ' mt-0! w-1/5!'}><option value="all">Any</option><option value="on">Shown</option><option value="off">Hidden</option></select></div>
          <div className="flex gap-2 overflow-x-auto p-1 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{[{ id: 'all', name: 'All' }, ...cats, { id: 'none', name: 'No category' }].map(c => <button key={c.id} aria-pressed={cf === c.id} onClick={() => setCf(c.id)} className={'min-h-8 h-8 shrink-0 rounded-full px-4 text-sm font-semibold ring-1 ' + (cf === c.id ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white ring-stone-300')}>{c.name}</button>)}<button onClick={() => setCatSheet(true)} className="flex min-h-8 h-8 shrink-0 items-center gap-1 rounded-full bg-[var(--brand-soft)] px-4 text-sm font-bold text-[var(--brand)]"><Icon d={I.edit} className="h-4 w-4" />Categories</button></div>
          {vis.slice(0, shown).map(i => (
            <section key={i.id} className={card + ' flex items-center gap-3 !p-3'}>
              <input type="checkbox" aria-label={'Select ' + i.name} className="h-6 w-6 shrink-0" checked={sel.includes(i.id)} onChange={() => setSel(s => s.includes(i.id) ? s.filter(x => x !== i.id) : [...s, i.id])} />
              {i.image_url ? <img src={i.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : <span className="h-14 w-14 shrink-0 rounded-xl bg-stone-100" />}
              <div className="min-w-0 flex-1"><p className="truncate font-bold">{i.name}</p><p className="text-sm text-stone-700">Rs {i.price} / {i.unit} · {TAGS[i.tag]}</p><div className="-ml-1 flex items-center"><button role="switch" aria-checked={(i.stock_status || 'in_stock') === 'in_stock'} aria-label={'In stock: ' + i.name} onClick={() => toggle(i)} className="flex min-h-11 min-w-14 items-center justify-center"><span className={'flex h-8 w-14 items-center rounded-full p-1 transition-colors ' + ((i.stock_status || 'in_stock') === 'in_stock' ? 'bg-green-700' : 'bg-stone-300')}><span className={'h-6 w-6 rounded-full bg-white shadow transition-transform ' + ((i.stock_status || 'in_stock') === 'in_stock' ? 'translate-x-6' : '')} /></span></button><span className={'text-sm font-semibold ' + (i.available && (i.stock_status || 'in_stock') === 'in_stock' ? 'text-green-800' : 'text-stone-600')}>{!i.available ? 'Hidden' : i.stock_status === 'sold_out' ? 'Sold out' : i.stock_status === 'back_tomorrow' ? 'Back tomorrow' : 'In stock'}</span></div></div>
              <button aria-label={'Edit ' + i.name} onClick={() => { setTried(false); setForm(i) }} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"><Icon d={I.edit} /></button>
              <button aria-label={'Delete ' + i.name} onClick={() => remove(i)} className="hidden h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-700 sm:flex"><Icon d={I.trash} /></button>
            </section>))}
          {vis.length > shown && <div ref={sentinel(setShown)} key={shown} className="h-8" />}
          {vis.length === 0 && <p className={card + ' py-10 text-center text-stone-600'}>{items.length ? 'No fruit matches these filters.' : 'No fruit yet. Tap Add to create your first item.'}</p>}
        </>}
        {tab === 'reports' && <Reports orders={reportOrders} items={items} categories={cats} />}
        {tab === 'brand' && <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-stone-200/70 p-1">{([['look', 'Shop look'], ['notify', 'Notifications']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={shopTab === k} onClick={() => setShopTab(k)} className={'min-h-11 rounded-xl text-sm font-bold transition-colors ' + (shopTab === k ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600')}>{l}</button>)}</div>}
        {tab === 'brand' && shopTab === 'look' && <section className={card + ' space-y-4'}>
          <h2 className={disp + ' text-2xl font-bold'}>Shop look</h2>
          <div className="flex items-center gap-3 rounded-2xl p-4 text-white" style={{ background: shop.color }}>{shop.logo_url ? <img src={shop.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-xl font-bold">{shop.name[0]}</span>}<p className={disp + ' text-2xl font-bold'}>{shop.name}</p></div>
          {lab('Shop name', <input className={inp} value={shop.name} onChange={e => { setShop({ ...shop, name: e.target.value }); setSaved(false) }} />)}
          {lab('WhatsApp number', <input className={inp} inputMode="tel" placeholder="03xx xxxxxxx" value={shop.whatsapp || ''} onChange={e => { setShop({ ...shop, whatsapp: e.target.value }); setSaved(false) }} />)}
          {lab('Brand color', <input type="color" className="mt-1 block h-12 w-24 rounded-xl" value={shop.color} onChange={e => { setShop({ ...shop, color: e.target.value }); setSaved(false) }} />)}
          {lab('Logo', <input type="file" accept="image/*" className="mt-1 block" onChange={e => e.target.files?.[0] && upload(e.target.files[0], url => { setShop({ ...shop, logo_url: url }); setSaved(false) })} />)}
           <button onClick={saveShop} className="min-h-14 w-full rounded-2xl bg-[var(--brand)] text-lg font-bold text-white">{saved ? 'Saved ✓' : 'Save changes'}</button>
           <button onClick={async () => { await sb.auth.signOut(); setUser(null) }} className="min-h-12 w-full rounded-2xl bg-stone-100 font-semibold">Log out</button>
          <div className="flex min-h-14 items-center justify-between gap-4 border-t border-stone-200 pt-4 font-semibold"><span id="repeat-alarm-label"><span className="block">Repeat new-order alarm</span><span className="text-sm font-normal text-stone-600">Keep ringing until you handle the new order</span></span><button type="button" role="switch" aria-checked={repeatAlarm} aria-labelledby="repeat-alarm-label" onClick={() => { const next = !repeatAlarm; setRepeatAlarm(next); try { localStorage.setItem('repeatAlarm', String(next)) } catch {} }} className={'flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ' + (repeatAlarm ? 'bg-[var(--brand)]' : 'bg-stone-300')}><span className={'h-6 w-6 rounded-full bg-white shadow transition-transform ' + (repeatAlarm ? 'translate-x-6' : '')} /></button></div>
         </section>}
        {tab === 'brand' && shopTab === 'notify' && <Notifications />}
      </main>
      {tab === 'items' && sel.length > 0 && <button onClick={() => setShareItems(items.filter(i => sel.includes(i.id)))} className="fixed inset-x-4 bottom-24 mx-auto flex min-h-14 max-w-md items-center justify-center gap-2 rounded-2xl bg-green-700 text-lg font-bold text-white shadow-xl"><Icon d={I.share} />Share {sel.length} {sel.length === 1 ? 'item' : 'items'}</button>}
      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:inset-y-0 lg:right-auto lg:w-56 lg:border-r lg:border-t-0 lg:pt-6"><ul className="mx-auto flex max-w-3xl lg:max-w-none lg:flex-col lg:gap-1 lg:px-3">{tabs.map(([k, l, d]) => <li key={k} className="flex-1"><button aria-current={tab === k} onClick={() => setTab(k)} className={'relative flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-bold lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-4 lg:text-base ' + (tab === k ? 'text-[var(--brand)]' : 'text-stone-600')}><Icon d={d} className="h-6 w-6" />{l}{k === 'orders' && fresh > 0 && <span className="absolute right-[28%] top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-700 px-1 text-xs text-white">{fresh}</span>}</button></li>)}<li className="flex-1"><a href="/" className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-bold text-stone-600 lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-4 lg:text-base"><Icon d={I.cart} className="h-6 w-6" />View shop</a></li></ul></nav>
      {shareItems && <ShareSheet items={shareItems} shop={shop} onClose={() => setShareItems(null)} />}
      {catSheet && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/50 md:items-center" onClick={() => setCatSheet(false)}>
          <div role="dialog" aria-modal="true" aria-label="Categories" onClick={e => e.stopPropagation()} style={{ animation: 'sheet 250ms ease-out' }} className="mx-auto max-h-[92dvh] w-full max-w-lg space-y-3 overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl">
            <div className="flex items-center justify-between"><h2 className={disp + ' text-2xl font-bold'}>Categories</h2><button aria-label="Close" onClick={() => setCatSheet(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"><Icon d={I.x} /></button></div>
            <div className="flex gap-2"><input className={inp + ' !mt-0 flex-1'} aria-label="New category name" placeholder="New category, e.g. Seasonal" value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()} /><button onClick={addCat} className="min-h-12 rounded-xl bg-[var(--brand)] px-5 font-bold text-white">Add</button></div>
            {cats.map((c, n) => <div key={c.id} className="flex items-center gap-1.5"><input aria-label="Category name" defaultValue={c.name} onBlur={e => renameCat(c, e.target.value)} className={inp + ' !mt-0 flex-1'} /><button aria-label="Move up" disabled={n === 0} onClick={() => moveCat(n, -1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 disabled:opacity-30"><Icon d={I.up} /></button><button aria-label="Move down" disabled={n === cats.length - 1} onClick={() => moveCat(n, 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 disabled:opacity-30"><Icon d={I.down} /></button><button aria-label={'Delete ' + c.name} onClick={() => delCat(c)} className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-700"><Icon d={I.trash} /></button></div>)}
            {cats.length === 0 && <p className="py-4 text-center text-stone-600">No categories yet. Add one above.</p>}
          </div>
        </div>)}
      {cam && <Camera onCapture={f => { setCam(false); upload(f, url => setForm({ ...form, image_url: url })) }} onClose={() => setCam(false)} />}
      {form && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/50 md:items-center" onClick={() => setForm(null)}>
          <div role="dialog" aria-modal="true" aria-label="Item" onClick={e => e.stopPropagation()} style={{ animation: 'sheet 250ms ease-out' }} className="mx-auto max-h-[92dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-3xl bg-white p-5 md:rounded-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between"><h2 className={disp + ' text-2xl font-bold'}>{form.id ? 'Edit fruit' : 'Add fruit'}</h2><button aria-label="Close" onClick={() => setForm(null)} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"><Icon d={I.x} /></button></div>
            {lab('Name', <><input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />{tried && !form.name.trim() && <span role="alert" className="mt-1 block text-sm font-normal text-red-700">Enter the fruit name</span>}</>)}
            {lab('Urdu name (optional)', <input className={inp} dir="rtl" value={form.name_ur || ''} onChange={e => setForm({ ...form, name_ur: e.target.value })} />)}
            {lab('Description', <textarea className={inp + ' py-2'} rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />)}
            <div className="grid grid-cols-2 gap-3">{lab('Price (Rs)', <><input className={inp} type="number" inputMode="decimal" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />{tried && !(+form.price > 0) && <span role="alert" className="mt-1 block text-sm font-normal text-red-700">Enter a price above 0</span>}</>)}{lab('Sold per', <select className={inp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{['kg', 'dozen', 'piece'].map(u => <option key={u}>{u}</option>)}</select>)}</div>
            <div className="grid grid-cols-2 gap-3">{lab('Status', <select className={inp} value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}>{Object.entries(TAGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>)}{form.tag === 'on_sale' && lab('Sale price (Rs)', <input className={inp} type="number" inputMode="decimal" value={form.sale_price || ''} onChange={e => setForm({ ...form, sale_price: e.target.value })} />)}</div>
            {lab('Stock', <select className={inp} value={form.stock_status || 'in_stock'} onChange={e => setForm({ ...form, stock_status: e.target.value })}><option value="in_stock">In stock</option><option value="sold_out">Sold out</option><option value="back_tomorrow">Back tomorrow</option></select>)}
            {lab('Category', <select className={inp} value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value })}><option value="">No category</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>)}
            <div className="space-y-2"><p className="text-sm font-semibold text-stone-700">Photo</p>
              <div className="flex items-center gap-3">{form.image_url ? <img src={form.image_url} alt="Preview" className="h-24 w-24 rounded-2xl object-cover" /> : <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-stone-100 text-stone-500"><Icon d={I.camera} className="h-8 w-8" /></span>}
                <div className="flex flex-1 flex-col gap-2"><button type="button" onClick={() => setCam(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 font-semibold text-white"><Icon d={I.camera} className="h-5 w-5" />{form.image_url ? 'Retake with camera' : 'Take photo'}</button>
                  <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-stone-100 font-semibold">Choose from gallery<input type="file" accept="image/*" className="sr-only" onChange={e => e.target.files?.[0] && upload(e.target.files[0], url => setForm({ ...form, image_url: url }))} /></label></div></div>
              {upBusy && <p className="text-sm text-stone-600" aria-live="polite">Uploading photo…</p>}</div>
            <label className="flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" className="h-6 w-6" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })} />Show in shop</label>
            <div className="sticky bottom-0 -mx-5 space-y-2 bg-white/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"><button onClick={save} className="min-h-14 w-full rounded-2xl bg-[var(--brand)] text-lg font-bold text-white">Save fruit</button>
            {form.id && <button onClick={() => remove(form)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 font-semibold text-red-700"><Icon d={I.trash} className="h-5 w-5" />Delete this fruit</button>}
            </div>
          </div>
        </div>)}
    </div>)
}
