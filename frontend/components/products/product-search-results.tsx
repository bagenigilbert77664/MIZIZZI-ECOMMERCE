"use client"

import { forwardRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Product {
  id: number
  name: string
  price: number
  image: string
  category: string
}

interface ProductSearchResultsProps {
  results: Product[]
  isLoading: boolean
  selectedIndex: number
  onClose: () => void
}

export const ProductSearchResults = forwardRef<HTMLDivElement, ProductSearchResultsProps>(
  ({ results, isLoading, selectedIndex, onClose }, ref) => {
    if (isLoading) {
      return (
        <Card className="w-full overflow-hidden">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </Card>
      )
    }

    if (results.length === 0) {
      return (
        <Card className="w-full overflow-hidden">
          <div className="flex flex-col items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">No results found</p>
          </div>
        </Card>
      )
    }

    return (
      <Card className="w-full overflow-hidden border-none" ref={ref}>
        <div className="max-h-[400px] overflow-auto">
          {results.map((product, index) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              onClick={onClose}
              className={`flex items-start gap-3 p-3 transition-colors hover:bg-muted/50 ${
                index === selectedIndex ? "bg-muted" : ""
              }`}
            >
              <div className="relative h-16 w-16 flex-none overflow-hidden rounded-md bg-muted">
                <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{product.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-cherry-600">KSh {product.price.toLocaleString()}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {product.category}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    )
  },
)

ProductSearchResults.displayName = "ProductSearchResults"

