'use client'

import { useRouter } from 'next/navigation'
import { PaceTrendChart } from '@/components/charts/PaceTrendChart'
import { MileageByTypeChart } from '@/components/charts/MileageByTypeChart'
import { RunTypeDonut } from '@/components/charts/RunTypeDonut'
import { CrossTrainingChart } from '@/components/charts/CrossTrainingChart'

export interface MileageByTypeRow {
  week: string
  Easy: number
  Tempo: number
  Long: number
  Fartlek: number
  Hill: number
  Interval: number
}

export interface AnalyticsData {
  totalMiles: number
  totalTime: number
  avgPace: number
  totalRuns: number
  paceTrend: { week: string; pace: number }[]
  mileageByType: MileageByTypeRow[]
  runTypeDistribution: { type: string; miles: number }[]
  personalBests: {
    fastestPace: { value: number; date: string } | null
    longestRun: { value: number; date: string } | null
    longestStreak: { value: number; date: string } | null
    mostMilesWeek: { value: number; date: string } | null
  }
  crossTraining: { type: string; sessions: number; miles: number; duration: number }[]
}

type Period = 'month' | '3months' | 'year' | 'all'

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
]

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

function formatPace(seconds: number): string {
  if (!seconds) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

const PB_ROWS = [
  {
    key: 'fastestPace' as const,
    label: 'Fastest Pace',
    format: (v: number) => `${formatPace(v)} /mi`,
  },
  {
    key: 'longestRun' as const,
    label: 'Longest Run',
    format: (v: number) => `${v.toFixed(2)} mi`,
  },
  {
    key: 'longestStreak' as const,
    label: 'Longest Streak',
    format: (v: number) => `${v} day${v !== 1 ? 's' : ''}`,
  },
  {
    key: 'mostMilesWeek' as const,
    label: 'Most Miles in a Week',
    format: (v: number) => `${v.toFixed(1)} mi`,
  },
]

export function AnalyticsClient({
  data,
  period,
}: {
  data: AnalyticsData
  period: string
}) {
  const router = useRouter()

  function setPeriod(p: Period) {
    router.push(`/analytics?period=${p}`)
  }

  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex gap-2 flex-wrap">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              period === opt.value
                ? 'bg-[#00D4AA] text-[#0D1117]'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Section 1 — Performance Stats */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Performance</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40 mb-1">Total Miles</p>
            <p className="text-2xl font-bold text-white">{data.totalMiles.toFixed(1)}</p>
            <p className="text-xs text-white/40">mi</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40 mb-1">Total Time</p>
            <p className="text-2xl font-bold text-white">{formatTime(data.totalTime)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40 mb-1">Average Pace</p>
            <p className="text-2xl font-bold text-white">{formatPace(data.avgPace)}</p>
            <p className="text-xs text-white/40">/mi</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40 mb-1">Total Runs</p>
            <p className="text-2xl font-bold text-white">{data.totalRuns}</p>
          </div>
        </div>
      </div>

      {/* Section 2 — Pace Trend */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Pace Trend</p>
        {data.paceTrend.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/40 text-sm">
            No pace data for this period
          </div>
        ) : (
          <PaceTrendChart data={data.paceTrend} />
        )}
      </div>

      {/* Section 3 — Mileage by Run Type */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Mileage by Run Type</p>
        {data.mileageByType.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/40 text-sm">
            No mileage data for this period
          </div>
        ) : (
          <MileageByTypeChart data={data.mileageByType} />
        )}
      </div>

      {/* Section 4 — Run Type Distribution */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Run Type Distribution</p>
        {data.runTypeDistribution.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/40 text-sm">
            No run data for this period
          </div>
        ) : (
          <RunTypeDonut data={data.runTypeDistribution} totalMiles={data.totalMiles} />
        )}
      </div>

      {/* Section 5 — Personal Bests */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Personal Bests</p>
        <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/10">
          {PB_ROWS.map((row) => {
            const pb = data.personalBests[row.key]
            return (
              <div key={row.key} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-white/60">{row.label}</span>
                <div className="text-right">
                  {pb ? (
                    <>
                      <span className="text-sm font-semibold text-white">
                        {row.format(pb.value)}
                      </span>
                      <span className="ml-3 text-xs text-white/40">{formatDate(pb.date)}</span>
                    </>
                  ) : (
                    <span className="text-sm text-white/30">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 6 — Cross Training Breakdown */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Cross Training</p>
        {data.crossTraining.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/40 text-sm">
            No cross training data for this period
          </div>
        ) : (
          <CrossTrainingChart data={data.crossTraining} />
        )}
      </div>
    </div>
  )
}
