"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDownAZ, ArrowUpAZ, Star, BarChart2, SlidersHorizontal } from "lucide-react"

interface ProductSortProps {
  value: string
  onValueChange: (value: string) => void
}

export function ProductSort({ value, onValueChange }: ProductSortProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-9 w-[180px] border-gray-200 bg-white text-sm">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
            <SelectValue placeholder="Sort by..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="price-asc" className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <ArrowUpAZ className="h-3.5 w-3.5 text-gray-500" />
              <span>Price: Low to High</span>
            </div>
          </SelectItem>
          <SelectItem value="price-desc">
            <div className="flex items-center gap-2">
              <ArrowDownAZ className="h-3.5 w-3.5 text-gray-500" />
              <span>Price: High to Low</span>
            </div>
          </SelectItem>
          <SelectItem value="rating-desc">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-gray-500" />
              <span>Highest Rated</span>
            </div>
          </SelectItem>
          <SelectItem value="reviews-desc">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-3.5 w-3.5 text-gray-500" />
              <span>Most Reviewed</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

