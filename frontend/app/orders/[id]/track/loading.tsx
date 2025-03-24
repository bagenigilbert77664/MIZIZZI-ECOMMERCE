import { Loader } from "@/components/ui/loader"

export default function OrderTrackingLoading() {
  return (
    <div className="container max-w-4xl py-10">
      <div className="flex flex-col items-center justify-center py-12">
        <Loader size="large" />
        <p className="mt-4 text-muted-foreground">Loading order tracking information...</p>
      </div>
    </div>
  )
}

