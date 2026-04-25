'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShoeRow = {
  id: string
  name: string
  is_active: boolean
  initial_miles: number | null
  price_usd: number | null
  purchase_date: string | null
  notes: string | null
  retired_date: string | null
  computed_miles: number
  run_count: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_MILES = 400
const WARN_MILES = 350

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBarColor(miles: number): string {
  if (miles >= MAX_MILES) return 'bg-[#C41230]'
  if (miles >= WARN_MILES) return 'bg-[#F59E0B]'
  return 'bg-[#16A34A]'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const shoeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price_usd: z.coerce.number().min(0).optional().or(z.literal('')),
  initial_miles: z.coerce.number().min(0).optional().or(z.literal('')),
  purchase_date: z.string().optional(),
  notes: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Edit Shoe Modal
// ---------------------------------------------------------------------------

function EditShoeModal({
  shoe,
  onClose,
  onSaved,
}: {
  shoe: ShoeRow
  onClose: () => void
  onSaved: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(shoeSchema),
    defaultValues: {
      name: shoe.name,
      price_usd: shoe.price_usd ?? ('' as unknown as number),
      initial_miles: shoe.initial_miles ?? ('' as unknown as number),
      purchase_date: shoe.purchase_date ?? '',
      notes: shoe.notes ?? '',
    },
  })

  async function onSubmit(data: z.infer<typeof shoeSchema>) {
    setSubmitError(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('shoes')
      .update({
        name: data.name,
        price_usd:
          data.price_usd !== '' && data.price_usd != null
            ? Number(data.price_usd)
            : null,
        initial_miles:
          data.initial_miles !== '' && data.initial_miles != null
            ? Number(data.initial_miles)
            : 0,
        purchase_date: data.purchase_date || null,
        notes: data.notes || null,
      })
      .eq('id', shoe.id)
    if (error) {
      setSubmitError(error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#161B22] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">Edit Shoe</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-shoe-name" className="text-sm text-white/60">
              Shoe Name
            </Label>
            <Input
              id="edit-shoe-name"
              placeholder="e.g. Nike Pegasus 41"
              className={inputCls}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-shoe-price" className="text-sm text-white/60">
                Price <span className="text-white/30">(optional)</span>
              </Label>
              <Input
                id="edit-shoe-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={inputCls}
                {...register('price_usd')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-shoe-initial" className="text-sm text-white/60">
                Starting Miles <span className="text-white/30">(optional)</span>
              </Label>
              <Input
                id="edit-shoe-initial"
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                className={inputCls}
                {...register('initial_miles')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-shoe-date" className="text-sm text-white/60">
              Purchase Date <span className="text-white/30">(optional)</span>
            </Label>
            <Input
              id="edit-shoe-date"
              type="date"
              className={inputCls}
              {...register('purchase_date')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-shoe-notes" className="text-sm text-white/60">
              Notes <span className="text-white/30">(optional)</span>
            </Label>
            <Textarea
              id="edit-shoe-notes"
              rows={3}
              placeholder="Color, model year, etc."
              {...register('notes')}
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-400">{submitError}</p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#C41230] font-semibold text-white hover:bg-[#A10F29] disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shoe Card
// ---------------------------------------------------------------------------

function ShoeCard({
  shoe,
  userId,
  onRefresh,
  isDemoUser = false,
  isPrimary = false,
  onSetPrimary,
}: {
  shoe: ShoeRow
  userId: string
  onRefresh: () => void
  isDemoUser?: boolean
  isPrimary?: boolean
  onSetPrimary?: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [primaryBusy, setPrimaryBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function setPrimary() {
    setPrimaryBusy(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .upsert({ user_id: userId, primary_shoe_id: shoe.id }, { onConflict: 'user_id' })
    setPrimaryBusy(false)
    onSetPrimary?.()
  }

  const miles = shoe.computed_miles
  const pct = Math.min((miles / MAX_MILES) * 100, 100)
  const pricePerMile =
    shoe.price_usd && miles > 0
      ? `$${(shoe.price_usd / miles).toFixed(2)}`
      : '--'

  async function toggleRetired() {
    setBusy(true)
    const supabase = createClient()
    if (shoe.is_active) {
      await supabase
        .from('shoes')
        .update({ is_active: false, retired_date: todayStr() })
        .eq('id', shoe.id)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('shoes')
        .update({ is_active: true, retired_date: null })
        .eq('id', shoe.id)
        .eq('user_id', userId)
    }
    setBusy(false)
    onRefresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('runs').update({ shoe_id: null }).eq('shoe_id', shoe.id)
    await supabase.from('shoes').delete().eq('id', shoe.id)
    setDeleting(false)
    setConfirmDelete(false)
    router.refresh()
    onRefresh()
  }

  if (confirmDelete) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="mb-1 text-sm font-medium text-white">Delete {shoe.name}?</p>
        <p className="mb-4 text-xs text-white/50">
          This shoe has {shoe.run_count} {shoe.run_count === 1 ? 'run' : 'runs'} linked.
          Deleting will unlink them.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="flex-1 rounded-md border border-white/10 py-1.5 text-sm text-white/60 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-md bg-red-600/80 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="mx-auto size-4 animate-spin" />
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {editOpen && (
        <EditShoeModal
          shoe={shoe}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            router.refresh()
            onRefresh()
          }}
        />
      )}
      <div
        className={`rounded-xl border border-white/10 bg-white/5 p-5 transition-opacity ${
          shoe.is_active ? '' : 'opacity-50'
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white">
                {shoe.name}
              </h3>
              {isPrimary && (
                <span className="shrink-0 rounded-md bg-[#C41230]/20 px-2 py-0.5 text-xs font-medium text-[#C41230]">
                  Primary
                </span>
              )}
              {!shoe.is_active && (
                <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/40">
                  Retired
                </span>
              )}
            </div>
            {shoe.purchase_date && (
              <p className="mt-0.5 text-xs text-white/50">
                {formatDate(shoe.purchase_date)}
              </p>
            )}
          </div>

          {!isDemoUser && (
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="flex flex-col gap-1.5">
                <Button
                  onClick={toggleRetired}
                  disabled={busy}
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : shoe.is_active ? (
                    'Retire'
                  ) : (
                    'Reactivate'
                  )}
                </Button>
                {shoe.is_active && !isPrimary && (
                  <Button
                    onClick={setPrimary}
                    disabled={primaryBusy}
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                  >
                    {primaryBusy ? <Loader2 className="size-3.5 animate-spin" /> : 'Set Primary'}
                  </Button>
                )}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex size-7 items-center justify-center rounded-md text-white/30 hover:bg-white/10 hover:text-white/60"
                >
                  <MoreHorizontal className="size-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 z-10 min-w-[120px] rounded-lg border border-white/10 bg-[#161B22] py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setEditOpen(true)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setConfirmDelete(true)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mileage */}
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white">
            {miles.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-white/40">mi</span>
          </span>
          <span className="text-sm text-white/40">/ {MAX_MILES} mi</span>
        </div>

        {/* Progress bar */}
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1c2128]">
          <div
            className={`h-full rounded-full transition-all ${getBarColor(miles)}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Warning text */}
        {miles >= MAX_MILES && (
          <p className="mb-2 text-xs font-medium text-[#C41230]">Replace soon</p>
        )}
        {miles >= WARN_MILES && miles < MAX_MILES && (
          <p className="mb-2 text-xs font-medium text-[#F59E0B]">
            Approaching limit
          </p>
        )}

        {/* Price per mile */}
        <p className="text-xs text-white/30">
          {pricePerMile} / mi
          {shoe.price_usd ? (
            <span className="ml-2 text-white/20">
              (${shoe.price_usd} paid)
            </span>
          ) : null}
        </p>

        {/* Notes */}
        {shoe.notes && (
          <p className="mt-2 text-xs text-white/40">{shoe.notes}</p>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Add Shoe Form
// ---------------------------------------------------------------------------

function AddShoeForm({
  userId,
  onSuccess,
}: {
  userId: string
  onSuccess: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(shoeSchema),
    defaultValues: {
      name: '',
      price_usd: '' as unknown as number,
      initial_miles: '' as unknown as number,
      purchase_date: '',
      notes: '',
    },
  })

  async function onSubmit(data: z.infer<typeof shoeSchema>) {
    setSubmitError(null)
    const supabase = createClient()
    const { error } = await supabase.from('shoes').insert({
      user_id: userId,
      name: data.name,
      price_usd: data.price_usd !== '' && data.price_usd != null ? Number(data.price_usd) : null,
      initial_miles: data.initial_miles !== '' && data.initial_miles != null ? Number(data.initial_miles) : 0,
      purchase_date: data.purchase_date || null,
      notes: data.notes || null,
      is_active: true,
    })
    if (error) {
      setSubmitError(error.message)
      return
    }
    reset()
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="shoe-name" className="text-sm text-white/60">
          Shoe Name
        </Label>
        <Input
          id="shoe-name"
          placeholder="e.g. Nike Pegasus 41"
          className={inputCls}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="shoe-price" className="text-sm text-white/60">
            Price <span className="text-white/30">(optional)</span>
          </Label>
          <Input
            id="shoe-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className={inputCls}
            {...register('price_usd')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="shoe-initial" className="text-sm text-white/60">
            Starting Miles <span className="text-white/30">(optional)</span>
          </Label>
          <Input
            id="shoe-initial"
            type="number"
            step="0.1"
            min="0"
            placeholder="0"
            className={inputCls}
            {...register('initial_miles')}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="shoe-date" className="text-sm text-white/60">
          Purchase Date <span className="text-white/30">(optional)</span>
        </Label>
        <Input
          id="shoe-date"
          type="date"
          className={inputCls}
          {...register('purchase_date')}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="shoe-notes" className="text-sm text-white/60">
          Notes <span className="text-white/30">(optional)</span>
        </Label>
        <Textarea
          id="shoe-notes"
          rows={3}
          placeholder="Color, model year, etc."
          {...register('notes')}
        />
      </div>

      {submitError && <p className="text-sm text-red-400">{submitError}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#C41230] font-semibold text-white hover:bg-[#A10F29] disabled:opacity-50"
        size="lg"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </span>
        ) : (
          'Add Shoe'
        )}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface ShoesClientProps {
  initialShoes: ShoeRow[]
  userId: string
  isDemoUser?: boolean
  initialPrimaryShoeId?: string | null
}

export function ShoesClient({
  initialShoes,
  userId,
  isDemoUser = false,
  initialPrimaryShoeId = null,
}: ShoesClientProps) {
  const [shoes, setShoes] = useState<ShoeRow[]>(initialShoes)
  const [primaryShoeId, setPrimaryShoeId] = useState<string | null>(initialPrimaryShoeId ?? null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function fetchShoes() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('shoes')
      .select('id, name, is_active, initial_miles, price_usd, purchase_date, notes, retired_date, runs(distance_miles)')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('name')

    if (data) {
      setShoes(
        data.map((s) => {
          const runs = Array.isArray(s.runs)
            ? (s.runs as { distance_miles: number | null }[])
            : []
          const runMiles = runs.reduce((sum, r) => sum + (r.distance_miles ?? 0), 0)
          return {
            id: s.id as string,
            name: s.name as string,
            is_active: s.is_active as boolean,
            initial_miles: s.initial_miles as number | null,
            price_usd: s.price_usd as number | null,
            purchase_date: s.purchase_date as string | null,
            notes: s.notes as string | null,
            retired_date: s.retired_date as string | null,
            computed_miles: runMiles + (s.initial_miles as number | null ?? 0),
            run_count: runs.length,
          }
        }),
      )
    }
    setLoading(false)
  }

  const active = shoes.filter((s) => s.is_active)
  const retired = shoes.filter((s) => !s.is_active)

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">
          {shoes.length} {shoes.length === 1 ? 'shoe' : 'shoes'}
          {loading && <Loader2 className="ml-2 inline size-3.5 animate-spin" />}
        </p>

        {!isDemoUser && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#C41230] px-2.5 text-sm font-medium text-white transition-colors hover:bg-[#A10F29] focus:outline-none">
            <Plus className="size-4" />
            Add Shoe
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Shoe</DialogTitle>
            </DialogHeader>
            <AddShoeForm
              userId={userId}
              onSuccess={() => {
                setOpen(false)
                fetchShoes()
              }}
            />
          </DialogContent>
        </Dialog>}
      </div>

      {/* Active shoes */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-white/40">Active</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((shoe) => (
              <ShoeCard
                key={shoe.id}
                shoe={shoe}
                userId={userId}
                onRefresh={fetchShoes}
                isDemoUser={isDemoUser}
                isPrimary={primaryShoeId === shoe.id}
                onSetPrimary={() => setPrimaryShoeId(shoe.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Retired shoes */}
      {retired.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-white/40">Retired</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {retired.map((shoe) => (
              <ShoeCard
                key={shoe.id}
                shoe={shoe}
                userId={userId}
                onRefresh={fetchShoes}
                isDemoUser={isDemoUser}
                isPrimary={false}
              />
            ))}
          </div>
        </section>
      )}

      {shoes.length === 0 && !loading && (
        <div className="rounded-xl border border-white/10 bg-white/5 py-16 text-center">
          <p className="text-sm text-white/30">
            No shoes yet. Add your first pair to start tracking mileage.
          </p>
        </div>
      )}
    </div>
  )
}
