import { EditProductClient } from "./edit-product-client"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  console.log("[v0] EditProductPage: Awaiting params...")

  // In Next.js 15, params is a Promise that needs to be awaited
  const resolvedParams = await params
  const id = resolvedParams.id

  console.log("[v0] EditProductPage: Product ID resolved:", id)

  // Pass the unwrapped id to the client component
  return <EditProductClient productId={id} />
}
