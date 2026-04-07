const MAX_MILES = 400
const WARN_MILES = 350

export interface Shoe {
  id: string
  name: string
  current_miles: number
}

interface ShoeHealthWidgetProps {
  shoes: Shoe[]
}

function getMileageColor(miles: number): string {
  if (miles >= MAX_MILES) return 'text-red-400'
  if (miles >= WARN_MILES) return 'text-amber-400'
  return 'text-[#C41230]'
}

function getBarColor(miles: number): string {
  if (miles >= MAX_MILES) return 'bg-red-400'
  if (miles >= WARN_MILES) return 'bg-amber-400'
  return 'bg-[#C41230]'
}

export function ShoeHealthWidget({ shoes }: ShoeHealthWidgetProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs uppercase tracking-widest text-white/40">
        Shoe Health
      </h3>
      {shoes.length === 0 && (
        <p className="py-4 text-center text-sm text-white/30">
          No active shoes. Add a pair to track mileage.
        </p>
      )}
      <div className="space-y-3">
        {shoes.map((shoe) => {
          const pct = Math.min((shoe.current_miles / MAX_MILES) * 100, 100)
          return (
            <div key={shoe.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">{shoe.name}</span>
                <span className={`text-sm font-medium ${getMileageColor(shoe.current_miles)}`}>
                  {Math.round(shoe.current_miles)} mi
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(shoe.current_miles)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-white/30">
                {Math.max(0, MAX_MILES - Math.round(shoe.current_miles))} mi remaining
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
