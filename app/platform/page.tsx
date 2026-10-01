'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
const blank = { name: '', slug: '', email: '', password: '', whatsapp: '', plan: 'basic', fee: '', trialDays: '14' }
export default function Platform() {
  const [cr, setCr] = useState({ email: '', password: '' }), [ok, setOk] = useState<boolean | null>(null), [shops, setShops] = useState<any[]>([]), [f, setF] = useState(blank), [msg, setMsg] = useState('')
  const inp = 'min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base'
  const load = async () => setShops((await sb.from('shops').select('*').order('created_at', { ascending: false })).data || [])
  const check = async () => { const { data } = await sb.auth.getUser(); if (!data.user) return; const a = await sb.from('platform_admins').select('user_id').maybeSingle(); setOk(!!a.data); if (a.data) load() }
  useEffect(() => { check() }, [])
  const login = async () => { const { error } = await sb.auth.signInWithPassword(cr); if (error) setMsg(error.message); else check() }
  const upd = async (id: string, patch: object) => { await sb.from('shops').update(patch).eq('id', id); load() }
  const paid = (s: any) => { const base = s.paid_until && new Date(s.paid_until) > new Date() ? new Date(s.paid_until) : new Date(); base.setDate(base.getDate() + 30); upd(s.id, { paid_until: base.toISOString().slice(0, 10), status: 'active' }) }
  const create = async () => {
    setMsg('Creating…'); const { data } = await sb.auth.getSession()
    const r = await fetch('/api/platform/shops', { method: 'POST', headers: { Authorization: 'Bearer ' + data.session?.access_token }, body: JSON.stringify(f) }); const j = await r.json()
    if (j.ok) { setMsg('Shop created: /s/' + j.slug); setF(blank); load() } else setMsg(j.error)
  }
  if (!ok) return (
    <main className="mx-auto w-full max-w-sm space-y-3 p-6"><h1 className="text-2xl font-bold">Platform admin</h1>
      {ok === false && <p className="text-red-700">This account is not a platform admin.</p>}
      <input className={inp} placeholder="Email" onChange={e => setCr({ ...cr, email: e.target.value })} /><input className={inp} type="password" placeholder="Password" onChange={e => setCr({ ...cr, password: e.target.value })} />
      <button onClick={login} className="min-h-12 w-full rounded-xl bg-stone-900 font-semibold text-white">Log in</button><p className="text-red-700">{msg}</p></main>)
  const card = 'space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200'
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-4">
      <h1 className="text-2xl font-bold">All shops ({shops.length})</h1>
      <section className={card}><h2 className="text-lg font-bold">Add shop</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {([['name', 'Shop name'], ['slug', 'Link name (e.g. fresh-fruits)'], ['email', 'Owner email'], ['password', 'Owner password'], ['whatsapp', 'WhatsApp number'], ['plan', 'Plan name'], ['fee', 'Monthly fee (Rs)'], ['trialDays', 'Trial days']] as const).map(([k, l]) => <label key={k} className="text-sm font-medium text-stone-700">{l}<input className={inp} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}
        </div>
        <button onClick={create} disabled={!f.name || !f.slug || !f.email || f.password.length < 6} className="min-h-12 w-full rounded-xl bg-stone-900 font-semibold text-white disabled:opacity-40">Create shop</button><p className="text-sm text-stone-700">{msg}</p></section>
      {shops.map(s => { const late = s.paid_until && new Date(s.paid_until) < new Date(); return (
        <section key={s.id} className={card}>
          <div className="flex items-center justify-between gap-2"><h2 className="font-bold">{s.name}</h2><select aria-label="Status" className="min-h-11 rounded-xl border border-stone-300 px-2" value={s.status} onChange={e => upd(s.id, { status: e.target.value })}>{['trial', 'active', 'suspended'].map(x => <option key={x}>{x}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm">Plan<input className={inp} defaultValue={s.plan} onBlur={e => upd(s.id, { plan: e.target.value })} /></label><label className="text-sm">Fee Rs/month<input className={inp} type="number" defaultValue={s.monthly_fee} onBlur={e => upd(s.id, { monthly_fee: +e.target.value })} /></label></div>
          <p className={'text-sm ' + (late ? 'font-semibold text-red-700' : 'text-stone-700')}>{late ? 'Overdue since ' : 'Paid until '}{s.paid_until || 'not set'}</p>
          <div className="flex flex-wrap gap-2"><button onClick={() => paid(s)} className="min-h-11 rounded-xl bg-green-700 px-4 font-semibold text-white">Mark paid +30 days</button><a href={'/s/' + s.slug} className="flex min-h-11 items-center rounded-xl bg-stone-100 px-4">Storefront</a><a href={'/s/' + s.slug + '/admin'} className="flex min-h-11 items-center rounded-xl bg-stone-100 px-4">Owner panel</a></div>
        </section>) })}
    </main>)
}
