'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface WeekData {
  week: string
  miles: number
}

interface WeeklyMileageChartProps {
  data: WeekData[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#161B22] px-3 py-2 text-sm shadow-lg">
      <p className="text-white/50">{label}</p>
      <p className="font-semibold text-white">{payload[0].value.toFixed(1)} mi</p>
    </div>
  )
}

export function WeeklyMileageChart({ data }: WeeklyMileageChartProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs uppercase tracking-widest text-white/40">
        Weekly Mileage
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="miles" fill="#00D4AA" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
