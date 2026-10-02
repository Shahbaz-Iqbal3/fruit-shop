'use client'

import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Order = { id: string; customer_name: string | null; phone: string | null; items: { id: string; name: string; unit: string; price: number; qty: number }[]; total: number; status: string; created_at: string }
type Item = { id: string; category_id: string | null; name: string; unit: string; price: number; available: boolean; tag: string }
type Category = { id: string; name: string }
type Props = { orders: Order[]; items: Item[]; categories: Category[] }
type Metric = 'revenue' | 'orders' | 'units' | 'average'
const palette = ['#f6b73c', '#f47655', '#c4e36b', '#75c6b1', '#cb9be8', '#e6dfd2']
const statusNames: Record<string, string> = { placed: 'New', accepted: 'Accepted', preparing: 'Preparing', out_for_delivery: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' }
const metricNames: Record<Metric, string> = { revenue: 'Sales', orders: 'Orders', units: 'Items sold', average: 'Avg. order' }
const money = (value: number) => `Rs ${Math.round(value).toLocaleString()}`
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateInput = (daysAgo: number) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return dateValue(d) }
const dayStart = (value: string) => new Date(`${value}T00:00:00`)
const dayEnd = (value: string) => new Date(`${value}T23:59:59.999`)
const panel = 'rounded-[1.35rem] bg-[#202820] p-4 text-[#f5f0e6] shadow-[0_18px_50px_rgba(24,32,24,.12)] sm:p-5'
const input = 'min-h-11 rounded-xl border border-[#344036] bg-[#202820] px-3 text-sm text-[#f5f0e6] outline-none focus:border-[#f6b73c] focus:ring-2 focus:ring-[#f6b73c]/20'

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
  const stat = (label: string, value: string, note: string, color: string) => <div className="border-l-2 pl-3" style={{ borderColor: color }}><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#a8b09f]">{label}</p><p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-[#f5f0e6] sm:text-3xl">{value}</p><p className="mt-1 text-xs text-[#a8b09f]">{note}</p></div>

  return <section className="min-w-0 space-y-4 text-[#f5f0e6]">
    <div className="overflow-hidden rounded-[1.6rem] bg-[#172019] text-[#f5f0e6] shadow-[0_22px_60px_rgba(23,32,25,.2)]">
      <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><p className="font-mono text-[10px] font-bold uppercase tracking-[.24em] text-[#c4e36b]">The market ledger · {orders.length.toLocaleString()} orders loaded</p><h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Know what’s moving.<br /><span className="text-[#f6b73c]">And when.</span></h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#c1c9bd]">Sales, baskets, and repeat buyers, read straight from your order book.</p></div>
        <button onClick={() => csvDownload(`market-report-${from}-to-${to}.csv`, [['Period', 'Sales (Rs)', 'Orders', 'Items sold', 'Average order (Rs)'], ...report.trend.map(point => [point.key, Math.round(point.revenue), point.orders, point.units, Math.round(point.average)])])} className="min-h-11 rounded-xl border border-[#50604f] px-4 text-sm font-bold text-[#f5f0e6] transition hover:border-[#f6b73c] hover:text-[#f6b73c]">Download CSV ↓</button>
      </div>
      <div className="grid grid-cols-2 gap-5 border-t border-[#344036] px-5 py-5 sm:grid-cols-3 sm:px-7 lg:grid-cols-5">
        {stat('Sales value', money(report.sales), 'Cancelled orders excluded', '#f6b73c')}
        {stat('Orders', report.saleOrders.length.toLocaleString(), `${report.cancelled} cancelled`, '#f47655')}
        {stat('Items moved', report.soldUnits.toLocaleString(), 'Units / kg as listed', '#c4e36b')}
        {stat('Average basket', money(report.saleOrders.length ? report.sales / report.saleOrders.length : 0), 'Per non-cancelled order', '#75c6b1')}
        {stat('Cancelled', `${report.filtered.length ? Math.round(report.cancelled / report.filtered.length * 100) : 0}%`, `${report.cancelled} of ${report.filtered.length} orders`, '#f47655')}
      </div>
    </div>

    <div className="grid gap-2 rounded-[1.2rem] border border-[#d8d4c7] bg-[#eeece3] p-3 sm:grid-cols-2 lg:grid-cols-6">
      <label className="text-[10px] font-bold uppercase tracking-[.15em] text-[#586253]">From<input aria-label="Report start date" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className={'mt-1 block w-full ' + input} /></label>
      <label className="text-[10px] font-bold uppercase tracking-[.15em] text-[#586253]">To<input aria-label="Report end date" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={'mt-1 block w-full ' + input} /></label>
      <label className="text-[10px] font-bold uppercase tracking-[.15em] text-[#586253]">Order status<select value={status} onChange={e => setStatus(e.target.value)} className={'mt-1 block w-full ' + input}><option value="all">Every status</option>{Object.entries(statusNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      <label className="text-[10px] font-bold uppercase tracking-[.15em] text-[#586253]">Category<select value={category} onChange={e => setCategory(e.target.value)} className={'mt-1 block w-full ' + input}><option value="all">All categories</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label>
      <label className="text-[10px] font-bold uppercase tracking-[.15em] text-[#586253]">Group by<select value={interval} onChange={e => setInterval(e.target.value as typeof interval)} className={'mt-1 block w-full ' + input}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label>
      <label className="text-[10px] font-bold uppercase tracking-[.15em] text-[#586253]">Chart shows<select value={metric} onChange={e => setMetric(e.target.value as Metric)} className={'mt-1 block w-full ' + input}>{Object.entries(metricNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
    </div>

    <div className={panel}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.19em] text-[#c4e36b]">Movement over time</p><h3 className="mt-1 text-xl font-bold">{metricNames[metric]} by {interval}</h3></div><span className="font-mono text-xs text-[#a8b09f]">{report.trend.length} periods · {report.filtered.length} orders</span></div>
      <div className="h-64 w-full sm:h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartRows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f6b73c" stopOpacity={0.34} /><stop offset="94%" stopColor="#f6b73c" stopOpacity={0.015} /></linearGradient></defs>
        <CartesianGrid stroke="#39443a" vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#a8b09f', fontSize: 10 }} minTickGap={24} />
        <YAxis axisLine={false} tickLine={false} width={52} tick={{ fill: '#a8b09f', fontSize: 10 }} tickFormatter={value => metric === 'revenue' || metric === 'average' ? `${Math.round(value / 1000)}k` : value} />
        <Tooltip contentStyle={{ background: '#101811', border: '1px solid #50604f', borderRadius: 12, color: '#f5f0e6', fontSize: 12 }} formatter={value => [metric === 'revenue' || metric === 'average' ? money(Number(value)) : Number(value).toLocaleString(), metricNames[metric]]} labelStyle={{ color: '#c4e36b', marginBottom: 4 }} />
        <Area type="monotone" dataKey="value" stroke="#f6b73c" strokeWidth={3} fill="url(#sales-fill)" activeDot={{ r: 5, fill: '#c4e36b', stroke: '#172019', strokeWidth: 2 }} />
      </AreaChart></ResponsiveContainer></div>
      {!report.trend.length && <p className="py-4 text-center text-sm text-[#a8b09f]">No orders in this date range. Try widening the dates or changing filters.</p>}
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
      <div className={panel}>
        <div className="mb-4"><p className="font-mono text-[10px] font-bold uppercase tracking-[.19em] text-[#c4e36b]">Product performance</p><h3 className="mt-1 text-xl font-bold">What brings in sales</h3></div>
        {report.productRows.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.productRows} layout="vertical" margin={{ top: 0, right: 12, left: 5, bottom: 0 }}>
          <CartesianGrid stroke="#39443a" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={88} axisLine={false} tickLine={false} tick={{ fill: '#e7e4d9', fontSize: 11 }} />
          <Tooltip cursor={{ fill: '#ffffff0a' }} contentStyle={{ background: '#101811', border: '1px solid #50604f', borderRadius: 12, color: '#f5f0e6', fontSize: 12 }} formatter={(value, _name, props) => [`${money(Number(value))} · ${props.payload.units} ${props.payload.unit}`, 'Sales']} />
          <Bar dataKey="sales" radius={[0, 6, 6, 0]}>{report.productRows.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Bar>
        </BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-[#a8b09f]">Product sales will appear when orders fall in this range.</p>}
      </div>
      <div className={panel}>
        <div><p className="font-mono text-[10px] font-bold uppercase tracking-[.19em] text-[#c4e36b]">Order desk</p><h3 className="mt-1 text-xl font-bold">Status mix</h3></div>
        {report.statusRows.length ? <div className="relative h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={report.statusRows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={3} stroke="none">{report.statusRows.map((row, index) => <Cell key={row.key} fill={palette[index % palette.length]} />)}</Pie><Tooltip contentStyle={{ background: '#101811', border: '1px solid #50604f', borderRadius: 12, color: '#f5f0e6', fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="font-mono text-2xl">{report.filtered.length}</strong><span className="text-[10px] uppercase tracking-widest text-[#a8b09f]">orders</span></div></div> : <div className="flex h-48 items-center justify-center text-sm text-[#a8b09f]">Nothing to chart yet.</div>}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">{report.statusRows.map((row, index) => <div key={row.key} className="flex items-center gap-2 text-xs text-[#d9ddcf]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: palette[index % palette.length] }} />{row.name}<span className="ml-auto font-mono text-[#a8b09f]">{row.value}</span></div>)}</div>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className={panel}><p className="font-mono text-[10px] font-bold uppercase tracking-[.19em] text-[#c4e36b]">Basket loyalty</p><h3 className="mt-1 text-xl font-bold">Repeat customers</h3><p className="mb-4 mt-1 text-xs text-[#a8b09f]">Matched by phone number in this period</p>
        {report.customerRows.length ? <div className="space-y-3">{report.customerRows.map((customer, index) => <div key={`${customer.name}-${index}`} className="flex items-center gap-3 border-t border-[#344036] pt-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#344036] font-mono text-xs text-[#c4e36b]">{customer.orders}×</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{customer.name}</span><span className="font-mono text-sm text-[#f6b73c]">{money(customer.sales)}</span></div>)}</div> : <p className="py-8 text-center text-sm text-[#a8b09f]">No repeat buyers in this period.</p>}
      </div>
      <div className={panel}><p className="font-mono text-[10px] font-bold uppercase tracking-[.19em] text-[#c4e36b]">Category mix</p><h3 className="mt-1 text-xl font-bold">Sales by aisle</h3><p className="mb-4 mt-1 text-xs text-[#a8b09f]">Based on each product’s current category</p>
        {report.categoryRows.length ? <div className="space-y-3">{report.categoryRows.slice(0, 6).map((row, index) => { const share = report.sales ? row.sales / report.sales * 100 : 0; return <div key={row.name}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate">{row.name}</span><span className="shrink-0 font-mono text-[#f6b73c]">{money(row.sales)} · {Math.round(share)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#344036]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, share)}%`, background: palette[index % palette.length] }} /></div></div>})}</div> : <p className="py-8 text-center text-sm text-[#a8b09f]">Categorized product sales will appear here.</p>}
      </div>
      <div className={panel}><p className="font-mono text-[10px] font-bold uppercase tracking-[.19em] text-[#c4e36b]">Catalog pulse</p><h3 className="mt-1 text-xl font-bold">Current shelf</h3><p className="mb-4 mt-1 text-xs text-[#a8b09f]">Live catalog, independent of date filters</p>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-[#344036] p-2"><strong className="block font-mono text-lg">{items.length}</strong><span className="text-[10px] uppercase tracking-wider text-[#a8b09f]">Listed</span></div><div className="rounded-xl bg-[#344036] p-2"><strong className="block font-mono text-lg text-[#c4e36b]">{items.filter(item => item.available).length}</strong><span className="text-[10px] uppercase tracking-wider text-[#a8b09f]">Available</span></div><div className="rounded-xl bg-[#344036] p-2"><strong className="block font-mono text-lg text-[#f47655]">{items.filter(item => !item.available).length}</strong><span className="text-[10px] uppercase tracking-wider text-[#a8b09f]">Hidden</span></div></div>
        <div className="space-y-2">{items.slice().sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 4).map(item => <div key={item.id} className="flex items-center gap-2 border-t border-[#344036] pt-2 text-xs"><span className={'h-2 w-2 rounded-full ' + (item.available ? 'bg-[#c4e36b]' : 'bg-[#f47655]')} /><span className="min-w-0 flex-1 truncate">{item.name}</span><span className="font-mono text-[#f6b73c]">{money(Number(item.price))}/{item.unit}</span></div>)}</div>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className={panel}><p className="font-mono text-[10px] font-bold uppercase tracking-[.19em] text-[#c4e36b]">Trading rhythm</p><h3 className="mt-1 text-xl font-bold">Orders by weekday</h3><div className="mt-3 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.weekdayCounts} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><CartesianGrid stroke="#39443a" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8b09f', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#a8b09f', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#101811', border: '1px solid #50604f', borderRadius: 12, color: '#f5f0e6', fontSize: 12 }} /><Bar dataKey="orders" name="Orders" fill="#75c6b1" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className={panel}><p className="font-mono text-[10px] font-bold uppercase tracking-[.19em] text-[#c4e36b]">Delivery clock</p><h3 className="mt-1 text-xl font-bold">Orders by hour</h3><div className="mt-3 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.hourCounts} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><CartesianGrid stroke="#39443a" vertical={false} /><XAxis dataKey="name" interval={2} axisLine={false} tickLine={false} tick={{ fill: '#a8b09f', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#a8b09f', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#101811', border: '1px solid #50604f', borderRadius: 12, color: '#f5f0e6', fontSize: 12 }} /><Bar dataKey="orders" name="Orders" fill="#f47655" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
    </div>

    <div className="rounded-xl border border-[#d8d4c7] bg-[#eeece3] px-4 py-3 text-xs leading-5 text-[#586253]">Reports use order totals and item snapshots. Cancelled orders are excluded from sales, units, and average basket. Category analysis uses each product’s current category, since historical order items do not store category snapshots. Inventory quantities, costs, profit, payment method breakdowns, and site conversion cannot be reported because those fields are not in the database.</div>
  </section>
}
