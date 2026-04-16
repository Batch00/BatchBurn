'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const RUN_TYPE_COLORS: Record<string, string> = {
  Easy: '#3B82F6',
  Tempo: '#F97316',
  Long: '#16A34A',
  Fartlek: '#EAB308',
  Hill: '#EF4444',
  Interval: '#EC4899',
}

function getColor(type: string): string {
  return RUN_TYPE_COLORS[type] ?? '#6B7280'
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { type: string; miles: number } }>
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-lg border border-white/10 bg-[#161B22] px-3 py-2 text-sm shadow-lg">
      <p className="text-white/50">{entry.name}</p>
      <p className="font-semibold text-white">{entry.value.toFixed(1)} mi</p>
    </div>
  )
}

export function RunTypeDonut({
  data,
  totalMiles,
}: {
  data: { type: string; miles: number }[]
  totalMiles: number
}) {
  const chartData = data.map((d) => ({ name: d.type, value: d.miles }))

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{totalMiles.toFixed(1)}</div>
            <div className="text-xs text-white/40">mi total</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {data.map((d) => (
          <div key={d.type} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: getColor(d.type) }}
            />
            <span className="text-xs text-white/50">
              {d.type} ({d.miles.toFixed(1)} mi)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
