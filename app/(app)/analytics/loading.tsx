export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0D1117] p-4 space-y-4">
      <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
      {/* 4 stat cards in a row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
      </div>
      {/* 2 chart skeletons */}
      <div className="h-56 w-full bg-white/5 rounded-xl animate-pulse" />
      <div className="h-56 w-full bg-white/5 rounded-xl animate-pulse" />
    </div>
  )
}
