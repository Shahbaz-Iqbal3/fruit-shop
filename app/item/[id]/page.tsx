import { sb, TAGS } from '@/lib/supabase'
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
  if (!i) return <p className="p-6">Item not found.</p>
  return (
    <main className="mx-auto max-w-md space-y-3 pb-10">
      {i.image_url && <img src={i.image_url} alt={i.name} className="w-full" />}
      <div className="space-y-2 px-5">
        <h1 className="text-2xl font-bold">{i.name}</h1>
        <p className="text-stone-600">{TAGS[i.tag]} · Rs {i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price} / {i.unit}</p>
        <p>{i.description}</p>
        <a href="/" className="mt-3 block rounded-xl bg-rose-700 py-3 text-center font-semibold text-white">Order from the shop</a>
      </div>
    </main>)
}
