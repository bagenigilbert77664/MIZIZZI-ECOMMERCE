export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-20 bg-white rounded-lg animate-pulse" />
        <div className="h-32 bg-white rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-white rounded-lg animate-pulse" />
          <div className="h-32 bg-white rounded-lg animate-pulse" />
          <div className="h-32 bg-white rounded-lg animate-pulse" />
          <div className="h-32 bg-white rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-white rounded-lg animate-pulse" />
          <div className="h-96 bg-white rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
