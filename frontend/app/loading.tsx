import { Loader } from "@/components/ui/loader"

export default function Loading() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
      <Loader />
    </div>
  )
}
