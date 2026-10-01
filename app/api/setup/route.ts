import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
const API = 'https://api.supabase.com/v1'
export const maxDuration = 300
export async function POST(req: Request) {
  const { pat, email, password, shopName } = await req.json()
  const h = { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' }
  const j = async (r: Response) => { const t = await r.text(); if (!r.ok) throw new Error(t); return t ? JSON.parse(t) : {} }
  const sql = async (ref: string, query: string) => j(await fetch(`${API}/projects/${ref}/database/query`, { method: 'POST', headers: h, body: JSON.stringify({ query }) }))
  try {
    const orgs = await j(await fetch(`${API}/organizations`, { headers: h }))
    const org = orgs[0].slug ?? orgs[0].id
    const p = await j(await fetch(`${API}/projects`, { method: 'POST', headers: h, body: JSON.stringify({ name: shopName || 'fruit-shop', organization_id: org, organization_slug: org, db_pass: crypto.randomUUID() + 'Aa1', region: 'ap-south-1' }) }))
    const ref = p.id
    for (let i = 0; i < 60; i++) { const s = await j(await fetch(`${API}/projects/${ref}`, { headers: h })); if (s.status === 'ACTIVE_HEALTHY') break; await new Promise(r => setTimeout(r, 5000)) }
    await sql(ref, fs.readFileSync(path.join(process.cwd(), 'supabase/schema.sql'), 'utf8'))
    await sql(ref, `update shop_settings set name='${(shopName || 'My Fruit Shop').replace(/'/g, "''")}' where id=1`)
    const keys = await j(await fetch(`${API}/projects/${ref}/api-keys`, { headers: h }))
    const anon = keys.find((k: any) => k.name === 'anon').api_key
    const service = keys.find((k: any) => k.name === 'service_role').api_key
    const url = `https://${ref}.supabase.co`
    const u = await j(await fetch(`${url}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true }) }))
    await sql(ref, `insert into owners(user_id) values('${u.id}')`)
    const env = `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}\n`
    let saved = false
    try { fs.writeFileSync(path.join(process.cwd(), '.env.local'), env); saved = true } catch {}
    return NextResponse.json({ ok: true, saved, env: saved ? undefined : env })
  } catch (e: any) { return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 400 }) }
}
