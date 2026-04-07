'use client'

import { CheckCircle, XCircle } from 'lucide-react'
import { useToasts } from '@/lib/hooks/use-toast'

export function Toaster() {
  const toasts = useToasts()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 md:bottom-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            t.type === 'success'
              ? 'border-green-500/30 bg-[#161B22] text-green-400'
              : 'border-red-500/30 bg-[#161B22] text-red-400'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle className="size-4 shrink-0" />
          ) : (
            <XCircle className="size-4 shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  )
}
