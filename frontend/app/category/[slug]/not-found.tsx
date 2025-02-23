import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center">
      <h2 className="mb-2 text-2xl font-bold">Category Not Found</h2>
      <p className="mb-8 text-muted-foreground">Could not find the requested category.</p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  )
}

