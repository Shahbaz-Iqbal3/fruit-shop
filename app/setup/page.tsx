'use client'
import { useState } from 'react'
export default function Setup() {
  const [f, setF] = useState({ url: '', pat: '', shopName: '', email: '', password: '' })
  const [st, setSt] = useState<any>(null), [busy, setBusy] = useState(false)
  const go = async () => { setBusy(true); const r = await fetch('/api/setup', { method: 'POST', body: JSON.stringify(f) }); setSt(await r.json()); setBusy(false) }
  const inp = (k: keyof typeof f, label: string, type = 'text') => (
    <label className="block text-sm font-medium text-stone-700">{label}
      <input type={type} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base" /></label>)
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold text-stone-900">Set up your shop</h1>
      <p className="text-sm text-stone-600">Create an empty Supabase project, then paste its URL and an access token (Account → Access Tokens). We only touch that one project: tables, photo storage, live orders and your owner login. The token is never saved. Delete it afterwards.</p>
      {inp('url', 'Project URL (https://xxxx.supabase.co)')}{inp('pat', 'Access token', 'password')}{inp('shopName', 'Shop name')}{inp('email', 'Owner email', 'email')}{inp('password', 'Owner password', 'password')}
      <button onClick={go} disabled={busy || !f.pat || !f.url || !f.email || f.password.length < 6} className="w-full rounded-xl bg-[var(--brand)] py-3 font-semibold text-white disabled:opacity-40">{busy ? 'Setting up…' : 'Create my shop'}</button>
      {st?.ok === false && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 break-words">{st.error}</p>}
      {st?.ok && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Done. {st.saved ? 'Restart the app (npm run dev), then open /admin.' : <>Add these to your host's environment variables, then redeploy:<pre className="mt-2 whitespace-pre-wrap break-all">{st.env}</pre></>}</div>}
    </main>)
}
