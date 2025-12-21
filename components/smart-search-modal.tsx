"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  X,
  MapPin,
  TrendingUp,
  Clock,
  Mic,
  MicOff,
  GraduationCap,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useDebounce } from "@/hooks/use-debounce"

interface SmartSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchSuggestion {
  id: string
  text: string
  type: "location" | "college" | "property" | "area"
  icon: any
  count?: number
}

export function SmartSearchModal({ isOpen, onClose }: SmartSearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const debouncedQuery = useDebounce(query, 300)

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentSearches")
    if (stored) {
      setRecentSearches(JSON.parse(stored))
    }
  }, [])

  // Initialize voice recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-IN"

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        setIsListening(false)
        handleSearch(transcript)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery("")
      setSuggestions([])
      setSelectedIndex(-1)
    }
  }, [isOpen])

  // Fetch search suggestions
  useEffect(() => {
    if (debouncedQuery.trim().length > 0) {
      fetchSuggestions(debouncedQuery)
    } else {
      setSuggestions([])
    }
  }, [debouncedQuery])

  const fetchSuggestions = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      // Fetch from multiple sources
      const [propertiesRes, collegesRes] = await Promise.all([
        fetch(`/api/properties?location=${encodeURIComponent(searchQuery)}&limit=5`),
        fetch(`/api/colleges?search=${encodeURIComponent(searchQuery)}`),
      ])

      const suggestionsList: SearchSuggestion[] = []

      // Properties/Locations
      if (propertiesRes.ok) {
        const propertiesData = await propertiesRes.json()
        const properties = propertiesData.properties || []
        
        // Extract unique locations
        const uniqueLocations = new Set<string>()
        properties.forEach((p: any) => {
          if (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase())) {
            uniqueLocations.add(p.location)
          }
        })

        Array.from(uniqueLocations).slice(0, 3).forEach((location) => {
          suggestionsList.push({
            id: `location-${location}`,
            text: location,
            type: "location",
            icon: MapPin,
            count: properties.filter((p: any) => p.location === location).length,
          })
        })
      }

      // Colleges
      if (collegesRes.ok) {
        const collegesData = await collegesRes.json()
        const colleges = collegesData.colleges || collegesData || []
        
        colleges.slice(0, 3).forEach((college: any) => {
          suggestionsList.push({
            id: `college-${college._id || college.name}`,
            text: college.name,
            type: "college",
            icon: GraduationCap,
          })
        })
      }

      // Popular areas if query is short
      if (searchQuery.length < 4) {
        const popularAreas = [
          "Indiranagar",
          "Koramangala",
          "HSR Layout",
          "Whitefield",
          "Marathahalli",
          "BTM Layout",
          "Jayanagar",
          "Rajajinagar",
        ]
        
        popularAreas
          .filter((area) => area.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 2)
          .forEach((area) => {
            suggestionsList.push({
              id: `area-${area}`,
              text: area,
              type: "area",
              icon: MapPin,
            })
          })
      }

      setSuggestions(suggestionsList)
    } catch (error) {
      console.error("Error fetching suggestions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert("Voice search is not supported in your browser")
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleSearch = useCallback(
    (searchQuery?: string) => {
      const finalQuery = searchQuery || query.trim()
      if (!finalQuery) return

      // Save to recent searches
      const newRecent = [finalQuery, ...recentSearches.filter((s) => s !== finalQuery)].slice(0, 5)
      setRecentSearches(newRecent)
      localStorage.setItem("recentSearches", JSON.stringify(newRecent))

      // Navigate to listings with search query
      router.push(`/listings?query=${encodeURIComponent(finalQuery)}`)
      onClose()
    },
    [query, recentSearches, router, onClose]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionClick(suggestions[selectedIndex])
      } else {
        handleSearch()
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1))
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    handleSearch(suggestion.text)
  }

  const popularSearches = [
    "PG near college",
    "Girls PG",
    "Boys hostel",
    "Furnished flats",
    "Near metro",
    "Budget accommodation",
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 gap-0 max-h-[90vh] md:max-h-[85vh] overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Smart Search</DialogTitle>
        </DialogHeader>
        
        {/* Search Input */}
        <div className="p-4 md:p-6 border-b bg-gradient-to-r from-orange-50 to-white sticky top-0 z-10">
          <div className="relative">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-orange-500" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search by location, college, area, or property..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              className="pl-10 md:pl-12 pr-20 md:pr-24 h-12 md:h-14 text-base md:text-lg border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl bg-white shadow-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 md:gap-2">
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuery("")}
                  className="h-9 w-9 md:h-10 md:w-10 rounded-full hover:bg-orange-100 hover:text-orange-600 text-gray-700"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceSearch}
                className={`h-9 w-9 md:h-10 md:w-10 rounded-full transition-all ${
                  isListening 
                    ? "bg-red-100 text-red-600 animate-pulse" 
                    : "hover:bg-orange-100 hover:text-orange-600"
                }`}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Mic className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </Button>
            </div>
          </div>

          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 text-red-600 text-xs md:text-sm"
            >
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              Listening... Say your search query
            </motion.div>
          )}
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] md:max-h-[calc(85vh-120px)]">
          {query.trim().length === 0 ? (
            <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-orange-100">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-base md:text-lg">Recent Searches</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {recentSearches.map((search, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleSuggestionClick({ id: `recent-${idx}`, text: search, type: "location", icon: MapPin })}
                        className="px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-base rounded-full border-2 border-gray-200 bg-white hover:border-orange-400 hover:bg-orange-50 text-gray-700 hover:text-orange-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                      >
                        {search}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Popular Searches */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-orange-100">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 text-base md:text-lg">Popular Searches</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {popularSearches.map((search, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + idx * 0.05 }}
                      onClick={() => {
                        setQuery(search)
                        handleSearch(search)
                      }}
                      className="group relative px-4 py-3 md:px-5 md:py-4 text-left rounded-xl border-2 border-gray-200 bg-white hover:border-orange-400 hover:bg-gradient-to-br hover:from-orange-50 hover:to-white text-gray-700 hover:text-orange-700 transition-all duration-200 font-medium shadow-sm hover:shadow-lg hover:scale-[1.02]"
                    >
                      <span className="relative z-10">{search}</span>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4 text-orange-500" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12 md:py-16">
              <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-orange-500" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="p-1.5 rounded-lg bg-orange-100">
                  <Search className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm md:text-base font-semibold text-gray-700">Search Suggestions</span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {suggestions.map((suggestion, idx) => {
                    const Icon = suggestion.icon
                    const isSelected = selectedIndex === idx
                    return (
                      <motion.button
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleSuggestionClick(suggestion)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        ref={(el) => {
                          if (isSelected && el) {
                            el.scrollIntoView({ behavior: "smooth", block: "nearest" })
                          }
                        }}
                        className={`w-full flex items-center gap-3 md:gap-4 px-4 py-3 md:py-4 rounded-xl transition-all text-left border-2 ${
                          isSelected
                            ? "bg-orange-50 border-orange-300 shadow-md"
                            : "border-transparent hover:bg-orange-50/50 hover:border-orange-200"
                        }`}
                      >
                        <div className={`p-2 md:p-2.5 rounded-lg flex-shrink-0 ${
                          suggestion.type === "college"
                            ? "bg-blue-100 text-blue-600"
                            : suggestion.type === "area"
                            ? "bg-green-100 text-green-600"
                            : "bg-orange-100 text-orange-600"
                        }`}>
                          <Icon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm md:text-base truncate">{suggestion.text}</div>
                          <div className="text-xs md:text-sm text-gray-500 capitalize mt-0.5">{suggestion.type}</div>
                        </div>
                        {suggestion.count !== undefined && (
                          <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 flex-shrink-0">
                            {suggestion.count} {suggestion.count === 1 ? "property" : "properties"}
                          </Badge>
                        )}
                        <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 transition-colors ${
                          isSelected ? "text-orange-600" : "text-gray-400"
                        }`} />
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="p-8 md:p-12 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Search className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium text-base md:text-lg">No results found for &quot;{query}&quot;</p>
              <p className="text-sm md:text-base text-gray-400 mt-2">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {query.trim().length > 0 && (
          <div className="p-3 md:p-4 border-t bg-gradient-to-r from-orange-50 to-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs md:text-sm text-gray-600 flex items-center gap-2">
              Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm text-xs font-mono">Enter</kbd> to search
            </div>
            <Button 
              onClick={() => handleSearch()} 
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 shadow-md hover:shadow-lg transition-all"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

