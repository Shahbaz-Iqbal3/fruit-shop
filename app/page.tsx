'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { configured } from '@/lib/supabase'
export default function Home() {
  const r = useRouter()
  useEffect(() => { if (!configured) r.replace('/setup') }, [r])
  return (
    <main className="mx-auto max-w-md space-y-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Shop platform</h1>
      <p className="text-stone-600">Open a shop link like /s/shop-name, or manage all shops below.</p>
      <a href="/platform" className="inline-flex min-h-11 items-center rounded-xl bg-stone-900 px-5 font-semibold text-white">Platform admin</a>
    </main>)
}
