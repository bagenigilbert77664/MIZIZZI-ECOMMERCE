import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function AccountNotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] py-12 text-center">
      <AlertTriangle className="h-16 w-16 text-cherry-800 mb-6" />
      <h1 className="text-3xl font-bold mb-2">Page Not Found</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        The account page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="bg-cherry-800 hover:bg-cherry-900">
        <Link href="/account">Go to Account Dashboard</Link>
      </Button>
    </div>
  )
}

