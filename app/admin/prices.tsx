'use client'
import { useState } from 'react'
import { sb } from '@/lib/supabase'
import { Icon, I } from '@/lib/icons'
const disp = 'font-[family-name:var(--font-display)]'
type Draft = { price: string; sale: string }
export default function PriceEditor({ items, cats, onClose, onSaved }: { items: any[]; cats: any[]; onClose: () => void; onSaved: () => void }) {
  const orig = (i: any): Draft => ({ price: String(i.price), sale: i.sale_price == null ? '' : String(i.sale_price) })
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(items.map(i => [i.id, orig(i)])))
  const [q, setQ] = useState(''), [cat, setCat] = useState('all'), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const shown = items.filter(i => (cat === 'all' || (cat === 'none' ? !i.category_id : i.category_id === cat)) && (i.name + (i.name_ur || '')).toLowerCase().includes(q.toLowerCase()))
  const changed = (i: any) => drafts[i.id].price !== orig(i).price || (i.tag === 'on_sale' && drafts[i.id].sale !== orig(i).sale)
  const bad = (i: any) => { const d = drafts[i.id]; return !(+d.price > 0) || (i.tag === 'on_sale' && d.sale !== '' && !(+d.sale > 0 && +d.sale < +d.price)) }
  const edits = items.filter(changed), invalid = edits.filter(bad)
  const set = (id: string, p: Partial<Draft>) => setDrafts(d => ({ ...d, [id]: { ...d[id], ...p } }))
  const bump = (pct: number) => setDrafts(d => { const n = { ...d }; const f = (v: string) => (v === '' ? v : String(Math.max(1, Math.round(+v * (1 + pct / 100))))); shown.forEach(i => { n[i.id] = { price: f(n[i.id].price), sale: i.tag === 'on_sale' ? f(n[i.id].sale) : n[i.id].sale } }); return n })
  const reset = () => setDrafts(d => { const n = { ...d }; shown.forEach(i => { n[i.id] = orig(i) }); return n })
  const save = async () => {
    setBusy(true); setErr('')
    const res = await Promise.all(edits.map(i => sb.from('items').update({ price: +drafts[i.id].price, sale_price: i.tag === 'on_sale' ? (drafts[i.id].sale === '' ? null : +drafts[i.id].sale) : i.sale_price }).eq('id', i.id)))
    if (res.some(r => r.error)) { setErr('Some prices could not be saved. Please try again.'); setBusy(false); return }
    onSaved()
  }
  const box = (label: string, v: string, on: (v: string) => void, wrong: boolean) => (
    <label className="flex items-center gap-1.5"><span className="text-sm text-stone-600">Rs</span>
      <input aria-label={label} type="number" inputMode="decimal" step="any" value={v} onFocus={e => e.target.select()} onChange={e => on(e.target.value)} aria-invalid={wrong} className={'min-h-12 w-28 rounded-xl border bg-white px-3 text-right text-lg font-bold ' + (wrong ? 'border-red-600' : 'border-stone-300')} /></label>)
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/50 md:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Update prices" onClick={e => e.stopPropagation()} style={{ animation: 'sheet 250ms ease-out' }} className="mx-auto max-h-[94dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 md:rounded-3xl">
        <div className="sticky top-0 z-10 -mx-5 -mt-5 space-y-3 bg-white/95 px-5 pb-3 pt-5 backdrop-blur">
          <div className="flex items-center justify-between"><h2 className={disp + ' text-2xl font-bold'}>Update prices</h2><button aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"><Icon d={I.x} /></button></div>
          <div className="flex gap-2"><input type="search" aria-label="Search fruit" placeholder="Search fruit" value={q} onChange={e => setQ(e.target.value)} className="min-h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-base" />
            {cats.length > 0 && <select aria-label="Category" value={cat} onChange={e => setCat(e.target.value)} className="min-h-12 max-w-[40%] rounded-xl border border-stone-300 bg-white px-2 text-base"><option value="all">All</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="none">No category</option></select>}</div>
          <div className="flex items-center gap-2 p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><span className="shrink-0 text-sm font-semibold text-stone-700">Change all shown</span>
            {[-10, -5, 5, 10].map(p => <button key={p} onClick={() => bump(p)} className="min-h-8 h-8 shrink-0 rounded-full bg-stone-100 px-5 text-sm font-bold ring-1 ring-stone-300">{p > 0 ? '+' : '−'}{Math.abs(p)}%</button>)}
            <button onClick={reset} className="min-h-8 h-8 shrink-0 rounded-full px-3 text-sm font-semibold text-stone-700 underline">Undo</button></div>
        </div>
        <ul className="mt-1 space-y-2">
          {shown.map(i => { const d = drafts[i.id], sale = i.tag === 'on_sale'; return (
            <li key={i.id} className={'space-y-2 rounded-2xl p-2.5 ring-1 transition-colors ' + (changed(i) ? 'bg-amber-50 ring-amber-300' : 'bg-white ring-stone-200')}>
              <div className="flex items-center gap-3">{i.image_url ? <img src={i.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-xl bg-stone-100" />}
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{i.name}</p><p className="text-sm text-stone-600">per {i.unit}{changed(i) && <span className="ml-1.5 font-semibold text-amber-800">was Rs {i.price}</span>}</p></div>
                {box('Price for ' + i.name, d.price, v => set(i.id, { price: v }), !(+d.price > 0))}</div>
              {sale && <div className="flex items-center justify-between pl-[60px]"><span className="text-sm font-semibold text-rose-800">Sale price</span>{box('Sale price for ' + i.name, d.sale, v => set(i.id, { sale: v }), d.sale !== '' && !(+d.sale > 0 && +d.sale < +d.price))}</div>}
            </li>) })}
          {shown.length === 0 && <li className="py-8 text-center text-stone-600">No fruit matches.</li>}
        </ul>
        <div className="sticky bottom-0 -mx-5 -mb-5 mt-3 space-y-2 bg-white/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          {invalid.length > 0 && <p role="alert" className="text-sm text-red-700">Check {invalid.length} price{invalid.length > 1 ? 's' : ''} in red. Prices must be above 0, and a sale price must be lower than the price.</p>}
          {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
          <button onClick={save} disabled={busy || !edits.length || invalid.length > 0} className="min-h-14 w-full rounded-2xl bg-[var(--brand)] text-lg font-bold text-white disabled:opacity-40">{busy ? 'Saving…' : edits.length ? `Save ${edits.length} ${edits.length === 1 ? 'change' : 'changes'}` : 'No changes yet'}</button>
        </div>
      </div>
    </div>)
}
