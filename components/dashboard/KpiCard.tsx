interface KpiCardProps {
  label: string
  value: string
  unit?: string
  sublabel?: string
}

export function KpiCard({ label, value, unit, sublabel }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-widest text-white/50">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-white/40">{unit}</span>}
      </div>
      {sublabel && (
        <p className="mt-1 text-xs text-white/40">{sublabel}</p>
      )}
    </div>
  )
}
