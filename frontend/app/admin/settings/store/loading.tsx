import { RefreshCw } from "lucide-react"

export default function StoreSettingsLoading() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading store settings...</p>
        </div>
      </div>
    </div>
  )
}
