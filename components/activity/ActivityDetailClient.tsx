'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EditRunModal, EditCrossModal } from '@/components/history/EditActivityModals'
import type { UnifiedActivity } from '@/components/history/HistoryClient'

interface Props {
  activity: UnifiedActivity
  shoes: { id: string; name: string }[]
  hiddenTypes: string[]
  isDemoUser: boolean
}

export function ActivityDetailClient({ activity, shoes, hiddenTypes, isDemoUser }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const supabase = createClient()
    const table = activity.kind === 'run' ? 'runs' : 'cross_training'
    const { error: deleteError } = await supabase.from(table).delete().eq('id', activity.id)
    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }
    router.push('/history')
    router.refresh()
  }

  function handleSaved() {
    setEditing(false)
    router.refresh()
  }

  return (
    <>
      {editing && activity.kind === 'run' && (
        <EditRunModal
          activity={activity}
          shoes={shoes}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}
      {editing && activity.kind === 'cross' && (
        <EditCrossModal
          activity={activity}
          hiddenTypes={hiddenTypes}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}

      <div className="mb-4">
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to history
        </Link>
      </div>

      {!isDemoUser && (
        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            onClick={() => setEditing(true)}
            variant="outline"
            className="border-white/10 text-white/80 hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
          {!confirming ? (
            <Button
              type="button"
              onClick={() => setConfirming(true)}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-1.5">
              <span className="text-sm text-white/80">Delete this activity?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded px-2 py-0.5 text-sm text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded bg-red-600/80 px-3 py-0.5 text-sm text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </>
  )
}
