'use client'

import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Order = { id: string; customer_name: string | null; phone: string | null; items: { id: string; name: string; unit: string; price: number; qty: number }[]; total: number; status: string; created_at: string }
type Item = { id: string; category_id: string | null; name: string; unit: string; price: number; available: boolean; tag: string; stock_status?: string }
type Category = { id: string; name: string }
type Props = { orders: Order[]; items: Item[]; categories: Category[] }
type Metric = 'revenue' | 'orders' | 'units' | 'average'
const statusColor: Record<string, string> = { placed: '#e11d48', accepted: '#0284c7', preparing: '#b45309', out_for_delivery: '#7c3aed', delivered: '#15803d', cancelled: '#78716c' }
const presets: [string, number][] = [['Today', 0], ['7 days', 6], ['This month', -1], ['30 days', 29], ['90 days', 89]]
const palette = ['var(--brand)', '#16a34a', '#d97706', '#0ea5e9', '#7c3aed', '#a8a29e']
const statusNames: Record<string, string> = { placed: 'New', accepted: 'Accepted', preparing: 'Preparing', out_for_delivery: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' }
const metricNames: Record<Metric, string> = { revenue: 'Sales', orders: 'Orders', units: 'Items sold', average: 'Avg. order' }
const money = (value: number) => `Rs ${Math.round(value).toLocaleString()}`
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateInput = (daysAgo: number) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return dateValue(d) }
const dayStart = (value: string) => new Date(`${value}T00:00:00`)
const dayEnd = (value: string) => new Date(`${value}T23:59:59.999`)
const panel = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-5'
const input = 'min-h-12 rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900'

function csvDownload(name: string, rows: (string | number)[][]) {
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export default function Reports({ orders, items, categories }: Props) {
  const [from, setFrom] = useState(dateInput(29))
  const [to, setTo] = useState(dateInput(0))
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day')
  const [metric, setMetric] = useState<Metric>('revenue')
  const [more, setMore] = useState(false)
  const catalog = useMemo(() => new Map(items.map(item => [item.id, item])), [items])

  const report = useMemo(() => {
    const fromDate = dayStart(from), toDate = dayEnd(to)
    const filtered = orders.filter(order => {
      const placedAt = new Date(order.created_at)
      return placedAt >= fromDate && placedAt <= toDate && (status === 'all' || order.status === status) && (category === 'all' || order.items.some(line => catalog.get(line.id)?.category_id === category))
    })
    const lineFor = (order: Order) => order.items.filter(line => category === 'all' || catalog.get(line.id)?.category_id === category)
    const saleOrders = filtered.filter(order => order.status !== 'cancelled')
    const salesFor = (order: Order) => category === 'all' ? Number(order.total) || 0 : lineFor(order).reduce((sum, line) => sum + Number(line.price) * Number(line.qty), 0)
    const unitsFor = (order: Order) => lineFor(order).reduce((sum, line) => sum + Number(line.qty), 0)
    const grouped = new Map<string, { key: string; label: string; revenue: number; orders: number; units: number }>()
    for (const order of saleOrders) {
      const date = new Date(order.created_at)
      const pointDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      if (interval === 'week') pointDate.setDate(pointDate.getDate() - ((pointDate.getDay() + 6) % 7))
      if (interval === 'month') pointDate.setDate(1)
      const key = dateValue(pointDate)
      const point = grouped.get(key) || { key, label: interval === 'month' ? pointDate.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : interval === 'week' ? `Wk ${pointDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : pointDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), revenue: 0, orders: 0, units: 0 }
      point.revenue += salesFor(order)
      point.orders += 1
      point.units += unitsFor(order)
      grouped.set(key, point)
    }
    const trend = [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key)).map(point => ({ ...point, average: point.orders ? point.revenue / point.orders : 0 }))
    const products = new Map<string, { name: string; unit: string; units: number; sales: number }>()
    for (const order of saleOrders) for (const line of lineFor(order)) {
      const product = products.get(line.id) || { name: line.name, unit: line.unit, units: 0, sales: 0 }
      product.units += Number(line.qty)
      product.sales += Number(line.price) * Number(line.qty)
      products.set(line.id, product)
    }
    const productRows = [...products.values()].sort((a, b) => b.sales - a.sales).slice(0, 8)
    const statuses = new Map<string, number>()
    filtered.forEach(order => statuses.set(order.status, (statuses.get(order.status) || 0) + 1))
    const statusRows = [...statuses].map(([key, value]) => ({ name: statusNames[key] || key, value, key }))
    const weekdayCounts = Array.from({ length: 7 }, (_, index) => ({ key: index, name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index], orders: 0 }))
    filtered.forEach(order => { weekdayCounts[new Date(order.created_at).getDay()].orders += 1 })
    const hourCounts = Array.from({ length: 24 }, (_, hour) => ({ hour, name: `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`, orders: 0 }))
    filtered.forEach(order => { hourCounts[new Date(order.created_at).getHours()].orders += 1 })
    const customers = new Map<string, { name: string; orders: number; sales: number }>()
    for (const order of saleOrders) {
      const key = (order.phone || order.customer_name || order.id).replace(/\D/g, '') || order.id
      const customer = customers.get(key) || { name: order.customer_name || 'Customer', orders: 0, sales: 0 }
      customer.orders += 1
      customer.sales += salesFor(order)
      customers.set(key, customer)
    }
    const customerRows = [...customers.values()].filter(customer => customer.orders > 1).sort((a, b) => b.sales - a.sales).slice(0, 5)
    const sales = saleOrders.reduce((sum, order) => sum + salesFor(order), 0)
    const soldUnits = saleOrders.reduce((sum, order) => sum + unitsFor(order), 0)
    const categoryRows = categories.map(cat => ({ name: cat.name, sales: saleOrders.reduce((sum, order) => sum + order.items.filter(line => catalog.get(line.id)?.category_id === cat.id).reduce((lineSum, line) => lineSum + Number(line.price) * Number(line.qty), 0), 0) })).filter(row => row.sales > 0).sort((a, b) => b.sales - a.sales)
    return { filtered, saleOrders, trend, productRows, statusRows, customerRows, categoryRows, weekdayCounts, hourCounts, sales, soldUnits, cancelled: filtered.filter(order => order.status === 'cancelled').length }
  }, [orders, categories, catalog, from, to, status, category, interval])

  const chartRows = report.trend.map(point => ({ ...point, value: point[metric] }))
  const monthStart = () => { const d = new Date(); return dateValue(new Date(d.getFullYear(), d.getMonth(), 1)) }
  const rangeOn = (n: number) => to === dateInput(0) && from === (n === -1 ? monthStart() : dateInput(n))
  const setRange = (n: number) => { setFrom(n === -1 ? monthStart() : dateInput(n)); setTo(dateInput(0)) }
  const filtersOn = (status !== 'all' ? 1 : 0) + (category !== 'all' ? 1 : 0)
  const label = presets.find(([, n]) => rangeOn(n))?.[0] || `${from} to ${to}`
  const avg = report.saleOrders.length ? report.sales / report.saleOrders.length : 0
  const cancelPct = report.filtered.length ? Math.round(report.cancelled / report.filtered.length * 100) : 0
  const empty = !report.saleOrders.length
  const chip = (on: boolean) => 'min-h-8 h-8 shrink-0 rounded-full px-5 text-sm font-semibold ring-1 transition-colors ' + (on ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-800 ring-stone-300')
  const rail = 'flex gap-2 p-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
  const tip = { background: '#fff', border: '1px solid #e7e5e4', borderRadius: 12, color: '#1c1917', fontSize: 13 }
  const head = (t: string, sub?: string) => <div className="mb-3"><h3 className="font-[family-name:var(--font-display)] text-xl font-bold">{t}</h3>{sub && <p className="text-sm text-stone-600">{sub}</p>}</div>
  const tile = (name: string, value: string, note: string, color = 'text-stone-900') => <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"><p className="text-sm text-stone-600">{name}</p><p className={'mt-0.5 text-2xl font-bold ' + color}>{value}</p><p className="text-xs text-stone-600">{note}</p></div>
  const ranked = (rows: { name: string; sub: string; value: number }[], max: number) => <ol className="space-y-3">{rows.map((r, n) => <li key={r.name + n}><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand)]">{n + 1}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.name}</p><p className="text-xs text-stone-600">{r.sub}</p></div><p className="shrink-0 font-bold">{money(r.value)}</p></div><div className="ml-11 mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${max ? Math.max(3, r.value / max * 100) : 0}%` }} /></div></li>)}</ol>
  const field = 'mt-1 block w-full ' + input

  return <section className="min-w-0 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">Reports</h2>
      <button onClick={() => csvDownload(`shop-report-${from}-to-${to}.csv`, [['Period', 'Sales (Rs)', 'Orders', 'Items sold', 'Average order (Rs)'], ...report.trend.map(point => [point.key, Math.round(point.revenue), point.orders, point.units, Math.round(point.average)])])} className="min-h-8 h-8 rounded-full bg-white px-5 text-sm font-bold ring-1 ring-stone-300 active:scale-95">Download CSV</button>
    </div>
    <div className="flex items-center gap-2">
      <div className={rail + ' flex-1'} role="group" aria-label="Period">{presets.map(([l, n]) => <button key={l} aria-pressed={rangeOn(n)} onClick={() => setRange(n)} className={chip(rangeOn(n))}>{l}</button>)}</div>
      <button aria-expanded={more} onClick={() => setMore(!more)} className={chip(more || filtersOn > 0)}>Filters{filtersOn ? ` · ${filtersOn}` : ''}</button>
    </div>
    {more && <div style={{ animation: 'rise 250ms ease-out' }} className={panel + ' grid gap-3 sm:grid-cols-2'}>
      <label className="text-sm font-semibold text-stone-700">From<input aria-label="Report start date" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className={field} /></label>
      <label className="text-sm font-semibold text-stone-700">To<input aria-label="Report end date" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={field} /></label>
      <label className="text-sm font-semibold text-stone-700">Order status<select value={status} onChange={e => setStatus(e.target.value)} className={field}><option value="all">Every status</option>{Object.entries(statusNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      <label className="text-sm font-semibold text-stone-700">Category<select value={category} onChange={e => setCategory(e.target.value)} className={field}><option value="all">All categories</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label>
    </div>}

    <div className="rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, black))' }}>
      <p className="text-sm font-medium text-white/85">Sales · {label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">{money(report.sales)}</p>
      <p className="mt-1 text-sm text-white/85">{report.saleOrders.length.toLocaleString()} orders · cancelled orders not counted</p>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tile('Orders', report.saleOrders.length.toLocaleString(), 'Not cancelled')}
      {tile('Items sold', report.soldUnits.toLocaleString(), 'Units or kg as listed')}
      {tile('Average order', money(avg), 'Per order')}
      {tile('Cancelled', `${cancelPct}%`, `${report.cancelled} of ${report.filtered.length} orders`, report.cancelled ? 'text-rose-700' : 'text-stone-900')}
    </div>

    {empty ? <div className={panel + ' space-y-3 py-10 text-center'}><p className="font-semibold">No orders in this period</p><p className="text-sm text-stone-600">Try a longer period or clear the filters.</p><button onClick={() => { setRange(29); setStatus('all'); setCategory('all') }} className="min-h-12 rounded-2xl bg-[var(--brand)] px-6 font-bold text-white">Show last 30 days</button></div> : <>
    <div className={panel}>
      {head(`${metricNames[metric]} by ${interval}`, `${report.trend.length} ${interval}s · ${report.filtered.length} orders`)}
      <div className={rail + ' mb-3'} role="group" aria-label="Chart shows">{(Object.entries(metricNames) as [Metric, string][]).map(([key, name]) => <button key={key} aria-pressed={metric === key} onClick={() => setMetric(key)} className={chip(metric === key)}>{name}</button>)}</div>
      <div role="tablist" aria-label="Group by" className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/70 p-1">{(['day', 'week', 'month'] as const).map(k => <button key={k} role="tab" aria-selected={interval === k} onClick={() => setInterval(k)} className={'min-h-11 rounded-xl text-sm font-bold transition-colors ' + (interval === k ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600')}>{k === 'day' ? 'Days' : k === 'week' ? 'Weeks' : 'Months'}</button>)}</div>
      <div className="h-64 w-full sm:h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartRows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.34} /><stop offset="94%" stopColor="var(--brand)" stopOpacity={0.015} /></linearGradient></defs>
        <CartesianGrid stroke="#e7e5e4" vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#57534e', fontSize: 11 }} minTickGap={24} />
        <YAxis axisLine={false} tickLine={false} width={44} tick={{ fill: '#57534e', fontSize: 11 }} tickFormatter={value => metric === 'revenue' || metric === 'average' ? `${Math.round(value / 1000)}k` : value} />
        <Tooltip contentStyle={tip} formatter={value => [metric === 'revenue' || metric === 'average' ? money(Number(value)) : Number(value).toLocaleString(), metricNames[metric]]} labelStyle={{ color: '#57534e', marginBottom: 4 }} />
        <Area type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={3} fill="url(#sales-fill)" activeDot={{ r: 5, fill: 'var(--brand)', stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart></ResponsiveContainer></div>
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      <div className={panel}>{head('Best sellers', 'Top fruit by sales in this period')}{ranked(report.productRows.map(r => ({ name: r.name, sub: `${r.units.toLocaleString()} ${r.unit} sold`, value: r.sales })), report.productRows[0]?.sales || 0)}</div>
      <div className={panel}>{head('Order status', 'All orders in this period')}
        <div className="relative h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={report.statusRows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={3} stroke="none">{report.statusRows.map(row => <Cell key={row.key} fill={statusColor[row.key] || '#a8a29e'} />)}</Pie><Tooltip contentStyle={tip} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl">{report.filtered.length}</strong><span className="text-xs text-stone-600">orders</span></div></div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">{report.statusRows.map(row => <div key={row.key} className="flex items-center gap-2 text-sm text-stone-700"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: statusColor[row.key] || '#a8a29e' }} />{row.name}<span className="ml-auto font-semibold">{row.value}</span></div>)}</div>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      <div className={panel}>{head('Repeat customers', 'Matched by phone number')}
        {report.customerRows.length ? <ul className="space-y-3">{report.customerRows.map((customer, index) => <li key={`${customer.name}-${index}`} className="flex items-center gap-3"><span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-green-100 px-1 text-sm font-bold text-green-800">{customer.orders}×</span><span className="min-w-0 flex-1 truncate font-semibold">{customer.name}</span><span className="font-bold">{money(customer.sales)}</span></li>)}</ul> : <p className="py-6 text-center text-sm text-stone-600">No repeat customers in this period.</p>}
      </div>
      <div className={panel}>{head('Sales by category', 'Uses each fruit’s current category')}
        {report.categoryRows.length ? <ul className="space-y-3">{report.categoryRows.slice(0, 6).map((row, index) => { const share = report.sales ? row.sales / report.sales * 100 : 0; return <li key={row.name}><div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate font-semibold">{row.name}</span><span className="shrink-0 font-bold">{money(row.sales)} · {Math.round(share)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full" style={{ width: `${Math.min(100, share)}%`, background: palette[index % palette.length] }} /></div></li> })}</ul> : <p className="py-6 text-center text-sm text-stone-600">Add categories to your fruit to see this.</p>}
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      <div className={panel}>{head('Busiest days')}<div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.weekdayCounts} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><CartesianGrid stroke="#e7e5e4" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#57534e', fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#57534e', fontSize: 11 }} /><Tooltip contentStyle={tip} /><Bar dataKey="orders" name="Orders" fill="var(--brand)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className={panel}>{head('Busiest hours')}<div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.hourCounts} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><CartesianGrid stroke="#e7e5e4" vertical={false} /><XAxis dataKey="name" interval={2} axisLine={false} tickLine={false} tick={{ fill: '#57534e', fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#57534e', fontSize: 11 }} /><Tooltip contentStyle={tip} /><Bar dataKey="orders" name="Orders" fill="color-mix(in srgb, var(--brand) 55%, white)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
    </div>
    </>}

    <div className={panel}>{head('Your fruit list', 'Right now, not affected by the period')}
      <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-green-50 p-3"><strong className="block text-xl text-green-800">{items.filter(i => i.available && (i.stock_status || 'in_stock') === 'in_stock').length}</strong><span className="text-xs text-stone-700">In stock</span></div><div className="rounded-xl bg-amber-50 p-3"><strong className="block text-xl text-amber-800">{items.filter(i => i.available && (i.stock_status || 'in_stock') !== 'in_stock').length}</strong><span className="text-xs text-stone-700">Sold out</span></div><div className="rounded-xl bg-stone-100 p-3"><strong className="block text-xl">{items.filter(i => !i.available).length}</strong><span className="text-xs text-stone-700">Hidden</span></div></div>
    </div>
    <p className="px-1 text-xs leading-5 text-stone-600">Sales come from the order totals. Cancelled orders are left out of sales, items and averages. Profit and stock quantities are not tracked.</p>
  </section>
}
