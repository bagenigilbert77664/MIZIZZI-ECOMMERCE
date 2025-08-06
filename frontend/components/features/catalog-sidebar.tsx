"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Gem, FilterIcon, ChevronDown, ChevronRight, Search, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface Category {
  id: string
  name: string
  count: number
  subcategories?: string[]
}

interface FilterType {
  id: string
  name: string
  options: string[]
}

const categories: Category[] = [
  {
    id: "jewelry",
    name: "MIZIZZI JEWELRY",
    count: 2847,
    subcategories: ["Handcrafted", "Traditional", "Modern", "Premium"],
  },
]

const filters: FilterType[] = [
  {
    id: "style",
    name: "Style",
    options: ["Handcrafted", "Traditional", "Modern", "Premium"],
  },
  {
    id: "material",
    name: "Material",
    options: ["Gold", "Silver", "Bronze", "Beads", "Leather"],
  },
  {
    id: "price",
    name: "Price Range",
    options: ["Under KSh 1,000", "KSh 1,000 - 5,000", "KSh 5,000 - 10,000", "Above KSh 10,000"],
  },
]

export function CatalogSidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedFilters, setExpandedFilters] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  const toggleFilter = (filterId: string) => {
    setExpandedFilters((prev) => (prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId]))
  }

  const toggleFilterOption = (option: string) => {
    setSelectedFilters((prev) => (prev.includes(option) ? prev.filter((f) => f !== option) : [...prev, option]))
  }

  const clearFilters = () => {
    setSelectedFilters([])
    setSearchQuery("")
  }

  const sidebarVariants = {
    expanded: {
      width: "280px",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    collapsed: {
      width: "60px",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  }

  const contentVariants = {
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2, delay: 0.1 },
    },
    hidden: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 },
    },
  }

  const filterVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  }

  return (
    <motion.div
      variants={sidebarVariants}
      animate={isExpanded ? "expanded" : "collapsed"}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-cherry-800 to-cherry-900 p-4">
        <div className="flex items-center justify-between">
          <motion.div
            variants={contentVariants}
            animate={isExpanded ? "visible" : "hidden"}
            className="flex items-center space-x-2"
          >
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Gem className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">MIZIZZI CATALOG</h2>
              <p className="text-white/80 text-xs">Curated Collections</p>
            </div>
          </motion.div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:bg-white/10 h-8 w-8"
          >
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="p-4 space-y-6"
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 rounded-lg border-gray-200 focus:border-cherry-500 focus:ring-cherry-500"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Categories */}
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="group">
                  <Link href={`/category/${category.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 hover:from-amber-100 hover:to-orange-100 transition-all duration-300 cursor-pointer group-hover:shadow-md">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white">
                          <Gem className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{category.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                              {category.count.toLocaleString()}+
                            </Badge>
                            <span className="text-xs text-gray-500">Authentic African Jewelry</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </Link>

                  {/* Subcategories */}
                  {category.subcategories && (
                    <div className="mt-2 ml-4 space-y-1">
                      {category.subcategories.map((sub, index) => (
                        <motion.div
                          key={sub}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Link href={`/category/${category.id}/${sub.toLowerCase()}`}>
                            <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group">
                              <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" />
                              <span className="text-sm text-gray-600 group-hover:text-gray-900">{sub}</span>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <FilterIcon className="h-4 w-4 mr-2" />
                  Filters
                </h3>
                {selectedFilters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-cherry-600 hover:text-cherry-700"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Selected Filters */}
              {selectedFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFilters.map((filter) => (
                    <Badge
                      key={filter}
                      variant="secondary"
                      className="bg-cherry-100 text-cherry-800 hover:bg-cherry-200 cursor-pointer"
                      onClick={() => toggleFilterOption(filter)}
                    >
                      {filter}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Filter Options */}
              {filters.map((filter) => (
                <div key={filter.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleFilter(filter.id)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-sm text-gray-900">{filter.name}</span>
                    <motion.div
                      animate={{ rotate: expandedFilters.includes(filter.id) ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedFilters.includes(filter.id) && (
                      <motion.div
                        variants={filterVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="bg-white"
                      >
                        <div className="p-3 space-y-2">
                          {filter.options.map((option) => (
                            <label
                              key={option}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedFilters.includes(option)}
                                onChange={() => toggleFilterOption(option)}
                                className="rounded border-gray-300 text-cherry-600 focus:ring-cherry-500"
                              />
                              <span className="text-sm text-gray-700">{option}</span>
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Explore Button */}
            <Button
              asChild
              className="w-full bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/products" className="flex items-center justify-center">
                <Sparkles className="h-4 w-4 mr-2" />
                EXPLORE MIZIZZI
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
