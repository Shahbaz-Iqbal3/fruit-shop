import { sb, TAGS } from '@/lib/supabase'
import { Icon, I } from '@/lib/icons'
type P = { params: Promise<{ id: string }> }
const get = async (p: P['params']) => (await sb.from('items').select('*').eq('id', (await p).id).single()).data
export async function generateMetadata({ params }: P) {
  const i = await get(params)
  if (!i) return {}
  const t = `${i.name} · Rs ${i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price}/${i.unit}`
  return { title: t, description: i.description, openGraph: { title: t, description: i.description, images: i.image_url ? [i.image_url] : [] } }
}
export default async function Item({ params }: P) {
  const i = await get(params)
  if (!i) return <p className="p-8 text-center text-stone-700">Item not found.</p>
  const sale = i.tag === 'on_sale' && i.sale_price
  return (
    <main className="mx-auto w-full max-w-md pb-28">
      <div className="relative aspect-square bg-stone-100">
        {i.image_url && <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />}
        <a href="/" aria-label="Back to shop" className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow"><Icon d={I.back} /></a>
      </div>
      <div className="relative -mt-6 space-y-3 rounded-t-3xl bg-[#fbf8f3] px-5 pt-6">
        <span className="inline-block rounded-full bg-[var(--brand-soft)] px-3 py-1 text-sm font-bold text-[var(--brand)]">{TAGS[i.tag]}</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight">{i.name}</h1>
        {i.name_ur && <p dir="rtl" className="text-lg text-stone-700">{i.name_ur}</p>}
        <p><span className="text-3xl font-bold">Rs {sale ? i.sale_price : i.price}</span> <span className="text-stone-600">/ {i.unit}</span>{sale && <s className="ml-2 text-stone-500">Rs {i.price}</s>}</p>
        {i.description && <p className="text-stone-700">{i.description}</p>}
      </div>
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><a href="/" className="mx-auto flex min-h-14 max-w-md items-center justify-center rounded-2xl bg-[var(--brand)] text-lg font-bold text-white shadow-xl">Order from the shop</a></div>
    </main>)
}
