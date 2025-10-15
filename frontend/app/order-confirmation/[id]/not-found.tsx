import Link from "next/link"
import { PackageSearch } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container max-w-4xl mx-auto py-16 px-4 text-center">
      <PackageSearch className="h-20 w-20 mx-auto text-gray-400 mb-6" />
      <h1 className="text-3xl font-bold mb-4">Order Not Found</h1>
      <p className="text-gray-600 max-w-md mx-auto mb-8">
        We couldn't find the order you're looking for. It may have been removed or you may have mistyped the order ID.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild variant="default" className="bg-green-600 hover:bg-green-700">
          <Link href="/">Return to Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/orders">View My Orders</Link>
        </Button>
      </div>
    </div>
  )
}
