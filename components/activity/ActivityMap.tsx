import polyline from '@mapbox/polyline'

const W = 600
const H = 320
const PAD = 16

export function ActivityMap({ encoded }: { encoded: string }) {
  let coords: [number, number][] = []
  try {
    coords = polyline.decode(encoded) as [number, number][]
  } catch {
    return null
  }
  if (coords.length < 2) return null

  const lats = coords.map((c) => c[0])
  const lngs = coords.map((c) => c[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 0.0001
  const lngRange = maxLng - minLng || 0.0001

  const scale = Math.min((W - 2 * PAD) / lngRange, (H - 2 * PAD) / latRange)
  const offsetX = (W - lngRange * scale) / 2
  const offsetY = (H - latRange * scale) / 2

  const points = coords
    .map(([lat, lng]) => {
      const x = offsetX + (lng - minLng) * scale
      const y = offsetY + (maxLat - lat) * scale
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full rounded-lg border border-white/10 bg-[#0a0d12]"
      aria-label="Activity route"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#C41230"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
