export const I = { plus: 'M5 12h14|M12 5v14', minus: 'M5 12h14', x: 'M18 6 6 18|M6 6l12 12', check: 'M20 6 9 17l-5-5', chat: 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z', cart: 'M9 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0|M20 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0|M2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 7H5' }
export const Icon = ({ d, className = 'h-5 w-5' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{d.split('|').map(p => <path key={p} d={p} />)}</svg>
)
