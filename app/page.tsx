'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sb, configured, TAGS } from '@/lib/supabase'
export default function Shop() {
  const r = useRouter()
  const [items, setItems] = useState<any[]>([]), [cart, setCart] = useState<Record<string, number>>({}), [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', address: '', note: '' }), [busy, setBusy] = useState(false)
  useEffect(() => { if (!configured) { r.replace('/setup'); return } sb.from('items').select('*').eq('available', true).order('created_at', { ascending: false }).then(x => setItems(x.data || [])) }, [r])
  const price = (i: any) => (i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price)
  const lines = items.filter(i => cart[i.id]).map(i => ({ id: i.id, name: i.name, unit: i.unit, price: price(i), qty: cart[i.id] }))
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0), count = lines.reduce((s, l) => s + l.qty, 0)
  const add = (id: string, d: number) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }))
  const place = async () => {
    setBusy(true)
    const { data } = await sb.rpc('place_order', { p_name: f.name, p_phone: f.phone, p_address: f.address, p_note: f.note, p_items: lines, p_total: total })
    if (data) r.push('/order/' + data); else setBusy(false)
  }
  return (
    <main className="mx-auto max-w-2xl pb-28">
      <h1 className="px-4 pt-6 text-3xl font-bold text-stone-900">Fresh fruit, today</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        {items.map(i => (
          <div key={i.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <a href={'/item/' + i.id}>{i.image_url && <img src={i.image_url} alt={i.name} className="aspect-square w-full object-cover" />}</a>
            <div className="space-y-1 p-3">
              <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + (i.tag === 'on_sale' ? 'bg-rose-100 text-rose-800' : i.tag === 'fresh' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>{TAGS[i.tag]}</span>
              <p className="font-semibold text-stone-900">{i.name}</p>
              <p className="text-sm text-stone-600">Rs {price(i)} / {i.unit} {i.tag === 'on_sale' && i.sale_price && <s className="text-stone-400">{i.price}</s>}</p>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => add(i.id, -1)} className="h-9 w-9 rounded-full bg-stone-100 text-lg active:scale-90 transition">−</button>
                <span className="w-4 text-center">{cart[i.id] || 0}</span>
                <button onClick={() => add(i.id, 1)} className="h-9 w-9 rounded-full bg-rose-700 text-lg text-white active:scale-90 transition">+</button>
              </div>
            </div>
          </div>))}
      </div>
      {count > 0 && <button onClick={() => setOpen(true)} className="fixed inset-x-4 bottom-4 mx-auto max-w-2xl rounded-2xl bg-rose-700 py-4 font-semibold text-white shadow-lg">View order · {count} items · Rs {total}</button>}
      {open && (
        <div className="fixed inset-0 z-10 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="mx-auto w-full max-w-2xl space-y-3 rounded-t-3xl bg-white p-5">
            {lines.map(l => <p key={l.id} className="flex justify-between text-sm"><span>{l.name} × {l.qty} {l.unit}</span><span>Rs {l.price * l.qty}</span></p>)}
            {(['name', 'phone', 'address', 'note'] as const).map(k => <input key={k} placeholder={{ name: 'Your name', phone: 'Phone', address: 'Delivery address', note: 'Note (optional)' }[k]} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} className="w-full rounded-lg border border-stone-300 px-3 py-2" />)}
            <button onClick={place} disabled={busy || !f.name || !f.phone || !f.address} className="w-full rounded-xl bg-rose-700 py-3 font-semibold text-white disabled:opacity-40">Place order · Rs {total} · Cash on delivery</button>
          </div>
        </div>)}
    </main>)
}
