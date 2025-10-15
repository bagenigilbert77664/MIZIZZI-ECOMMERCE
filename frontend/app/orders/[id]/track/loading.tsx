import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function OrderTrackingLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-2 w-full mb-6" />
            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start">
                  <Skeleton className="h-8 w-8 rounded-full mr-4" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(i === 0 ? 3 : 2)].map((_, j) => (
                    <div key={j} className="flex justify-between">
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

