import type { Metadata } from "next"

// Default metadata that can be extended by individual pages
export const defaultMetadata: Metadata = {
  title: "Mizizzi E-commerce",
  description: "A modern e-commerce platform",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: { url: "/logo.png", sizes: "180x180" },
  },
}

// Default viewport configuration
export const defaultViewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
}

// Helper function to generate metadata for product pages
export function generateProductMetadata(product: any): Metadata {
  if (!product) return defaultMetadata

  return {
    ...defaultMetadata,
    title: `${product.name || "Product"} | Mizizzi E-commerce`,
    description: product.description?.substring(0, 160) || defaultMetadata.description,
    openGraph: {
      title: product.name,
      description: product.description?.substring(0, 160),
      images: [product.image_url || "/placeholder.svg"],
    },
  }
}

// Helper function to generate metadata for category pages
export function generateCategoryMetadata(category: any): Metadata {
  if (!category) return defaultMetadata

  return {
    ...defaultMetadata,
    title: `${category.name || "Category"} | Mizizzi E-commerce`,
    description: category.description?.substring(0, 160) || `Explore our ${category.name} collection`,
    openGraph: {
      title: category.name,
      description: category.description?.substring(0, 160) || `Explore our ${category.name} collection`,
      images: [category.image_url || "/placeholder.svg"],
    },
  }
}

