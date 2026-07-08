'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { toast } from '@/lib/hooks/use-toast'
import { revalidateAll } from '@/lib/actions'

const CROSS_TYPES = [
  'Bike',
  'Walk',
  'Stair Master',
  'Swim',
  'Strength',
  'Yoga',
  'Soccer',
  'Tennis',
  'Pickleball',
  'Basketball',
  'Hiking',
  'Treadmill',
  'Elliptical',
  'Rowing',
  'Climbing',
  'Ultimate Frisbee',
  'Other',
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
        {title}
      </h2>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SettingsClientProps {
  userId: string
  email: string
  displayName: string
  isDemoUser?: boolean
  stravaAthleteId?: number | null
  stravaStatus?: string | null
  hiddenTypes?: string[]
}

export function SettingsClient({
  userId,
  email,
  displayName: initialDisplayName,
  isDemoUser = false,
  hiddenTypes: initialHiddenTypes = [],
}: SettingsClientProps) {
  const router = useRouter()

  // Profile
  const [nameValue, setNameValue] = useState(initialDisplayName)
  const [nameSaving, setNameSaving] = useState(false)

  // Danger zone
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Password reset
  const [pwBusy, setPwBusy] = useState(false)

  // Garmin CSV import
  const garminInputRef = useRef<HTMLInputElement>(null)
  const [garminFile, setGarminFile] = useState<File | null>(null)
  const [garminUploading, setGarminUploading] = useState(false)
  const [garminResult, setGarminResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [garminError, setGarminError] = useState<string | null>(null)

  async function uploadGarminCsv() {
    if (!garminFile) return
    setGarminUploading(true)
    setGarminResult(null)
    setGarminError(null)
    try {
      const formData = new FormData()
      formData.append('file', garminFile)
      const res = await fetch('/api/import/garmin', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setGarminResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 })
      setGarminFile(null)
      if (garminInputRef.current) garminInputRef.current.value = ''
      router.refresh()
      await revalidateAll()
    } catch (err) {
      setGarminError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setGarminUploading(false)
    }
  }

  // Activity type visibility
  const [hiddenTypes, setHiddenTypes] = useState<string[]>(initialHiddenTypes)

  async function toggleActivityType(type: string) {
    if (type === 'Other') return
    const next = hiddenTypes.includes(type)
      ? hiddenTypes.filter((t) => t !== type)
      : [...hiddenTypes, type]
    setHiddenTypes(next)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ hidden_activity_types: next })
      .eq('user_id', userId)
    if (error) {
      setHiddenTypes(hiddenTypes)
      toast(error.message, 'error')
    }
  }

  const visibleCount = CROSS_TYPES.filter((t) => !hiddenTypes.includes(t)).length

  async function saveDisplayName() {
    setNameSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, display_name: nameValue }, { onConflict: 'user_id' })
    setNameSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Display name saved')
    }
  }

  async function changePassword() {
    setPwBusy(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email)
    setPwBusy(false)
    toast('Check your email for a reset link')
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function deleteAllData() {
    setDeleting(true)
    const supabase = createClient()

    const tables = ['runs', 'cross_training', 'races', 'goals', 'shoes'] as const
    for (const table of tables) {
      await supabase.from(table).delete().eq('user_id', userId)
    }

    setDeleting(false)
    setDeleteOpen(false)
    toast('All data deleted')
    router.push('/dashboard')
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Section title="Profile">
        <div className="space-y-1">
          <Label htmlFor="display-name" className="text-sm text-white/60">
            Display Name
          </Label>
          <div className="flex gap-2">
            <Input
              id="display-name"
              value={nameValue}
              onChange={(e) => !isDemoUser && setNameValue(e.target.value)}
              placeholder="Your name"
              readOnly={isDemoUser}
              className={isDemoUser ? `${inputCls} cursor-not-allowed opacity-60` : inputCls}
            />
            {!isDemoUser && (
              <Button
                onClick={saveDisplayName}
                disabled={nameSaving}
                className="shrink-0 bg-[#C41230] text-white hover:bg-[#A10F29] disabled:opacity-50"
              >
                {nameSaving ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-sm text-white/60">Email</Label>
          <div className="flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white/50">
            {email}
          </div>
        </div>
      </Section>

      {/* Account */}
      <Section title="Account">
        <div className="flex flex-col gap-3 sm:flex-row">
          {!isDemoUser && (
            <Button
              onClick={changePassword}
              disabled={pwBusy}
              variant="outline"
              className="border-white/10 text-white/70 hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              {pwBusy ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </span>
              ) : (
                'Change Password'
              )}
            </Button>
          )}

          <Button
            onClick={signOut}
            variant="outline"
            className="border-white/10 text-white/70 hover:border-white/20 hover:text-white"
          >
            Sign Out
          </Button>
        </div>
      </Section>

      {/* Activity Types */}
      {!isDemoUser && (
        <Section title="Activity Types">
          <p className="-mt-2 text-xs text-white/40">Hide types you don&apos;t use</p>
          <div className="flex flex-wrap gap-2">
            {CROSS_TYPES.map((type) => {
              const isHidden = hiddenTypes.includes(type)
              const isOther = type === 'Other'
              const baseCls = 'rounded-full px-3 py-1 text-xs font-medium transition-colors'
              const cls = isHidden
                ? `${baseCls} cursor-pointer border border-white/10 bg-white/5 text-white/30 line-through`
                : isOther
                  ? `${baseCls} cursor-default bg-[#C41230] text-white opacity-70`
                  : `${baseCls} cursor-pointer bg-[#C41230] text-white hover:bg-[#A10F29]`
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleActivityType(type)}
                  disabled={isOther}
                  className={cls}
                >
                  {type}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-white/40">
            {visibleCount} of {CROSS_TYPES.length} types visible
          </p>
        </Section>
      )}

      {/* Integrations */}
      <Section title="Integrations">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">Strava</p>
          <p className="text-xs text-white/40">
            Strava sync is currently unavailable — Strava now requires a paid API
            subscription. You can still log activities manually below.
          </p>
        </div>
      </Section>

      {/* Import from Garmin */}
      {!isDemoUser && (
        <Section title="Import from Garmin">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Import from Garmin</p>
              <p className="text-xs text-white/40">
                Export your activities as CSV from connect.garmin.com (desktop browser) and upload here
              </p>
            </div>

            <input
              ref={garminInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                setGarminFile(e.target.files?.[0] ?? null)
                setGarminResult(null)
                setGarminError(null)
              }}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => garminInputRef.current?.click()}
                variant="outline"
                className="border-white/10 text-white/70 hover:border-white/20 hover:text-white"
              >
                <Upload className="mr-2 size-4" />
                Choose CSV
              </Button>

              {garminFile && (
                <>
                  <span className="text-xs text-white/50">{garminFile.name}</span>
                  <Button
                    type="button"
                    onClick={uploadGarminCsv}
                    disabled={garminUploading}
                    className="bg-[#C41230] text-white hover:bg-[#A10F29] disabled:opacity-50"
                  >
                    {garminUploading ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-4 animate-spin" />
                        Uploading…
                      </span>
                    ) : (
                      'Upload'
                    )}
                  </Button>
                </>
              )}
            </div>

            {garminResult && (
              <p className="text-xs text-green-400">
                Imported {garminResult.imported}{' '}
                {garminResult.imported === 1 ? 'activity' : 'activities'}, skipped{' '}
                {garminResult.skipped} {garminResult.skipped === 1 ? 'duplicate' : 'duplicates'}
              </p>
            )}
            {garminError && <p className="text-xs text-red-400">{garminError}</p>}
          </div>
        </Section>
      )}

      {/* About */}
      <Section title="About">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-white/50">
            <span>App Version</span>
            <span>1.0.0</span>
          </div>
          <div className="flex items-center justify-between text-white/50">
            <span>Website</span>
            <a
              href="https://www.batch-apps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D4AA] hover:underline"
            >
              batch-apps.com
            </a>
          </div>
          <p className="text-xs text-white/30">Part of the Batch ecosystem</p>
        </div>
      </Section>

      {email === 'carsonb1723@gmail.com' && (
        <div className="pt-2 text-center">
          <Link href="/admin" className="text-xs text-white/40 hover:text-white/60">
            Admin
          </Link>
        </div>
      )}

      {/* Danger Zone */}
      {!isDemoUser && <Section title="Danger Zone">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Delete All My Data</p>
            <p className="text-xs text-white/40">
              Permanently removes all runs, races, goals, and shoes
            </p>
          </div>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger className="inline-flex h-8 items-center rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none">
              Delete Data
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete All Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-white/60">
                  This will permanently delete all your runs, cross training,
                  races, goals, and shoes. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={deleteAllData}
                    disabled={deleting}
                    className="flex-1 bg-red-600 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Deleting…
                      </span>
                    ) : (
                      'Yes, delete everything'
                    )}
                  </Button>
                  <DialogClose className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white/60 hover:bg-white/10 hover:text-white/80 focus:outline-none">
                    Cancel
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Section>}
    </div>
  )
}
