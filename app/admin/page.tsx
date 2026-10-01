'use client'
import { useEffect, useRef, useState } from 'react'
import { sb, TAGS } from '@/lib/supabase'
import { useShop } from '@/lib/shop'
const NEXT: Record<string, string> = { placed: 'accepted', accepted: 'preparing', preparing: 'out_for_delivery', out_for_delivery: 'delivered' }
const blank = { name: '', name_ur: '', description: '', price: '', unit: 'kg', tag: 'fresh', sale_price: '', available: true, image_url: '' }
export default function Admin() {
  const [user, setUser] = useState<any>(null), [cr, setCr] = useState({ email: '', password: '' }), [err, setErr] = useState('')
  const [orders, setOrders] = useState<any[]>([]), [items, setItems] = useState<any[]>([]), [form, setForm] = useState<any>(blank), [sel, setSel] = useState<string[]>([])
  const [shop, setShop] = useShop(), [saved, setSaved] = useState(false)
  const [armed, setArmed] = useState(false), ctx = useRef<AudioContext | null>(null), beep = useRef<any>(null)
  useEffect(() => { sb.auth.getUser().then(x => setUser(x.data.user)) }, [])
  const load = async () => { setOrders((await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(50)).data || []); setItems((await sb.from('items').select('*').order('created_at', { ascending: false })).data || []) }
  useEffect(() => { if (!user) return; load(); const ch = sb.channel('o').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load).subscribe(); return () => { sb.removeChannel(ch) } }, [user])
  const pending = orders.some(o => o.status === 'placed')
  useEffect(() => {
    clearInterval(beep.current)
    if (armed && pending) { const ring = () => { const c = ctx.current!, o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 880; g.gain.value = 0.6; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4) }; ring(); beep.current = setInterval(ring, 800) }
    return () => clearInterval(beep.current)
  }, [armed, pending])
  const arm = () => { ctx.current = new AudioContext(); (navigator as any).wakeLock?.request('screen').catch(() => {}); setArmed(true) }
  const login = async () => { const { data, error } = await sb.auth.signInWithPassword(cr); if (error) setErr(error.message); else setUser(data.user) }
  const setStatus = async (id: string, status: string) => { await sb.from('orders').update({ status }).eq('id', id); load() }
  const upload = async (file: File) => { const p = Date.now() + '-' + file.name.replace(/\W/g, ''); await sb.storage.from('items').upload(p, file); setForm({ ...form, image_url: sb.storage.from('items').getPublicUrl(p).data.publicUrl }) }
  const save = async () => { const { id, created_at, ...row } = form; row.price = +row.price; row.sale_price = row.sale_price ? +row.sale_price : null; await (id ? sb.from('items').update(row).eq('id', id) : sb.from('items').insert(row)); setForm(blank); load() }
  const share = () => { const chosen = items.filter(i => sel.includes(i.id)); const text = chosen.map(i => `${i.name} – Rs ${i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price}/${i.unit}\n${location.origin}/item/${i.id}`).join('\n\n'); navigator.share ? navigator.share({ text }) : navigator.clipboard.writeText(text) }
  const saveShop = async () => { await sb.from('shop_settings').upsert({ id: 1, name: shop.name, logo_url: shop.logo_url, color: shop.color, whatsapp: shop.whatsapp }); document.documentElement.style.setProperty('--brand', shop.color); setSaved(true) }
  const uploadLogo = async (file: File) => { const p = 'logo-' + Date.now(); await sb.storage.from('items').upload(p, file); setShop({ ...shop, logo_url: sb.storage.from('items').getPublicUrl(p).data.publicUrl }); setSaved(false) }
  const inp = 'min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base'
  if (!user) return (
    <main className="mx-auto max-w-sm space-y-3 p-6"><h1 className="text-2xl font-bold">Owner login</h1>
      <input className={inp} placeholder="Email" onChange={e => setCr({ ...cr, email: e.target.value })} /><input className={inp} type="password" placeholder="Password" onChange={e => setCr({ ...cr, password: e.target.value })} />
      <button onClick={login} className="w-full rounded-xl bg-[var(--brand)] py-3 font-semibold text-white">Log in</button><p className="text-red-700">{err}</p></main>)
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-4">
      {!armed ? <button onClick={arm} className="w-full rounded-2xl bg-[var(--brand)] py-5 text-lg font-bold text-white">Start taking orders</button> : <p className={'rounded-xl p-3 font-semibold ' + (pending ? 'animate-pulse bg-[var(--brand)] text-white' : 'bg-green-100 text-green-800')}>{pending ? 'New order! Tap Accept to stop the alarm' : 'Listening for orders'}</p>}
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"><h2 className="text-xl font-bold">Orders</h2>
        {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).map(o => (
          <div key={o.id} className="space-y-1 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <p className="font-semibold">{o.customer_name} · <a className="underline" href={'tel:' + o.phone}>{o.phone}</a> · Rs {o.total}</p>
            <p className="text-sm text-stone-600">{o.address}{o.note && ' — ' + o.note}</p>
            <p className="text-sm">{o.items.map((l: any) => `${l.name} × ${l.qty}`).join(', ')}</p>
            <div className="flex gap-2 pt-2"><button onClick={() => setStatus(o.id, NEXT[o.status])} className="min-h-11 rounded-xl bg-[var(--brand)] px-4 py-2 font-semibold text-white">{{ placed: 'Accept', accepted: 'Start preparing', preparing: 'Out for delivery', out_for_delivery: 'Delivered' }[o.status as string]}</button><button onClick={() => setStatus(o.id, 'cancelled')} className="min-h-11 rounded-xl bg-stone-100 px-4 py-2">Cancel</button></div>
          </div>))}</section>
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"><h2 className="text-xl font-bold">{form.id ? 'Edit item' : 'Add item'}</h2>
        <input className={inp} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><input className={inp} dir="rtl" placeholder="اردو نام" value={form.name_ur || ''} onChange={e => setForm({ ...form, name_ur: e.target.value })} />
        <textarea className={inp} placeholder="Description" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
        <div className="flex gap-2"><input className={inp} type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /><select className={inp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{['kg', 'dozen', 'piece'].map(u => <option key={u}>{u}</option>)}</select></div>
        <div className="flex gap-2"><select className={inp} value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}>{Object.entries(TAGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>{form.tag === 'on_sale' && <input className={inp} type="number" placeholder="Sale price" value={form.sale_price || ''} onChange={e => setForm({ ...form, sale_price: e.target.value })} />}</div>
        <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />{form.image_url && <img src={form.image_url} className="h-24 rounded-lg" />}
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })} />Available today</label>
        <button onClick={save} disabled={!form.name || !form.price} className="w-full rounded-xl bg-[var(--brand)] py-3 font-semibold text-white disabled:opacity-40">Save item</button></section>
      <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Items</h2>{sel.length > 0 && <button onClick={share} className="min-h-11 rounded-xl bg-green-700 px-4 py-2 font-semibold text-white">Share {sel.length}</button>}</div>
        {items.map(i => <div key={i.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-2"><input type="checkbox" checked={sel.includes(i.id)} onChange={() => setSel(s => s.includes(i.id) ? s.filter(x => x !== i.id) : [...s, i.id])} />{i.image_url && <img src={i.image_url} className="h-12 w-12 rounded-lg object-cover" />}<span className="flex-1">{i.name} · Rs {i.price}/{i.unit} · {TAGS[i.tag]}{!i.available && ' · hidden'}</span><button className="underline" onClick={() => { setForm(i); scrollTo(0, 400) }}>Edit</button></div>)}</section>
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"><h2 className="text-xl font-bold">Shop branding</h2>
        <input className={inp} placeholder="Shop name" value={shop.name} onChange={e => { setShop({ ...shop, name: e.target.value }); setSaved(false) }} />
        <input className={inp} placeholder="WhatsApp number (03xx xxxxxxx)" value={shop.whatsapp || ''} onChange={e => { setShop({ ...shop, whatsapp: e.target.value }); setSaved(false) }} />
        <label className="flex items-center gap-3">Brand color <input type="color" value={shop.color} onChange={e => { setShop({ ...shop, color: e.target.value }); setSaved(false) }} className="h-10 w-16" /></label>
        <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />{shop.logo_url && <img src={shop.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" />}
        <button onClick={saveShop} className="w-full rounded-xl bg-[var(--brand)] py-3 font-semibold text-white">{saved ? 'Saved ✓' : 'Save branding'}</button></section>
    </main>)
}
