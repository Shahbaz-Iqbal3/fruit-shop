'use client'
import { useCallback, useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import { VAPID, pushSupported, currentSub, enablePush, disablePush } from '@/lib/push'
import { Icon, I } from '@/lib/icons'
const card = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200'
const disp = 'font-[family-name:var(--font-display)]'
const sw = (on: boolean, label: string, set: () => void) => <button role="switch" aria-checked={on} aria-label={label} onClick={set} className="flex min-h-11 min-w-14 shrink-0 items-center justify-center"><span className={'flex h-8 w-14 items-center rounded-full p-1 transition-colors ' + (on ? 'bg-green-700' : 'bg-stone-300')}><span className={'h-6 w-6 rounded-full bg-white shadow transition-transform ' + (on ? 'translate-x-6' : '')} /></span></button>
export default function Notifications() {
  const [subs, setSubs] = useState<any[]>([]), [here, setHere] = useState<string | null>(null), [perm, setPerm] = useState('default'), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const ok = pushSupported(), ios = /iPhone|iPad/.test(navigator.userAgent), installed = window.matchMedia('(display-mode: standalone)').matches || !!(navigator as any).standalone
  const load = useCallback(async () => { setSubs((await sb.from('push_subs').select('*').order('created_at')).data || []); setHere((await currentSub())?.endpoint || null); if (pushSupported()) setPerm(Notification.permission) }, [])
  useEffect(() => { load() }, [load])
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setMsg(''); try { await fn() } catch (e: any) { setMsg(e.message || 'Something went wrong.') } await load(); setBusy(false) }
  const test = (endpoint?: string) => run(async () => { const { data, error } = await sb.functions.invoke('notify-order', { body: { test: true, endpoint } }); setMsg(error ? 'Could not reach the notification service. Make sure the notify-order function is deployed.' : data?.sent ? `Test sent to ${data.sent} device${data.sent > 1 ? 's' : ''}. Check your phone.` : 'No active device to send to. Turn notifications on first.') })
  const patch = (s: any, p: object) => run(async () => { await sb.from('push_subs').update(p).eq('id', s.id) })
  const remove = (s: any) => confirm(`Remove ${s.label || 'this device'}? It will stop getting order alerts.`) && run(async () => { if (s.endpoint === here) await disablePush(); else await sb.from('push_subs').delete().eq('id', s.id) })
  return (
    <div className="space-y-3">
      {!VAPID && <p className={card + ' text-sm text-amber-900'}>Phone alerts are not set up on the server yet. Follow the “Phone notifications” steps in the README (database script, notify-order function, secrets), then redeploy.</p>}
      <section className={card + ' space-y-3'}>
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><Icon d={I.bell} className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1"><h2 className={disp + ' text-xl font-bold'}>New order alerts</h2><p className="text-sm text-stone-600">{!ok ? 'This browser cannot receive alerts.' : perm === 'denied' ? 'Blocked in browser settings.' : here ? 'On for this phone.' : 'Off for this phone.'}</p></div>
          {ok && sw(!!here, 'Alerts on this phone', () => run(() => (here ? disablePush() : enablePush())))}</div>
        {ios && !installed && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">On iPhone, tap Share, then “Add to Home Screen”, and open the app from there. Alerts only work from the installed app.</p>}
        {perm === 'denied' && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">Alerts are blocked. Open your browser or phone settings for this site, allow notifications, then come back.</p>}
        <button onClick={() => test(here || undefined)} disabled={busy || !here} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 font-semibold text-white disabled:opacity-40"><Icon d={I.bell} className="h-5 w-5" />Send a test alert</button>
        {msg && <p role="status" className="rounded-xl bg-stone-100 p-3 text-sm text-stone-800">{msg}</p>}
      </section>
      <section className={card + ' space-y-3'}>
        <h2 className={disp + ' text-xl font-bold'}>Your devices ({subs.length})</h2>
        {subs.map(s => (
          <div key={s.id} className="space-y-2 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
            <div className="flex items-center gap-2"><input aria-label="Device name" defaultValue={s.label || ''} onBlur={e => e.target.value.trim() && e.target.value !== s.label && patch(s, { label: e.target.value.trim() })} className="min-h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 font-bold focus:border-stone-300 focus:bg-white" />{s.endpoint === here && <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-900">This phone</span>}</div>
            <p className="px-2 text-xs text-stone-600">Added {new Date(s.created_at).toLocaleDateString()}</p>
            <div className="flex items-center justify-between gap-3 px-2"><span className="text-sm font-medium">Receive alerts</span>{sw(s.enabled, 'Receive alerts on ' + s.label, () => patch(s, { enabled: !s.enabled }))}</div>
            <div className="flex items-center justify-between gap-3 px-2"><span className="text-sm font-medium">Show customer and items<span className="block text-xs font-normal text-stone-600">Turn off to hide details on the lock screen</span></span>{sw(s.show_details, 'Show details on ' + s.label, () => patch(s, { show_details: !s.show_details }))}</div>
            <div className="flex gap-2"><button onClick={() => test(s.endpoint)} disabled={busy} className="min-h-11 flex-1 rounded-xl bg-white font-semibold ring-1 ring-stone-300">Test</button><button onClick={() => remove(s)} aria-label={'Remove ' + s.label} className="flex min-h-11 items-center gap-2 rounded-xl bg-red-50 px-4 font-semibold text-red-700"><Icon d={I.trash} className="h-5 w-5" />Remove</button></div>
          </div>))}
        {subs.length === 0 && <p className="py-4 text-center text-stone-600">No devices yet. Turn on alerts above on the phone you carry.</p>}
        <p className="text-xs text-stone-600">The alert sound and volume come from your phone’s notification settings for this app. The loud in-app alarm still rings while this page is open.</p>
      </section>
    </div>)
}
