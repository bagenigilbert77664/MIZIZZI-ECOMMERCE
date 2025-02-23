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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-48 justify-between">
            {selectedCategory || "Select category..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0">
          <Command>
            <CommandInput placeholder="Search category..." />
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
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedCategory === category ? "opacity-100" : "opacity-0")}
                    />
                    {category}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Price Range:</span>
        <div className="w-48">
          <Slider
            min={priceRange[0]}
            max={priceRange[1]}
            step={1000}
            value={selectedPriceRange}
            onValueChange={onPriceRangeChange as (value: number[]) => void}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>KSh {selectedPriceRange[0].toLocaleString()}</span>
          <span>-</span>
          <span>KSh {selectedPriceRange[1].toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

