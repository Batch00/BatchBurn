'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCw } from 'lucide-react'

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [spinning, setSpinning] = useState(false)

  function handleClick() {
    setSpinning(true)
    startTransition(() => {
      router.refresh()
    })
    window.setTimeout(() => setSpinning(false), 1000)
  }

  const isSpinning = spinning || isPending

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Refresh"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:text-white"
    >
      <RotateCw className={`h-4 w-4 ${isSpinning ? 'animate-spin' : ''}`} />
    </button>
  )
}
