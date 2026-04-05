export interface Goal {
  id: string
  period: 'week' | 'month' | 'year'
  target_miles: number
  current_miles: number
}

interface GoalProgressProps {
  goals: Goal[]
}

const periodLabels: Record<string, string> = {
  week: 'Weekly',
  month: 'Monthly',
  year: 'Yearly',
}

function ProgressRing({
  current,
  target,
}: {
  current: number
  target: number
}) {
  const pct = Math.min(current / target, 1)
  const radius = 36
  const stroke = 5
  const circumference = 2 * Math.PI * radius
  const offset = circumference - pct * circumference

  let ringColor = '#00D4AA'
  if (pct >= 1) ringColor = '#22c55e'
  else if (pct >= 0.85) ringColor = '#f59e0b'

  return (
    <svg width={90} height={90} className="shrink-0">
      <circle
        cx={45}
        cy={45}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={stroke}
      />
      <circle
        cx={45}
        cy={45}
        r={radius}
        fill="none"
        stroke={ringColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 45 45)"
        className="transition-all duration-500"
      />
      <text
        x={45}
        y={42}
        textAnchor="middle"
        className="fill-white text-sm font-bold"
        dominantBaseline="middle"
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

export function GoalProgress({ goals }: GoalProgressProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs uppercase tracking-widest text-white/40">
        Goals
      </h3>
      {goals.length === 0 && (
        <p className="py-4 text-center text-sm text-white/30">
          No active goals. Set one to track progress.
        </p>
      )}
      <div className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className="flex items-center gap-4">
            <ProgressRing current={goal.current_miles} target={goal.target_miles} />
            <div>
              <p className="text-sm font-medium text-white/80">
                {periodLabels[goal.period] || goal.period} Goal
              </p>
              <p className="text-sm text-white/50">
                {goal.current_miles.toFixed(1)} / {goal.target_miles} mi
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
