import { redirect } from "next/navigation"

// This page redirects to the main product page
export default function ProductSlugPage({ params }: { params: { slug: string } }) {
  // Redirect to the main product page
  redirect(`/product/${params.slug}`)
}
