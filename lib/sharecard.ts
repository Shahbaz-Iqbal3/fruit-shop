import QRCode from 'qrcode'
type Shop = { name: string; logo_url: string | null; color: string; whatsapp: string | null }
type Ctx = CanvasRenderingContext2D
const W = 1080, H = 1350
const load = (src?: string | null) => new Promise<HTMLImageElement | null>(res => { if (!src) return res(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src })
const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * k)).join(',')})` }
const fit = (c: Ctx, t: string, w: number) => { while (t.length > 1 && c.measureText(t).width > w) t = t.slice(0, -2); return t }
const price = (i: any) => (i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price)
const badge = (i: any) => (i.tag === 'on_sale' && i.sale_price ? `${Math.round((1 - i.sale_price / i.price) * 100)}% OFF` : ({ fresh: 'FRESH TODAY', one_day_old: '1 DAY OLD', on_sale: 'ON SALE' } as Record<string, string>)[i.tag] || '')
const stockLabel = (i: any) => (i.stock_status === 'sold_out' ? 'SOLD OUT' : i.stock_status === 'back_tomorrow' ? 'BACK TOMORROW' : '')
export async function buildCard(shop: Shop, items: any[], url: string): Promise<Blob> {
  const fam = (getComputedStyle(document.body).getPropertyValue('--font-display') || '').trim() || 'system-ui'
  try { await document.fonts.load(`700 40px ${fam}`) } catch {}
  const f = (w: number, s: number) => `${w} ${s}px ${fam}, system-ui, sans-serif`
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const c = cv.getContext('2d')!
  const brand = /^#[0-9a-f]{6}$/i.test(shop.color) ? shop.color : '#be123c'
  const rr = (x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r) }
  const cover = (im: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) => { c.save(); rr(x, y, w, h, r); c.clip(); const k = Math.max(w / im.width, h / im.height); c.drawImage(im, x + (w - im.width * k) / 2, y + (h - im.height * k) / 2, im.width * k, im.height * k); c.restore() }
  const card = (x: number, y: number, w: number, h: number, r: number) => { c.save(); c.shadowColor = 'rgba(0,0,0,.16)'; c.shadowBlur = 36; c.shadowOffsetY = 12; c.fillStyle = '#fff'; rr(x, y, w, h, r); c.fill(); c.restore() }
  const pill = (t: string, x: number, y: number, bg: string) => { c.font = f(700, 30); c.textAlign = 'left'; const w = c.measureText(t).width + 44; c.fillStyle = bg; rr(x, y, w, 56, 28); c.fill(); c.fillStyle = '#fff'; c.fillText(t, x + 22, y + 39) }
  const veil = (x: number, y: number, w: number, h: number, r: number, label: string) => { c.fillStyle = 'rgba(251,248,243,.65)'; rr(x, y, w, h, r); c.fill(); c.font = f(800, 40); c.textAlign = 'center'; const tw = c.measureText(label).width + 56; c.fillStyle = '#292524'; rr(x + w / 2 - tw / 2, y + h / 2 - 34, tw, 68, 34); c.fill(); c.fillStyle = '#fff'; c.fillText(label, x + w / 2, y + h / 2 + 14); c.textAlign = 'left' }
  c.fillStyle = '#fbf8f3'; c.fillRect(0, 0, W, H)
  const hg = c.createLinearGradient(0, 0, W, 210); hg.addColorStop(0, brand); hg.addColorStop(1, shade(brand, 0.55)); c.fillStyle = hg; c.fillRect(0, 0, W, 210)
  const [logo, ...pics] = await Promise.all([load(shop.logo_url), ...items.slice(0, 6).map(i => load(i.image_url))])
  c.save(); c.beginPath(); c.arc(120, 105, 60, 0, 7); c.clip()
  if (logo) cover(logo, 60, 45, 120, 120, 0); else { c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(60, 45, 120, 120); c.fillStyle = '#fff'; c.font = f(700, 64); c.textAlign = 'center'; c.fillText((shop.name[0] || 'S').toUpperCase(), 120, 128) }
  c.restore()
  c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = f(700, 54); c.fillText(fit(c, shop.name, 800), 210, 108)
  c.font = f(500, 28); c.globalAlpha = 0.85; c.fillText('Fresh fruit, delivered to your door', 210, 150); c.globalAlpha = 1
  const n = items.length
  if (n === 0) {
    c.textAlign = 'center'; c.fillStyle = '#1c1917'; c.font = f(800, 84); c.fillText('Order fresh fruit', W / 2, 360); c.fillText('online', W / 2, 455)
    c.font = f(500, 38); c.fillStyle = '#57534e'; c.fillText('Pay cash on delivery · Track your order live', W / 2, 520)
    const qc = document.createElement('canvas'); await QRCode.toCanvas(qc, url, { width: 520, margin: 1, color: { dark: '#1c1917', light: '#ffffff' } })
    card(W / 2 - 300, 580, 600, 600, 48); c.drawImage(qc, W / 2 - 260, 620, 520, 520)
  } else if (n === 1) {
    const i = items[0], p = `Rs ${price(i)}`
    card(60, 250, 960, 650, 48)
    if (pics[0]) cover(pics[0], 76, 266, 928, 618, 36); else { c.fillStyle = '#f5f5f4'; rr(76, 266, 928, 618, 36); c.fill() }
    if (stockLabel(i)) veil(76, 266, 928, 618, 36, stockLabel(i)); else if (badge(i)) pill(badge(i), 104, 294, i.tag === 'on_sale' ? '#be123c' : '#15803d')
    c.textAlign = 'left'; c.fillStyle = '#1c1917'; c.font = f(700, 68); c.fillText(fit(c, i.name, 960), 60, 985)
    if (i.name_ur) { c.font = f(500, 40); c.fillStyle = '#57534e'; c.direction = 'rtl'; c.textAlign = 'right'; c.fillText(fit(c, i.name_ur, 960), 1020, 1040); c.direction = 'ltr'; c.textAlign = 'left' }
    c.fillStyle = brand; c.font = f(800, 92); c.fillText(p, 60, 1150); const pw = c.measureText(p).width
    c.font = f(500, 40); c.fillStyle = '#57534e'; const u = `/ ${i.unit}`; c.fillText(u, 60 + pw + 14, 1150)
    if (i.tag === 'on_sale' && i.sale_price) { const x = 60 + pw + 14 + c.measureText(u).width + 28, o = `Rs ${i.price}`; c.fillStyle = '#78716c'; c.fillText(o, x, 1150); c.fillRect(x, 1136, c.measureText(o).width, 3) }
  } else {
    c.textAlign = 'left'; c.fillStyle = '#1c1917'; c.font = f(700, 64); c.fillText('Fresh today', 60, 300)
    const list = items.slice(0, 6), rows = Math.ceil(list.length / 2), top = 335, th = (1175 - top - (rows - 1) * 24) / rows, tw = 468
    list.forEach((it, k) => {
      const x = 60 + (k % 2) * (tw + 24), y = top + Math.floor(k / 2) * (th + 24), ph = th - 112
      card(x, y, tw, th, 32)
      if (pics[k]) cover(pics[k]!, x + 10, y + 10, tw - 20, ph, 24)
      if (stockLabel(it)) veil(x + 10, y + 10, tw - 20, ph, 24, stockLabel(it))
      c.textAlign = 'left'; c.fillStyle = '#1c1917'; c.font = f(700, 32); c.fillText(fit(c, it.name, tw - 40), x + 20, y + ph + 54)
      c.fillStyle = brand; c.font = f(800, 34); c.fillText(`Rs ${price(it)} / ${it.unit}`, x + 20, y + ph + 96)
    })
    if (n > 6) { c.textAlign = 'right'; c.font = f(600, 28); c.fillStyle = '#57534e'; c.fillText(`+ ${n - 6} more in the shop`, 1020, 1192) }
  }
  c.fillStyle = shade(brand, 0.75); c.fillRect(0, 1200, W, 150)
  c.fillStyle = '#fff'; c.textAlign = 'left'; c.font = f(500, 32); c.fillText(n ? 'Order online · pay on delivery' : 'Scan or tap to order', 60, 1262)
  c.font = f(800, 44); c.fillText(fit(c, url.replace(/^https?:\/\//, '').split('?')[0].replace(/\/$/, ''), 700), 60, 1318)
  if (shop.whatsapp) { c.textAlign = 'right'; c.font = f(600, 32); c.fillText('WhatsApp', 1020, 1262); c.font = f(800, 38); c.fillText(shop.whatsapp, 1020, 1318) }
  return new Promise(res => cv.toBlob(b => res(b!), 'image/jpeg', 0.92))
}
