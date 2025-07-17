"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { searchService, type SearchSuggestion } from "@/services/search"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  placeholder?: string
  className?: string
  showSuggestions?: boolean
  onSearch?: (query: string) => void
  initialValue?: string
}

export function SearchBar({
  placeholder = "Search for products...",
  className,
  showSuggestions = true,
  onSearch,
  initialValue = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestionsList, setShowSuggestionsList] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce the search query to avoid too many API calls
  const debouncedQuery = useDebounce(query, 300)

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2 && showSuggestions) {
      fetchSuggestions(debouncedQuery)
    } else {
      setSuggestions([])
      setShowSuggestionsList(false)
    }
  }, [debouncedQuery, showSuggestions])

  // Handle clicks outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestionsList(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const fetchSuggestions = async (searchQuery: string) => {
    try {
      setIsLoading(true)
      const suggestions = await searchService.getSearchSuggestions(searchQuery)
      setSuggestions(suggestions)
      setShowSuggestionsList(suggestions.length > 0)
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (searchQuery: string = query) => {
    if (!searchQuery.trim()) return

    setShowSuggestionsList(false)
    setSelectedIndex(-1)

    if (onSearch) {
      onSearch(searchQuery)
    } else {
      // Navigate to search results page
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedIndex(-1)

    if (value.length >= 2) {
      setShowSuggestionsList(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestionsList || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearch()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else {
          handleSearch()
        }
        break
      case "Escape":
        setShowSuggestionsList(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    handleSearch(suggestion.text)
  }

  const clearSearch = () => {
    setQuery("")
    setSuggestions([])
    setShowSuggestionsList(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "product":
        return "🛍️"
      case "category":
        return "📂"
      case "brand":
        return "🏷️"
      default:
        return "🔍"
    }
  }

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-2xl", className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestionsList(true)
            }
          }}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />

        <div className="absolute inset-y-0 right-0 flex items-center">
          {isLoading && <Loader2 className="h-5 w-5 text-gray-400 animate-spin mr-3" />}

          {query && !isLoading && (
            <button onClick={clearSearch} className="p-1 mr-2 text-gray-400 hover:text-gray-600 focus:outline-none">
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => handleSearch()}
            className="px-4 py-2 mr-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
          >
            Search
          </button>
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestionsList && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.text}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0",
                selectedIndex === index && "bg-blue-50",
              )}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{suggestion.text}</div>
                  <div className="text-xs text-gray-500">in {suggestion.category}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
