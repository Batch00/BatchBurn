'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { MileageByTypeRow } from '@/components/analytics/AnalyticsClient'

const RUN_TYPE_COLORS: Record<string, string> = {
  Easy: '#3B82F6',
  Tempo: '#F97316',
  Long: '#16A34A',
  Fartlek: '#EAB308',
  Hill: '#EF4444',
  Interval: '#EC4899',
}

const RUN_TYPES = ['Easy', 'Tempo', 'Long', 'Fartlek', 'Hill', 'Interval'] as const

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const hasData = payload.some((p) => p.value > 0)
  if (!hasData) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#161B22] px-3 py-2 text-sm shadow-lg">
      <p className="text-white/50 mb-1">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-white/70">{p.name}:</span>
            <span className="font-semibold text-white">{p.value.toFixed(1)} mi</span>
          </div>
        ))}
    </div>
  )
}

export function MileageByTypeChart({ data }: { data: MileageByTypeRow[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          {RUN_TYPES.map((type) => (
            <Bar
              key={type}
              dataKey={type}
              stackId="a"
              fill={RUN_TYPE_COLORS[type]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {RUN_TYPES.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: RUN_TYPE_COLORS[type] }}
            />
            <span className="text-xs text-white/50">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
