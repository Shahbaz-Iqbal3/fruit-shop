'use client'
import { useShop } from './shop'
import { Icon, I } from './icons'
const links = [['shop', '/', 'Shop', I.bag], ['track', '/track', 'My orders', I.orders]] as const
export default function CustomerNav({ active }: { active: 'shop' | 'track' }) {
  const [shop] = useShop()
  return (<>
    <header className="sticky top-0 z-10 hidden h-16 items-center gap-6 border-b border-stone-200 bg-white/90 px-6 backdrop-blur md:flex">
      {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)] font-bold text-white">{shop.name[0]}</span>}
      <a href="/" className="font-[family-name:var(--font-display)] text-xl font-bold">{shop.name}</a>
      <nav aria-label="Main" className="ml-auto flex gap-2">{links.map(([k, h, l]) => <a key={k} href={h} aria-current={active === k ? 'page' : undefined} className={'flex min-h-11 items-center gap-2 rounded-full px-5 font-semibold ' + (active === k ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-stone-700 hover:bg-stone-100')}><Icon d={I[k === 'shop' ? 'bag' : 'orders']} className="h-5 w-5" />{l}</a>)}</nav>
    </header>
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"><ul className="flex">{links.map(([k, h, l, d]) => <li key={k} className="flex-1"><a href={h} aria-current={active === k ? 'page' : undefined} className={'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold ' + (active === k ? 'text-[var(--brand)]' : 'text-stone-600')}><Icon d={d} className="h-6 w-6" />{l}</a></li>)}</ul></nav>
  </>)
}
