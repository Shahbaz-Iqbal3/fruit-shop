'use client'
import { useEffect, useState } from 'react'
import { buildCard } from '@/lib/sharecard'
import { Icon, I } from '@/lib/icons'
const disp = 'font-[family-name:var(--font-display)]'
const sec = 'min-h-12 rounded-xl bg-stone-100 px-3 text-sm font-semibold active:scale-95'
export default function ShareSheet({ items, shop, onClose }: { items: any[]; shop: any; onClose: () => void }) {
  const link = items.length ? `${location.origin}/?item=${items.map(i => i.id).join(',')}` : location.origin
  const price = (i: any) => (i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price)
  const [text, setText] = useState(items.length ? `${items.length > 1 ? `Fresh today at ${shop.name}` : shop.name}\n\n${items.map(i => `${i.name} – Rs ${price(i)}/${i.unit}`).join('\n')}\n\nOrder here: ${link}` : `Order fresh fruit from ${shop.name}: ${link}`)
  const [blob, setBlob] = useState<Blob | null>(null), [url, setUrl] = useState(''), [err, setErr] = useState(''), [note, setNote] = useState('')
  useEffect(() => {
    let live = true, u = ''
    buildCard(shop, items, link).then(b => { if (live) { setBlob(b); u = URL.createObjectURL(b); setUrl(u) } }).catch(() => live && setErr('Could not make the picture. You can still share the text and link.'))
    return () => { live = false; if (u) URL.revokeObjectURL(u) }
  }, [])
  const canNative = typeof navigator !== 'undefined' && !!navigator.share
  const share = async () => {
    try {
      const file = blob ? new File([blob], 'fruit.jpg', { type: 'image/jpeg' }) : null
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text }); else await navigator.share({ text })
    } catch {}
  }
  const copy = async (t: string, m: string) => { try { await navigator.clipboard.writeText(t); setNote(m) } catch { setNote('Copy failed') } }
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/50 md:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Share" onClick={e => e.stopPropagation()} style={{ animation: 'sheet 250ms ease-out' }} className="mx-auto max-h-[92dvh] w-full max-w-lg space-y-3 overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl">
        <div className="flex items-center justify-between"><h2 className={disp + ' text-2xl font-bold'}>{items.length ? `Share ${items.length} ${items.length === 1 ? 'fruit' : 'fruits'}` : 'Share your shop'}</h2><button aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"><Icon d={I.x} /></button></div>
        <div className="mx-auto aspect-[4/5] max-h-[46dvh] overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">{url ? <img src={url} alt="Share picture preview" className="h-full w-full object-contain" /> : <div className={'flex h-full items-center justify-center text-sm text-stone-600 ' + (err ? '' : 'animate-pulse')}>{err || 'Making your picture…'}</div>}</div>
        <label className="block text-sm font-semibold text-stone-700">Message<textarea value={text} onChange={e => setText(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base font-normal" /></label>
        {canNative && <button onClick={share} disabled={!blob && !err} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-lg font-bold text-white disabled:opacity-50"><Icon d={I.share} />Share picture and message</button>}
        <div className="grid grid-cols-3 gap-2">
          <a href={'https://wa.me/?text=' + encodeURIComponent(text)} target="_blank" rel="noreferrer" className={sec + ' flex items-center justify-center bg-green-100 text-green-900'}>WhatsApp</a>
          <a href={url || undefined} download="fruit-share.jpg" aria-disabled={!url} className={sec + ' flex items-center justify-center'}>Save picture</a>
          <button onClick={() => copy(link, 'Link copied')} className={sec}>Copy link</button>
        </div>
        {note && <p role="status" className="text-center text-sm text-stone-700">{note}</p>}
        <p className="text-xs text-stone-600">WhatsApp opens with your message. Tap “Save picture” first if you want to attach the picture there.</p>
      </div>
    </div>)
}
