"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface ProductFiltersProps {
  categories: string[]
  priceRange: [number, number]
  selectedCategory: string
  selectedPriceRange: [number, number]
  onCategoryChange: (category: string) => void
  onPriceRangeChange: (range: [number, number]) => void
}

export function ProductFilters({
  categories,
  priceRange,
  selectedCategory,
  selectedPriceRange,
  onCategoryChange,
  onPriceRangeChange,
}: ProductFiltersProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between border-gray-200 bg-white text-left font-normal hover:bg-gray-50"
              >
                {selectedCategory || "All Categories"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search category..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No category found.</CommandEmpty>
                  <CommandGroup>
                    {categories.map((category) => (
                      <CommandItem
                        key={category}
                        onSelect={() => {
                          onCategoryChange(category)
                          setOpen(false)
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCategory === category ? "opacity-100 text-cherry-600" : "opacity-0",
                          )}
                        />
                        {category}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Price Range</label>
          <div className="rounded-md border border-gray-200 bg-white p-4">
            <Slider
              min={priceRange[0]}
              max={priceRange[1]}
              step={1000}
              value={selectedPriceRange}
              onValueChange={onPriceRangeChange as (value: number[]) => void}
              className="py-2"
            />
            <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
              <span>KSh {selectedPriceRange[0].toLocaleString()}</span>
              <span>KSh {selectedPriceRange[1].toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

