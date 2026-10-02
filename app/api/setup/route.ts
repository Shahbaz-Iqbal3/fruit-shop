import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createECDH } from 'crypto'
const API = 'https://api.supabase.com/v1'
export async function POST(req: Request) {
  const { pat, url: rawUrl, email, password, shopName } = await req.json()
  const h = { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' }
  const j = async (r: Response) => { const t = await r.text(); if (!r.ok) throw new Error(t); return t ? JSON.parse(t) : {} }
  try {
    const ref = new URL(rawUrl).hostname.split('.')[0]
    if (!/^[a-z0-9]+$/.test(ref) || !new URL(rawUrl).hostname.endsWith('.supabase.co')) throw new Error('That does not look like a Supabase project URL (https://xxxx.supabase.co).')
    const sql = async (query: string) => j(await fetch(`${API}/projects/${ref}/database/query`, { method: 'POST', headers: h, body: JSON.stringify({ query }) }))
    const keys = await j(await fetch(`${API}/projects/${ref}/api-keys`, { headers: h }))
    await sql(fs.readFileSync(path.join(process.cwd(), 'supabase/schema.sql'), 'utf8'))
    await sql(`update shop_settings set name='${(shopName || 'My Fruit Shop').replace(/'/g, "''")}' where id=1`)
    const anon = keys.find((k: any) => k.name === 'anon').api_key
    const service = keys.find((k: any) => k.name === 'service_role').api_key
    const url = `https://${ref}.supabase.co`
    const ecdh = createECDH('prime256v1'); ecdh.generateKeys()
    const vapid = ecdh.getPublicKey().toString('base64url')
    let fn = false
    try {
      await j(await fetch(`${API}/projects/${ref}/secrets`, { method: 'POST', headers: h, body: JSON.stringify([{ name: 'VAPID_PUBLIC_KEY', value: vapid }, { name: 'VAPID_PRIVATE_KEY', value: ecdh.getPrivateKey().toString('base64url') }, { name: 'VAPID_SUBJECT', value: `mailto:${email}` }]) }))
      await sql(`insert into app_config(key,value) values('notify_url','${url}/functions/v1/notify-order') on conflict (key) do update set value = excluded.value`)
      await j(await fetch(`${API}/projects/${ref}/functions`, { method: 'POST', headers: h, body: JSON.stringify({ slug: 'notify-order', name: 'notify-order', verify_jwt: false, body: fs.readFileSync(path.join(process.cwd(), 'supabase/functions/notify-order/index.ts'), 'utf8') }) }))
      fn = true
    } catch {}
    const u = await j(await fetch(`${url}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true }) }))
    await sql(`insert into owners(user_id) values('${u.id}')`)
    const env = `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid}\n`
    let saved = false
    try { fs.writeFileSync(path.join(process.cwd(), '.env.local'), env); saved = true } catch {}
    return NextResponse.json({ ok: true, fn, saved, env: saved ? undefined : env })
  } catch (e: any) { return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 400 }) }
}
