import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <h2 className="mb-2 text-2xl font-bold">Category Not Found</h2>
      <p className="mb-8 text-muted-foreground">The category you're looking for doesn't exist or has been removed.</p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  )
}

