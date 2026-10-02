import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Shop Owner',
  manifest: '/owner.webmanifest',
  appleWebApp: { capable: true, title: 'Shop Owner', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
}
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children }
