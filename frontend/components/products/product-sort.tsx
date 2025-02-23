"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ProductSortProps {
  value: string
  onValueChange: (value: string) => void
}

export function ProductSort({ value, onValueChange }: ProductSortProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="price-asc">Price: Low to High</SelectItem>
        <SelectItem value="price-desc">Price: High to Low</SelectItem>
        <SelectItem value="rating-desc">Highest Rated</SelectItem>
        <SelectItem value="reviews-desc">Most Reviewed</SelectItem>
      </SelectContent>
    </Select>
  )
}

