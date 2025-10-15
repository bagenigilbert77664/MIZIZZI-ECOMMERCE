export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-20 bg-white rounded-lg animate-pulse" />
        <div className="h-32 bg-white rounded-lg animate-pulse" />
        <div className="h-96 bg-white rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
