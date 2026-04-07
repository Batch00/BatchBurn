'use client'

import { useState, useEffect } from 'react'

export type ToastMessage = {
  id: string
  message: string
  type: 'success' | 'error'
}

let store: ToastMessage[] = []
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function toast(message: string, type: ToastMessage['type'] = 'success') {
  const id = Math.random().toString(36).slice(2, 9)
  store = [...store, { id, message, type }]
  notify()
  setTimeout(() => {
    store = store.filter((t) => t.id !== id)
    notify()
  }, 3500)
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>(store)
  useEffect(() => {
    const listener = () => setToasts([...store])
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return toasts
}
