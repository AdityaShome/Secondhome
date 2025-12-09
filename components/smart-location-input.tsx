"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Loader2, TrendingUp, Building2, GraduationCap, MapPinned } from "lucide-react"
import { cn } from "@/lib/utils"

interface LocationSuggestion {
  value: string
  label: string
  type: "city" | "area" | "college" | "location"
  count: number
}

interface SmartLocationInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SmartLocationInput({
  value,
  onChange,
  placeholder = "Enter location",
  className,
}: SmartLocationInputProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Don't search if empty or too short
    if (!value || value.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce the search
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [value])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchSuggestions = async (query: string) => {
    setIsLoading(true)
    try {
      // First, try smart search with SecondHome AI
      const smartResponse = await fetch("/api/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })

      if (smartResponse.ok) {
        const smartData = await smartResponse.json()
        if (smartData.suggestions && smartData.suggestions.length > 0) {
          setSuggestions(smartData.suggestions)
          setShowSuggestions(true)
          setSelectedIndex(-1)
          setIsLoading(false)
          return
        }
      }

      // Fallback to regular location search
      const response = await fetch(`/api/locations?query=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
        setShowSuggestions(data.suggestions && data.suggestions.length > 0)
        setSelectedIndex(-1)
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (suggestion: LocationSuggestion) => {
    onChange(suggestion.value)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        break
    }
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "city":
        return Building2
      case "college":
        return GraduationCap
      case "area":
        return MapPinned
      default:
        return MapPin
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "city":
        return "City"
      case "college":
        return "College"
      case "area":
        return "Area"
      default:
        return "Location"
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          className={cn(
            "w-full pl-11 pr-10 py-3.5 border-2 border-gray-300 rounded focus:border-orange-500 focus:outline-none bg-white text-gray-900 text-base",
            className
          )}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto"
        >
          <div className="p-2">
            {suggestions.map((suggestion, index) => {
              const Icon = getIconForType(suggestion.type)
              const isSelected = index === selectedIndex
              return (
                <button
                  key={`${suggestion.value}-${index}`}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-3 rounded-lg text-left transition-colors",
                    isSelected
                      ? "bg-orange-50 border-2 border-orange-500"
                      : "hover:bg-gray-50 border-2 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                        suggestion.type === "city"
                          ? "bg-blue-100"
                          : suggestion.type === "college"
                          ? "bg-green-100"
                          : "bg-orange-100"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5",
                          suggestion.type === "city"
                            ? "text-blue-600"
                            : suggestion.type === "college"
                            ? "text-green-600"
                            : "text-orange-600"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {suggestion.label}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="capitalize">{getTypeLabel(suggestion.type)}</span>
                        {suggestion.count > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-orange-600">
                              {suggestion.count} {suggestion.count === 1 ? "property" : "properties"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="text-orange-600 text-xs font-bold px-2 py-1 bg-orange-100 rounded">
                        ↵ Enter
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-3 bg-gray-50 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
              <TrendingUp className="w-3 h-3" />
              <span>Powered by Smart AI Search • Real properties only</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

