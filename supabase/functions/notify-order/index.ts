import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:owner@example.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
  const body = await req.json().catch(() => ({}))
  let subs: any[] = [], order: any = null
  if (body.test) {
    const { data: u } = await db.auth.getUser((req.headers.get('authorization') || '').replace('Bearer ', ''))
    if (!u.user) return json({ error: 'Sign in first' }, 401)
    let q = db.from('push_subs').select('*').eq('user_id', u.user.id)
    if (body.endpoint) q = q.eq('endpoint', body.endpoint)
    subs = (await q).data || []
  } else if (body.order_id) {
    const { data } = await db.from('orders').update({ notified_at: new Date().toISOString() }).eq('id', body.order_id).is('notified_at', null).select('*').maybeSingle()
    if (!data) return json({ skipped: true })
    order = data
    subs = (await db.from('push_subs').select('*').eq('enabled', true)).data || []
  } else return json({ error: 'Bad request' }, 400)
  const message = (s: any) => order
    ? { title: `New order · Rs ${order.total}`, body: s.show_details ? `${order.customer_name}: ${order.items.map((l: any) => `${l.name} × ${l.qty}`).join(', ')}` : 'Open the app to see it.', tag: 'order-' + order.id, url: '/admin' }
    : { title: 'Test notification', body: 'Notifications are working on this phone.', tag: 'test', url: '/admin' }
  const dead: string[] = []
  await Promise.all(subs.map(async s => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(message(s)), { TTL: 3600, urgency: 'high' }) } catch (e: any) { if ([404, 410].includes(e.statusCode)) dead.push(s.id) }
  }))
  if (dead.length) await db.from('push_subs').delete().in('id', dead)
  return json({ sent: subs.length - dead.length, removed: dead.length })
})
