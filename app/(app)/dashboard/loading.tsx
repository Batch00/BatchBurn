export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* title */}
      <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
      </div>
      {/* 2 wide cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
      {/* 2 more wide cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
