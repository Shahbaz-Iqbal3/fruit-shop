import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export async function POST(req: Request) {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  const { data: u } = await svc.auth.getUser(token)
  const { data: adm } = u.user ? await svc.from('platform_admins').select('user_id').eq('user_id', u.user.id).maybeSingle() : { data: null }
  if (!adm) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const b = await req.json()
  const { data: o, error } = await svc.auth.admin.createUser({ email: b.email, password: b.password, email_confirm: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const slug = String(b.slug).toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const paid = new Date(Date.now() + (+b.trialDays || 14) * 864e5).toISOString().slice(0, 10)
  const { error: e2 } = await svc.from('shops').insert({ slug, name: b.name, whatsapp: b.whatsapp, owner_id: o.user.id, plan: b.plan, monthly_fee: +b.fee || 0, status: 'trial', paid_until: paid })
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 })
  return NextResponse.json({ ok: true, slug })
}
