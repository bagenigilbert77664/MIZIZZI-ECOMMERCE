import { EditProductClient } from "./edit-product-client"

// This is a server component that properly awaits the params
export default async function EditProductPage({ params }: { params: { id: string } }) {
  // In Next.js 15, params is a Promise that needs to be awaited
  const id = (await params).id

  // Pass the unwrapped id to the client component
  return <EditProductClient productId={id} />
}
