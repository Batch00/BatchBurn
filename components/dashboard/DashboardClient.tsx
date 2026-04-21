'use client'

import { useState, useMemo } from 'react'
import { WeeklyMileageChart } from './WeeklyMileageChart'
import { ActivityFeed, type Activity } from './ActivityFeed'

const FILTER_CHIPS = [
  'All',
  'Easy',
  'Tempo',
  'Long',
  'Fartlek',
  'Hill',
  'Interval',
  'Bike',
  'Walk',
  'Stair Master',
] as const

type FilterChip = (typeof FILTER_CHIPS)[number]

const RUN_TYPE_SET = new Set(['Easy', 'Tempo', 'Long', 'Fartlek', 'Hill', 'Interval'])

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
  weeklyRuns: RawWeeklyRun[]
  weeklyCross: RawWeeklyCross[]
  weekBuckets: WeekBucket[]
  allActivities: Activity[]
}

export function DashboardClient({
  weeklyRuns,
  weeklyCross,
  weekBuckets,
  allActivities,
}: DashboardClientProps) {
  const [filter, setFilter] = useState<FilterChip>('All')
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null)

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
      } else if (RUN_TYPE_SET.has(filter)) {
        miles = weeklyRuns
          .filter((r) => r.date >= start && r.date <= end && r.run_type === filter)
          .reduce((s, r) => s + (r.distance_miles ?? 0), 0)
      } else {
        miles = weeklyCross
          .filter((c) => c.date >= start && c.date <= end && c.activity_type === filter)
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

    if (filter !== 'All') {
      result = result.filter((a) => {
        if (a.is_run) return a.type === filter
        return a.activity_type === filter
      })
    }

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
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              setFilter(chip)
              setSelectedWeekStart(null)
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
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
