'use client'

import { useState, useMemo } from 'react'
import { WeeklyMileageChart } from './WeeklyMileageChart'
import { ActivityFeed, type Activity } from './ActivityFeed'
import { KpiCard } from './KpiCard'
import { formatPace, formatDuration } from '@/lib/utils/pace'

type FilterMode = 'All' | 'Runs' | 'Cross Training'
const CHIPS: FilterMode[] = ['All', 'Runs', 'Cross Training']

type KpiMode = 'runs' | 'active'
const KPI_MODES: { id: KpiMode; label: string }[] = [
  { id: 'runs', label: 'Runs' },
  { id: 'active', label: 'All Active' },
]

export interface WeekBucket {
  label: string
  start: string
  end: string
}

export interface RawWeeklyRun {
  date: string
  distance_miles: number | null
  run_type: string | null
}

export interface RawWeeklyCross {
  date: string
  distance_miles: number | null
  activity_type: string | null
}

interface DashboardClientProps {
  wtdMiles: number
  mtdMiles: number
  ytdMiles: number
  avgPace: number
  activeWtdMiles: number
  activeMtdMiles: number
  activeYtdMiles: number
  activeWtdDuration: number
  weeklyRuns: RawWeeklyRun[]
  weeklyCross: RawWeeklyCross[]
  weekBuckets: WeekBucket[]
  allActivities: Activity[]
}

export function DashboardClient({
  wtdMiles,
  mtdMiles,
  ytdMiles,
  avgPace,
  activeWtdMiles,
  activeMtdMiles,
  activeYtdMiles,
  activeWtdDuration,
  weeklyRuns,
  weeklyCross,
  weekBuckets,
  allActivities,
}: DashboardClientProps) {
  const [kpiMode, setKpiMode] = useState<KpiMode>('runs')
  const [filter, setFilter] = useState<FilterMode>('All')
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null)

  const isActive = kpiMode === 'active'
  const kpiSublabel = isActive ? 'all active' : 'runs only'
  const displayWtd = isActive ? activeWtdMiles : wtdMiles
  const displayMtd = isActive ? activeMtdMiles : mtdMiles
  const displayYtd = isActive ? activeYtdMiles : ytdMiles

  const chartData = useMemo(() => {
    return weekBuckets.map(({ label, start, end }) => {
      let miles = 0
      if (filter === 'All') {
        miles =
          weeklyRuns
            .filter((r) => r.date >= start && r.date <= end)
            .reduce((s, r) => s + (r.distance_miles ?? 0), 0) +
          weeklyCross
            .filter((c) => c.date >= start && c.date <= end)
            .reduce((s, c) => s + (c.distance_miles ?? 0), 0)
      } else if (filter === 'Runs') {
        miles = weeklyRuns
          .filter((r) => r.date >= start && r.date <= end)
          .reduce((s, r) => s + (r.distance_miles ?? 0), 0)
      } else {
        miles = weeklyCross
          .filter((c) => c.date >= start && c.date <= end)
          .reduce((s, c) => s + (c.distance_miles ?? 0), 0)
      }
      return { week: label, weekStart: start, miles: parseFloat(miles.toFixed(2)) }
    })
  }, [weeklyRuns, weeklyCross, weekBuckets, filter])

  const feedActivities = useMemo(() => {
    let result = allActivities

    if (selectedWeekStart) {
      const weekEnd = new Date(selectedWeekStart + 'T00:00:00')
      weekEnd.setDate(weekEnd.getDate() + 6)
      const endStr = weekEnd.toISOString().split('T')[0]
      result = result.filter((a) => a.date >= selectedWeekStart && a.date <= endStr)
    }

    if (filter === 'Runs') result = result.filter((a) => a.is_run)
    else if (filter === 'Cross Training') result = result.filter((a) => !a.is_run)

    return result.slice(0, 5)
  }, [allActivities, selectedWeekStart, filter])

  function handleWeekClick(weekStart: string) {
    setSelectedWeekStart((prev) => (prev === weekStart ? null : weekStart))
  }

  const weekLabel = selectedWeekStart
    ? new Date(selectedWeekStart + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <>
      {/* KPI mode toggle */}
      <div className="flex flex-wrap gap-2">
        {KPI_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setKpiMode(mode.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              kpiMode === mode.id
                ? 'bg-[#C41230] text-white'
                : 'border border-white/10 bg-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="WTD Miles"
          value={displayWtd.toFixed(1)}
          unit="miles"
          sublabel={kpiSublabel}
        />
        <KpiCard
          label="MTD Miles"
          value={displayMtd.toFixed(1)}
          unit="miles"
          sublabel={kpiSublabel}
        />
        <KpiCard
          label="YTD Miles"
          value={displayYtd.toFixed(1)}
          unit="miles"
          sublabel={kpiSublabel}
        />
        {isActive ? (
          <KpiCard
            label="Total Time"
            value={activeWtdDuration > 0 ? formatDuration(activeWtdDuration) : '0:00'}
            sublabel="This week · all active"
          />
        ) : (
          <KpiCard
            label="Avg Pace"
            value={avgPace > 0 ? formatPace(avgPace) : '--:--'}
            unit="min/mi"
            sublabel="This week · runs only"
          />
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              setFilter(chip)
              setSelectedWeekStart(null)
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === chip
                ? 'bg-[#C41230] text-white'
                : 'border border-white/10 bg-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chart + Feed */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyMileageChart
          data={chartData}
          selectedWeekStart={selectedWeekStart}
          onWeekClick={handleWeekClick}
        />
        <div className="space-y-3">
          {selectedWeekStart && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">Week of {weekLabel}</p>
              <button
                type="button"
                onClick={() => setSelectedWeekStart(null)}
                className="text-xs text-white/40 hover:text-white/70"
              >
                Clear
              </button>
            </div>
          )}
          <ActivityFeed activities={feedActivities} />
        </div>
      </div>
    </>
  )
}
