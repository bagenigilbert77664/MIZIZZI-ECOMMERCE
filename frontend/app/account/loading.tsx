import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AccountLoading() {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Skeleton */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <div className="p-6 bg-gray-200">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {Array(8)
                    .fill(null)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full mb-2" />
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Navigation Skeleton */}
          <div className="md:hidden mb-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="flex gap-2">
              {Array(4)
                .fill(null)
                .map((_, i) => (
                  <Skeleton key={i} className="h-9 w-24" />
                ))}
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="md:col-span-3">
            <Skeleton className="h-10 w-60 mb-6 hidden md:block" />

            {/* Account Details Card Skeleton */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>

            {/* Address Book Card Skeleton */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>

            {/* Newsletter Preferences Card Skeleton */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>

            {/* Quick Links Skeleton */}
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array(6)
                .fill(null)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex flex-col items-center">
                      <Skeleton className="h-8 w-8 rounded-full mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

