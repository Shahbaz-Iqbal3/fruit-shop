import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Fruit Shop', short_name: 'Fruit Shop', start_url: '/admin', display: 'standalone', background_color: '#fbf8f3', theme_color: '#be123c', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }
}
