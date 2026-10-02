'use client'
import { useEffect, useRef, useState } from 'react'
export default function Camera({ onCapture, onClose }: { onCapture: (f: File) => void; onClose: () => void }) {
  const v = useRef<HTMLVideoElement>(null), s = useRef<MediaStream | null>(null), [err, setErr] = useState(''), [face, setFace] = useState<'environment' | 'user'>('environment')
  useEffect(() => {
    let live = true
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: face, width: { ideal: 1280 } }, audio: false }).then(m => { if (!live) { m.getTracks().forEach(t => t.stop()); return } s.current = m; if (v.current) v.current.srcObject = m }).catch(() => setErr('Camera is not available. Allow camera access in your browser, or choose a photo from the gallery instead.'))
    if (!navigator.mediaDevices) setErr('Camera needs a secure (https) connection. Choose a photo from the gallery instead.')
    return () => { live = false; s.current?.getTracks().forEach(t => t.stop()) }
  }, [face])
  const snap = () => { const el = v.current!, k = Math.min(1, 1200 / el.videoWidth), c = document.createElement('canvas'); c.width = el.videoWidth * k; c.height = el.videoHeight * k; c.getContext('2d')!.drawImage(el, 0, 0, c.width, c.height); c.toBlob(b => b && onCapture(new File([b], 'photo-' + Date.now() + '.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.85) }
  const b = 'min-h-12 rounded-full bg-white/15 px-5 font-semibold text-white'
  return (
    <div role="dialog" aria-modal="true" aria-label="Take a photo" className="fixed inset-0 z-30 flex flex-col bg-black">
      {err ? <p className="m-auto max-w-xs p-6 text-center text-white">{err}</p> : <video ref={v} autoPlay playsInline muted className="min-h-0 flex-1 object-cover" />}
      <div className="flex items-center justify-around p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button onClick={onClose} className={b}>Cancel</button>
        {!err && <button aria-label="Take photo" onClick={snap} className="h-[72px] w-[72px] rounded-full border-4 border-white bg-white/90 active:scale-95" />}
        {!err && <button onClick={() => setFace(face === 'user' ? 'environment' : 'user')} className={b}>Flip</button>}
      </div>
    </div>)
}
