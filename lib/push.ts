import { sb } from './supabase'
export const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const toKey = (s: string) => { const b = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)) }
export const deviceLabel = () => { const u = navigator.userAgent; return `${/iPhone|iPad/.test(u) ? 'iPhone' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'Device'} · ${/Edg\//.test(u) ? 'Edge' : /Chrome\//.test(u) ? 'Chrome' : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'Browser'}` }
export async function currentSub() { if (!pushSupported()) return null; const reg = await navigator.serviceWorker.getRegistration('/sw.js'); return (await reg?.pushManager.getSubscription()) || null }
export async function enablePush() {
  if (!VAPID) throw new Error('Notifications are not set up on the server yet.')
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser or phone settings, then try again.')
  const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID) })
  const j = sub.toJSON()
  const { error } = await sb.from('push_subs').upsert({ endpoint: j.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth, label: deviceLabel(), enabled: true, last_seen: new Date().toISOString() }, { onConflict: 'endpoint' })
  if (error) throw error
}
export async function disablePush() { const sub = await currentSub(); if (sub) { await sb.from('push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe() } }
