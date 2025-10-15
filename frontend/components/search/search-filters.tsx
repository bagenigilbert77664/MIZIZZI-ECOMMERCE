"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Filter, ChevronDown, ChevronUp } from "lucide-react"
import { searchService, type SearchFilters, type FilterOption } from "@/services/search"
import { cn } from "@/lib/utils"

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  className?: string
}

interface FilterSection {
  title: string
  key: string
  isOpen: boolean
}

export function SearchFiltersComponent({ filters, onFiltersChange, className }: SearchFiltersProps) {
  const [availableFilters, setAvailableFilters] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    brands: true,
    price: true,
    rating: true,
    features: true,
  })

  useEffect(() => {
    fetchAvailableFilters()
  }, [])

  const fetchAvailableFilters = async () => {
    try {
      setIsLoading(true)
      const response = await searchService.getSearchFilters()
      setAvailableFilters(response.filters)
    } catch (error) {
      console.error("Error fetching filters:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters }

    if (value === undefined || value === null || value === "") {
      delete newFilters[key]
    } else {
      newFilters[key] = value
    }

    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const getActiveFiltersCount = () => {
    return Object.keys(filters).length
  }

  if (isLoading) {
    return (
      <div className={cn("w-full max-w-sm", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!availableFilters) {
    return null
  }

  return (
    <div className={cn("w-full max-w-sm bg-white border border-gray-200 rounded-lg p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {getActiveFiltersCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
        </div>

        {getActiveFiltersCount() > 0 && (
          <button onClick={clearAllFilters} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Categories */}
        {availableFilters.categories && availableFilters.categories.length > 0 && (
          <FilterSection
            title="Categories"
            isOpen={openSections.categories}
            onToggle={() => toggleSection("categories")}
          >
            <div className="space-y-2">
              {availableFilters.categories.map((category: FilterOption) => (
                <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={filters.category_id === category.id}
                    onChange={() =>
                      updateFilter("category_id", filters.category_id === category.id ? undefined : category.id)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700 flex-1">{category.name}</span>
                  <span className="text-xs text-gray-500">({category.product_count})</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Brands */}
        {availableFilters.brands && availableFilters.brands.length > 0 && (
          <FilterSection title="Brands" isOpen={openSections.brands} onToggle={() => toggleSection("brands")}>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableFilters.brands.map((brand: FilterOption) => (
                <label key={brand.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="brand"
                    checked={filters.brand_id === brand.id}
                    onChange={() => updateFilter("brand_id", filters.brand_id === brand.id ? undefined : brand.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700 flex-1">{brand.name}</span>
                  <span className="text-xs text-gray-500">({brand.product_count})</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Price Range */}
        {availableFilters.price_range && (
          <FilterSection title="Price Range" isOpen={openSections.price} onToggle={() => toggleSection("price")}>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Price</label>
                  <input
                    type="number"
                    value={filters.min_price || ""}
                    onChange={(e) => updateFilter("min_price", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0"
                    min="0"
                    max={availableFilters.price_range.max}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Price</label>
                  <input
                    type="number"
                    value={filters.max_price || ""}
                    onChange={(e) => updateFilter("max_price", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={availableFilters.price_range.max.toString()}
                    min={filters.min_price || 0}
                    max={availableFilters.price_range.max}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Range: ${availableFilters.price_range.min} - ${availableFilters.price_range.max}
              </div>
            </div>
          </FilterSection>
        )}

        {/* Rating */}
        <FilterSection title="Minimum Rating" isOpen={openSections.rating} onToggle={() => toggleSection("rating")}>
          <div className="space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <label key={rating} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.min_rating === rating}
                  onChange={() => updateFilter("min_rating", filters.min_rating === rating ? undefined : rating)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={cn("text-sm", i < rating ? "text-yellow-400" : "text-gray-300")}>
                      ★
                    </span>
                  ))}
                  <span className="text-sm text-gray-700">& up</span>
                </div>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Features */}
        <FilterSection title="Features" isOpen={openSections.features} onToggle={() => toggleSection("features")}>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.in_stock || false}
                onChange={(e) => updateFilter("in_stock", e.target.checked || undefined)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">In Stock</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.featured || false}
                onChange={(e) => updateFilter("featured", e.target.checked || undefined)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Featured</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.new || false}
                onChange={(e) => updateFilter("new", e.target.checked || undefined)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">New Arrivals</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.on_sale || false}
                onChange={(e) => updateFilter("on_sale", e.target.checked || undefined)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">On Sale</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.flash_sale || false}
                onChange={(e) => updateFilter("flash_sale", e.target.checked || undefined)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Flash Sale</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.luxury_deal || false}
                onChange={(e) => updateFilter("luxury_deal", e.target.checked || undefined)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Luxury Deals</span>
            </label>
          </div>
        </FilterSection>
      </div>
    </div>
  )
}

interface FilterSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function FilterSection({ title, isOpen, onToggle, children }: FilterSectionProps) {
  return (
    <div className="border-b border-gray-200 pb-4 last:border-b-0">
      <button onClick={onToggle} className="flex items-center justify-between w-full text-left">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>

      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  )
}
