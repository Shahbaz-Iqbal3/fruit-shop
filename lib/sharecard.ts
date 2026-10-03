import QRCode from 'qrcode'
type Shop = { name: string; logo_url: string | null; color: string; whatsapp: string | null }
type Ctx = CanvasRenderingContext2D
const W = 1080, H = 1350
const load = (src?: string | null) => new Promise<HTMLImageElement | null>(res => { if (!src) return res(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src })
const fit = (c: Ctx, t: string, w: number) => { while (t.length > 1 && c.measureText(t).width > w) t = t.slice(0, -2); return t }
const price = (i: any) => (i.tag === 'on_sale' && i.sale_price ? i.sale_price : i.price)
const badge = (i: any) => (i.tag === 'on_sale' && i.sale_price ? `${Math.round((1 - i.sale_price / i.price) * 100)}% OFF` : ({ fresh: 'FRESH TODAY', one_day_old: '1 DAY OLD', on_sale: 'ON SALE' } as Record<string, string>)[i.tag] || '')
const stockLabel = (i: any) => (i.stock_status === 'sold_out' ? 'SOLD OUT' : i.stock_status === 'back_tomorrow' ? 'BACK TOMORROW' : '')
export async function buildCard(shop: Shop, items: any[], url: string): Promise<Blob> {
  const fam = (getComputedStyle(document.body).getPropertyValue('--font-display') || '').trim() || 'system-ui'
  try { await document.fonts.load(`800 40px ${fam}`) } catch {}
  const f = (w: number, s: number) => `${w} ${s}px ${fam}, system-ui, sans-serif`
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const c = cv.getContext('2d')!
  const brand = /^#[0-9a-f]{6}$/i.test(shop.color) ? shop.color : '#be123c'
  const n6 = parseInt(brand.slice(1), 16), light = (n6 >> 16) * 0.299 + ((n6 >> 8) & 255) * 0.587 + (n6 & 255) * 0.114 > 170
  const ink = light ? '#1c1917' : '#ffffff', accent = light ? '#9f1239' : '#fde047'
  const rr = (x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r) }
  const cover = (im: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) => { c.save(); rr(x, y, w, h, r); c.clip(); const k = Math.max(w / im.width, h / im.height); c.drawImage(im, x + (w - im.width * k) / 2, y + (h - im.height * k) / 2, im.width * k, im.height * k); c.restore() }
  const pill = (t: string, x: number, y: number, bg: string) => { c.font = f(800, 30); c.textAlign = 'left'; const w = c.measureText(t).width + 44; c.fillStyle = bg; rr(x, y, w, 56, 28); c.fill(); c.fillStyle = '#fff'; c.fillText(t, x + 22, y + 39) }
  const veil = (x: number, y: number, w: number, h: number, r: number, label: string, s = 40) => { c.fillStyle = 'rgba(255,255,255,.7)'; rr(x, y, w, h, r); c.fill(); c.font = f(800, s); c.textAlign = 'center'; const tw = c.measureText(label).width + s * 1.4, th = s * 1.7; c.fillStyle = '#292524'; rr(x + w / 2 - tw / 2, y + h / 2 - th / 2, tw, th, th / 2); c.fill(); c.fillStyle = '#fff'; c.fillText(label, x + w / 2, y + h / 2 + s * 0.35); c.textAlign = 'left' }
  // background: solid brand colour with soft rings
  c.fillStyle = brand; c.fillRect(0, 0, W, H)
  c.strokeStyle = light ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.1)'; c.lineWidth = 30
  for (const [cx, cy] of [[W * 0.95, 80], [W * 0.05, H * 0.8]]) for (let k = 1; k < 8; k++) { c.beginPath(); c.arc(cx, cy, 90 * k, 0, 7); c.stroke() }
  const [logo, ...pics] = await Promise.all([load(shop.logo_url), ...items.slice(0, 6).map(i => load(i.image_url))])
  // header pill
  c.font = f(800, 46); const nm = fit(c, shop.name, 620), pw = Math.min(960, 150 + c.measureText(nm).width + 60), px = (W - pw) / 2
  c.fillStyle = '#fff'; rr(px, 50, pw, 130, 65); c.fill()
  c.save(); c.beginPath(); c.arc(px + 65, 115, 48, 0, 7); c.clip()
  if (logo) cover(logo, px + 17, 67, 96, 96, 0); else { c.fillStyle = brand; c.fillRect(px + 17, 67, 96, 96); c.fillStyle = ink; c.font = f(800, 52); c.textAlign = 'center'; c.fillText((shop.name[0] || 'S').toUpperCase(), px + 65, 133) }
  c.restore()
  c.textAlign = 'left'; c.fillStyle = '#1c1917'; c.font = f(800, 46); c.fillText(nm, px + 130, 132)
  // white panel
  c.save(); c.shadowColor = 'rgba(0,0,0,.22)'; c.shadowBlur = 40; c.shadowOffsetY = 14; c.fillStyle = '#fff'; rr(70, 230, 940, 720, 56); c.fill(); c.restore()
  const n = items.length
  if (n === 0) {
    c.textAlign = 'center'; c.fillStyle = brand; c.font = f(800, 46); c.fillText('SCAN TO ORDER', W / 2, 305)
    const qc = document.createElement('canvas'); await QRCode.toCanvas(qc, url, { width: 560, margin: 1, color: { dark: '#1c1917', light: '#ffffff' } })
    c.drawImage(qc, W / 2 - 280, 345, 560, 560); c.textAlign = 'left'
  } else if (n === 1) {
    const i = items[0], p = `Rs ${price(i)}`
    if (pics[0]) cover(pics[0], 90, 250, 900, 540, 40); else { c.fillStyle = '#f5f5f4'; rr(90, 250, 900, 540, 40); c.fill() }
    if (stockLabel(i)) veil(90, 250, 900, 540, 40, stockLabel(i)); else if (badge(i)) pill(badge(i), 118, 278, i.tag === 'on_sale' ? '#be123c' : '#15803d')
    c.textAlign = 'left'; c.fillStyle = '#1c1917'; c.font = f(800, 60); c.fillText(fit(c, i.name, 880), 100, 850)
    c.fillStyle = light ? '#9f1239' : brand; c.font = f(800, 76); c.fillText(p, 100, 928); const pw2 = c.measureText(p).width
    c.font = f(500, 38); c.fillStyle = '#57534e'; const u = `/ ${i.unit}`; c.fillText(u, 100 + pw2 + 14, 928)
    if (i.tag === 'on_sale' && i.sale_price) { const x = 100 + pw2 + 14 + c.measureText(u).width + 24, o = `Rs ${i.price}`; c.fillStyle = '#78716c'; c.fillText(o, x, 928); c.fillRect(x, 914, c.measureText(o).width, 3) }
    if (i.name_ur) { c.font = f(500, 36); c.fillStyle = '#57534e'; c.direction = 'rtl'; c.textAlign = 'right'; c.fillText(fit(c, i.name_ur, 220), 980, 928); c.direction = 'ltr'; c.textAlign = 'left' }
  } else {
    c.textAlign = 'left'; c.fillStyle = '#1c1917'; c.font = f(800, 52); c.fillText('Fresh today', 100, 305)
    const list = items.slice(0, 6), cols = n <= 4 ? 2 : 3, rows = Math.ceil(list.length / cols), tw = (880 - 20 * (cols - 1)) / cols, areaTop = 335, areaH = 565
    let th = Math.min(areaH, (areaH - 20 * (rows - 1)) / rows); if (rows === 1) th = Math.min(th, 440)
    const oy = areaTop + (areaH - (th * rows + 20 * (rows - 1))) / 2, ph = th - (cols === 3 ? 96 : 104)
    list.forEach((it, k) => {
      const x = 90 + (k % cols) * (tw + 20), y = oy + Math.floor(k / cols) * (th + 20), ny = y + ph + (cols === 3 ? 36 : 44)
      c.fillStyle = '#f5f5f4'; rr(x, y, tw, th, 28); c.fill()
      if (pics[k]) cover(pics[k]!, x + 8, y + 8, tw - 16, ph - 8, 22)
      if (stockLabel(it)) veil(x + 8, y + 8, tw - 16, ph - 8, 22, stockLabel(it), cols === 3 ? 22 : 30)
      c.textAlign = 'left'; c.fillStyle = '#1c1917'; c.font = f(800, cols === 3 ? 26 : 30); c.fillText(fit(c, it.name, tw - 32), x + 16, ny)
      c.fillStyle = light ? '#9f1239' : brand; c.font = f(800, cols === 3 ? 26 : 30); c.fillText(fit(c, `Rs ${price(it)} / ${it.unit}`, tw - 32), x + 16, ny + (cols === 3 ? 36 : 42))
    })
    if (n > 6) { c.textAlign = 'right'; c.font = f(600, 26); c.fillStyle = '#57534e'; c.fillText(`+ ${n - 6} more in the shop`, 990, 936) }
  }
  // facts row
  c.font = f(700, 26); c.textAlign = 'left'
  const chips = ['Fresh daily', 'Cash on delivery', 'Live tracking'], cw = chips.map(t => c.measureText(t).width + 56), total = cw.reduce((a, b) => a + b, 0) + 14 * 2
  let cx = (W - total) / 2
  chips.forEach((t, k) => { c.strokeStyle = ink; c.globalAlpha = 0.7; c.lineWidth = 3; rr(cx, 990, cw[k], 56, 28); c.stroke(); c.globalAlpha = 1; c.fillStyle = ink; c.fillText(t, cx + 28, 1027); cx += cw[k] + 14 })
  // tagline with accent
  const a = n ? 'ORDER ONLINE' : 'ORDER FRESH FRUIT', b = n ? '  ·  PAY ON DELIVERY' : '  ONLINE'
  c.font = f(800, 44); const aw = c.measureText(a).width, bw = c.measureText(b).width, sx = (W - aw - bw) / 2
  c.fillStyle = accent; c.fillText(a, sx, 1125); c.fillStyle = ink; c.fillText(b, sx + aw, 1125)
  // link pill
  c.fillStyle = '#fff'; rr(70, 1170, 940, 120, 60); c.fill()
  const link = url.replace(/^https?:\/\//, '').split('?')[0].replace(/\/$/, ''), wa = shop.whatsapp
  c.fillStyle = '#1c1917'; c.font = f(800, 42)
  if (wa) { c.textAlign = 'left'; c.fillText(fit(c, link, 520), 120, 1245); c.textAlign = 'right'; c.font = f(700, 34); c.fillText(`WhatsApp ${wa}`, 970, 1244) } else { c.textAlign = 'center'; c.fillText(fit(c, link, 820), W / 2, 1245) }
  return new Promise(res => cv.toBlob(b => res(b!), 'image/jpeg', 0.92))
}
