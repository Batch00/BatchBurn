'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface PaceTrendData {
  week: string
  pace: number
}

function formatPace(seconds: number): string {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#161B22] px-3 py-2 text-sm shadow-lg">
      <p className="text-white/50">{label}</p>
      <p className="font-semibold text-white">{formatPace(payload[0].value)} /mi</p>
    </div>
  )
}

export function PaceTrendChart({ data }: { data: PaceTrendData[] }) {
  const paces = data.map((d) => d.pace)
  const minPace = Math.min(...paces)
  const maxPace = Math.max(...paces)
  const padding = Math.max(30, (maxPace - minPace) * 0.1)
  const domainMin = Math.max(0, minPace - padding)
  const domainMax = maxPace + padding

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            width={40}
            domain={[domainMin, domainMax]}
            tickFormatter={formatPace}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
          <Line
            type="monotone"
            dataKey="pace"
            stroke="#C41230"
            strokeWidth={2}
            dot={{ r: 4, fill: '#C41230', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#C41230', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
