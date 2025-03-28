import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function InvoiceLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Skeleton className="h-8 w-40" />
          <div className="flex flex-wrap gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-28" />
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between mb-8">
              <div>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="mt-6 md:mt-0 md:text-right">
                <Skeleton className="h-6 w-24 mb-2 ml-auto" />
                <Skeleton className="h-4 w-40 mb-1 ml-auto" />
                <Skeleton className="h-4 w-36 mb-1 ml-auto" />
                <Skeleton className="h-4 w-32 mb-1 ml-auto" />
                <Skeleton className="h-4 w-32 ml-auto" />
              </div>
            </div>

            <div className="mb-8">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-12 py-2 border-b">
                <Skeleton className="h-4 w-16 col-span-6" />
                <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
                <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
                <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
              </div>
              {[...Array(2)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 py-3 border-b">
                  <Skeleton className="h-4 w-32 col-span-6" />
                  <Skeleton className="h-4 w-8 col-span-2 ml-auto" />
                  <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
                  <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between py-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between py-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-4 w-32 mb-4" />

              <div className="mt-6">
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

