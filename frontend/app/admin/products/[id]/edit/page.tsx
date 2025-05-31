import { EditProductClient } from "./edit-product-client"
import { notFound } from "next/navigation"

// This is a server component that properly awaits the params
export default async function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  try {
    // Get the product ID from params
    const id = params.id

    // Validate the ID is a valid format before passing to client
    if (!id || !/^\d+$/.test(id)) {
      console.error("Invalid product ID:", id)
      return notFound()
    }

    console.log("Rendering edit page for product ID:", id)

    // Pass the ID to the client component
    return <EditProductClient productId={id} />
  } catch (error) {
    console.error("Error in EditProductPage:", error)
    return notFound()
  }
}
