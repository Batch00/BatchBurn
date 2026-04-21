'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Copy, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export type InviteRow = {
  id: string
  code: string
  created_at: string
  used_at: string | null
  used_by: string | null
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface AdminClientProps {
  invites: InviteRow[]
}

export function AdminClient({ invites: initialInvites }: AdminClientProps) {
  const router = useRouter()
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites)
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    const supabase = createClient()
    const code = generateCode()
    const { data, error: insertError } = await supabase
      .schema('batchburn')
      .from('invites')
      .insert({ code, created_at: new Date().toISOString() })
      .select('id, code, created_at, used_at, used_by')
      .single()
    setGenerating(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    if (data) {
      setInvites([data as InviteRow, ...invites])
    }
    router.refresh()
  }

  async function handleCopy(invite: InviteRow) {
    await navigator.clipboard.writeText(invite.code)
    setCopiedId(invite.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleDelete(invite: InviteRow) {
    setDeletingId(invite.id)
    const supabase = createClient()
    await supabase
      .schema('batchburn')
      .from('invites')
      .delete()
      .eq('id', invite.id)
    setDeletingId(null)
    setConfirmDeleteId(null)
    setInvites((prev) => prev.filter((i) => i.id !== invite.id))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">{invites.length} invite{invites.length !== 1 ? 's' : ''}</p>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-[#C41230] text-white hover:bg-[#A10F29] disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Generating…
            </span>
          ) : (
            'Generate Invite'
          )}
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {invites.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 py-12 text-center">
            <p className="text-sm text-white/30">No invites yet</p>
          </div>
        )}

        {invites.map((invite) => {
          const isUsed = invite.used_at != null
          const isConfirming = confirmDeleteId === invite.id
          const isDeleting = deletingId === invite.id
          const isCopied = copiedId === invite.id

          return (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <span className="font-mono text-sm font-semibold tracking-widest text-white">
                  {invite.code}
                </span>
                <span className="text-xs text-white/40">
                  Created {formatDate(invite.created_at)}
                  {isUsed && invite.used_at && (
                    <> · Used {formatDate(invite.used_at)}</>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isUsed
                      ? 'bg-white/10 text-white/40'
                      : 'bg-green-500/15 text-green-400'
                  }`}
                >
                  {isUsed ? 'Used' : 'Available'}
                </span>

                {!isUsed && (
                  <button
                    type="button"
                    onClick={() => handleCopy(invite)}
                    title="Copy code"
                    className="flex size-8 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white/70"
                  >
                    <Copy className="size-4" />
                    {isCopied && (
                      <span className="sr-only">Copied!</span>
                    )}
                  </button>
                )}

                {!isUsed && !isConfirming && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(invite.id)}
                    title="Delete invite"
                    className="flex size-8 items-center justify-center rounded-md text-white/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}

                {isConfirming && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-md px-2 py-1 text-xs text-white/50 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(invite)}
                      disabled={isDeleting}
                      className="rounded-md bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
