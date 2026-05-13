'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const CROSS_TYPE_COLORS: Record<string, string> = {
  Bike: '#3B82F6',
  Walk: '#16A34A',
  'Stair Master': '#F97316',
  Swim: '#06B6D4',
  Strength: '#9333EA',
  Yoga: '#EC4899',
  Soccer: '#16A34A',
  Tennis: '#EAB308',
  Pickleball: '#F97316',
  Basketball: '#EF4444',
  Hiking: '#16A34A',
  Treadmill: '#3B82F6',
  Elliptical: '#9333EA',
  Rowing: '#06B6D4',
  Climbing: '#EC4899',
  Other: '#6B7280',
}

function getColor(type: string): string {
  return CROSS_TYPE_COLORS[type] ?? '#9333EA'
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { type: string; sessions: number; miles: number; duration: number } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-white/10 bg-[#161B22] px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-white/60">
        Sessions: <span className="text-white">{d.sessions}</span>
      </p>
      {d.miles > 0 && (
        <p className="text-white/60">
          Miles: <span className="text-white">{d.miles.toFixed(1)} mi</span>
        </p>
      )}
      {d.duration > 0 && (
        <p className="text-white/60">
          Time: <span className="text-white">{formatDuration(d.duration)}</span>
        </p>
      )}
    </div>
  )
}

export function CrossTrainingChart({
  data,
}: {
  data: { type: string; sessions: number; miles: number; duration: number }[]
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          barCategoryGap="30%"
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="type"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            width={32}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.type)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
