import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Product {
  id: number
  name: string
  price: number
  image: string
  category: string
  rating?: number
  reviews?: number
  originalPrice?: number
}

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <div
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          className,
        )}
      >
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
          {product.originalPrice && (
            <div className="absolute left-3 top-3 rounded-full bg-cherry-800 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
            </div>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/90 p-0 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white hover:text-cherry-700"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2">
            <span className="inline-block rounded-sm bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700">
              {product.category}
            </span>
          </div>
          <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 min-h-[40px]">{product.name}</h3>
          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-cherry-800">KSh {product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <span className="text-xs text-gray-500 line-through">KSh {product.originalPrice.toLocaleString()}</span>
              )}
            </div>
          </div>
          {product.rating && (
            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`h-4 w-4 ${i < Math.floor(product.rating ?? 0) ? "fill-yellow-400" : "fill-gray-200"}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700">{product.rating.toFixed(1)}</span>
                {product.reviews && <span className="ml-1 text-xs text-gray-500">({product.reviews})</span>}
              </div>
            </div>
          )}
          <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              variant="ghost"
              className="w-full text-xs font-medium text-cherry-800 hover:bg-cherry-50 hover:text-cherry-900 border border-cherry-100"
            >
              Quick View
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}