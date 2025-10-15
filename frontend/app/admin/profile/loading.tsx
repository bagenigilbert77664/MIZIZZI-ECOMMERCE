import { AppleSpinner } from "@/components/ui/apple-spinner"

export default function AdminProfileLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <AppleSpinner size="lg" />
        <p className="text-sm text-slate-600 font-medium">Loading profile...</p>
      </div>
    </div>
  )
}
