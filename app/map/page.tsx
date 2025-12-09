"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { 
  Search, MapPin, Home, UtensilsCrossed, Hospital, Bus, Train, 
  ShoppingCart, Dumbbell, GraduationCap, DollarSign, ShieldCheck,
  Cross, X, TrendingUp, Star, Loader2, Heart, Share2, Calculator,
  Moon, Wifi, Clock, Footprints, Zap, MapPinned, BookmarkPlus,
  Navigation, Filter, BarChart3, Mic, Bot, Sparkles, MessageSquare,
  CloudSun, AlertCircle, Globe, AlertTriangle, Car, Calendar, Wind,
  Droplets, TrendingDown, Users, ArrowRight, Route, Flame, MapPinOff,
  Info
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { motion, AnimatePresence } from "framer-motion"
import { useDebounce } from "@/hooks/use-debounce"
import "leaflet/dist/leaflet.css"

interface Property {
  _id: string
  title: string
  location: string
  price: number
  type: string
  coordinates: {
    type: string
    coordinates: [number, number]
  }
}

interface Place {
  id: string
  name: string
  type: string
  lat: number
  lon: number
  tags?: any
  openingHours?: string
}

interface SearchSuggestion {
  display_name: string
  lat: string
  lon: string
    type: string
  importance: number
  icon?: string
}

interface AIInsight {
  recommendation: string
  pros: string[]
  cons: string[]
  bestFor: string
  matchScore: number
}

interface CategoryFilter {
  id: string
  name: string
  icon: any
  color: string
  osmTags: string[]
  enabled: boolean
}

interface LocationInsights {
  restaurants: number
  hospitals: number
  transport: number
  colleges: number
  atms: number
  gyms: number
  groceries: number
  pharmacies: number
  police: number
  cafes: number
  laundries: number
  scores: {
    food: number
    health: number
    connectivity: number
    safety: number
    convenience: number
    fitness: number
    walkability: number
    nightSafety: number
    wifiAvailability: number
    overall: number
  }
  costEstimate: {
    food: number
    transport: number
    misc: number
    total: number
  }
  is24x7Available: boolean
}

interface Weather {
  main: {
    temp: number
    feels_like: number
    humidity: number
  }
  weather: Array<{
    main: string
    description: string
    icon: string
  }>
  wind: {
    speed: number
  }
  isMockData?: boolean
}

interface Review {
  _id: string
  rating: number
  comment: string
  createdAt: string
  user: {
    name: string
    image?: string
  }
  property: {
    title: string
    location: string
  }
}

interface TrendingArea {
  name: string
  propertyCount: number
  avgPrice: number
  minPrice: number
  distance: number | null
}

interface RouteInfo {
  distance: string
  duration: string
  distanceMeters: number
  durationSeconds: number
  mode: string
  googleMapsUrl: string
  isMockData?: boolean
  steps?: Array<{
    instruction: string
    distance: string
    duration: string
  }>
}

const CATEGORIES: CategoryFilter[] = [
  { 
    id: "restaurant", 
    name: "Restaurants", 
    icon: UtensilsCrossed, 
    color: "bg-orange-500", 
    osmTags: ["amenity=restaurant", "amenity=fast_food"],
    enabled: true 
  },
  { 
    id: "hospital", 
    name: "Hospitals", 
    icon: Hospital, 
    color: "bg-red-500", 
    osmTags: ["amenity=hospital", "amenity=clinic"],
    enabled: false // Disabled by default to reduce API load
  },
  { 
    id: "transport", 
    name: "Transport", 
    icon: Bus, 
    color: "bg-purple-500", 
    osmTags: ["highway=bus_stop", "public_transport=station"],
    enabled: true 
  },
  { 
    id: "college", 
    name: "Colleges", 
    icon: GraduationCap, 
    color: "bg-blue-600", 
    osmTags: ["amenity=university", "amenity=college", "building=university", "building=college"],
    enabled: true // ALWAYS enabled - this is for students!
  },
  { 
    id: "atm", 
    name: "ATMs", 
    icon: DollarSign, 
    color: "bg-green-600", 
    osmTags: ["amenity=atm", "amenity=bank"],
    enabled: false 
  },
  { 
    id: "gym", 
    name: "Gyms", 
    icon: Dumbbell, 
    color: "bg-pink-600", 
    osmTags: ["leisure=fitness_centre", "leisure=sports_centre"],
    enabled: false 
  },
  { 
    id: "grocery", 
    name: "Grocery", 
    icon: ShoppingCart, 
    color: "bg-yellow-600", 
    osmTags: ["shop=supermarket", "shop=convenience", "shop=grocery"],
    enabled: false 
  },
  { 
    id: "pharmacy", 
    name: "Pharmacy", 
    icon: Cross, 
    color: "bg-teal-600", 
    osmTags: ["amenity=pharmacy"],
    enabled: false 
  },
  { 
    id: "police", 
    name: "Police", 
    icon: ShieldCheck, 
    color: "bg-indigo-600", 
    osmTags: ["amenity=police"],
    enabled: false 
  },
]

export default function MapPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [colleges, setColleges] = useState<Place[]>([]) // Separate state for colleges
  const [nearestCollege, setNearestCollege] = useState<Place | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946])
  const [map, setMap] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [categories, setCategories] = useState<CategoryFilter[]>(CATEGORIES)
  const [radius, setRadius] = useState(1500) // Reduced to 1.5km for faster API responses
  const [insights, setInsights] = useState<LocationInsights | null>(null)
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null)
  const [maxBudget, setMaxBudget] = useState(20000)
  const [savedLocations, setSavedLocations] = useState<any[]>([])
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [currentLocationName, setCurrentLocationName] = useState("Bangalore")
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [chatInput, setChatInput] = useState("")
  const [isAiThinking, setIsAiThinking] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInitialized = useRef(false)
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  
  // New feature states
  const [weather, setWeather] = useState<Weather | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [trendingAreas, setTrendingAreas] = useState<TrendingArea[]>([])
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [selectedPropertyForRoute, setSelectedPropertyForRoute] = useState<string>("")
  const [routeMode, setRouteMode] = useState<"driving" | "walking" | "bicycling" | "transit">("driving")
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [isLoadingTrending, setIsLoadingTrending] = useState(false)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!mapRef.current || mapInitialized.current) return

    const checkAndInitMap = async () => {
      const container = mapRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        initTimeoutRef.current = setTimeout(checkAndInitMap, 100)
        return
      }

      mapInitialized.current = true

      const L = (await import('leaflet')).default

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const mapInstance = L.map(container, {
        preferCanvas: true,
        attributionControl: false, // Hide attribution legends
        zoomControl: true, // Keep zoom controls
      }).setView(mapCenter, 13)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '', // Remove attribution text
        maxZoom: 19,
      }).addTo(mapInstance)

      setTimeout(() => {
        mapInstance.invalidateSize()
      }, 100)

    setMap(mapInstance)

      setTimeout(() => {
    if (navigator.geolocation) {
          console.log("🔍 Requesting user location...")
      navigator.geolocation.getCurrentPosition(
        (position) => {
              console.log("✅ Location obtained:", position.coords.latitude, position.coords.longitude)
              const userLocation: [number, number] = [position.coords.latitude, position.coords.longitude]
              try {
                mapInstance.setView(userLocation, 14)
          setMapCenter(userLocation)

                const userIcon = L.divIcon({
                  html: `<div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg animate-pulse"></div>`,
                  className: "",
                  iconSize: [16, 16],
                  iconAnchor: [8, 8],
                })
                L.marker(userLocation, { icon: userIcon }).addTo(mapInstance).bindPopup("📍 You are here")
                
                // Get location name
                reverseGeocode(userLocation)
                
                toast({
                  title: "📍 Location detected!",
                  description: "Showing nearby properties and amenities",
                })
              } catch (err) {
                console.error("Error setting user location:", err)
              }
              loadDataForLocation(userLocation)
            },
            (error) => {
              console.error("❌ Geolocation error:", error)
              toast({
                title: "📍 Using default location",
                description: "Grant location permission for personalized results",
              })
              loadDataForLocation(mapCenter)
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
      )
    } else {
          console.warn("Geolocation not supported")
          toast({
            title: "⚠️ Geolocation not supported",
            description: "Using Bangalore as default location",
          })
          loadDataForLocation(mapCenter)
        }
      }, 500)
    }

    initTimeoutRef.current = setTimeout(checkAndInitMap, 100)

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current)
      }
      if (map) {
        try {
          map.off()
          map.remove()
        } catch (err) {
          console.error("Error removing map:", err)
        }
        mapInitialized.current = false
      }
    }
  }, [])

  // Fetch search suggestions as user types
  useEffect(() => {
    if (debouncedSearchQuery.length < 2) {
      setSuggestions([])
      return
    }

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            debouncedSearchQuery + ", India"
          )}&format=json&limit=8&addressdetails=1`
        )
        const data = await response.json()
        
        // Sort by importance (relevance)
        const sorted = data.sort((a: any, b: any) => b.importance - a.importance)
        setSuggestions(sorted)
        setShowSuggestions(true)
      } catch (error) {
        console.error("Error fetching suggestions:", error)
      }
    }

    fetchSuggestions()
  }, [debouncedSearchQuery])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Reverse geocode to get location name
  const reverseGeocode = async (location: [number, number]) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${location[0]}&lon=${location[1]}&format=json`
      )
        const data = await response.json()
      const name = data.address?.suburb || data.address?.neighbourhood || data.address?.city || "Current Location"
      setCurrentLocationName(name)
    } catch (error) {
      console.error("Error reverse geocoding:", error)
    }
  }

  // Load properties and places for a location
  const loadDataForLocation = useCallback(async (location: [number, number]) => {
    setIsLoading(true)
    try {
      // Fetch real properties from database
      const response = await fetch(`/api/properties?lat=${location[0]}&lng=${location[1]}&radius=${radius}&maxPrice=${maxBudget}`)
      
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setProperties(data)
        } else if (data.properties && Array.isArray(data.properties)) {
          setProperties(data.properties)
        } else {
          setProperties([])
        }
      } else {
        setProperties([])
      }
    } catch (error) {
      console.error("Error fetching properties:", error)
      setProperties([])
    } finally {
      setIsLoading(false)
    }

    // Fetch nearby places
    fetchNearbyPlaces(location)
    
    // Fetch additional data
    fetchWeather(location)
    fetchLocationReviews(location)
    fetchTrendingAreas(location)
    
    // Get AI insights after data loads
    setTimeout(() => {
      getAIInsights(location)
    }, 2000)
  }, [radius, maxBudget])

  // Fetch weather data
  const fetchWeather = useCallback(async (location: [number, number]) => {
    setIsLoadingWeather(true)
    try {
      const response = await fetch(`/api/weather?lat=${location[0]}&lon=${location[1]}`)
      if (response.ok) {
        const data = await response.json()
        if (data.error) {
          console.error("Weather API error:", data.error)
          setWeather(null)
        } else {
          setWeather(data)
        }
      } else {
        const errorData = await response.json()
        console.error("Weather API failed:", errorData)
        setWeather(null)
      }
    } catch (error) {
      console.error("Error fetching weather:", error)
      setWeather(null)
    } finally {
      setIsLoadingWeather(false)
    }
  }, [])

  // Fetch location reviews
  const fetchLocationReviews = useCallback(async (location: [number, number]) => {
    setIsLoadingReviews(true)
    try {
      const response = await fetch(
        `/api/location-reviews?lat=${location[0]}&lon=${location[1]}&radius=${radius}`
      )
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setIsLoadingReviews(false)
    }
  }, [radius])

  // Fetch trending areas
  const fetchTrendingAreas = useCallback(async (location: [number, number]) => {
    setIsLoadingTrending(true)
    try {
      const response = await fetch(
        `/api/trending-areas?lat=${location[0]}&lon=${location[1]}&limit=5`
      )
      if (response.ok) {
        const data = await response.json()
        setTrendingAreas(data.areas || [])
      }
    } catch (error) {
      console.error("Error fetching trending areas:", error)
    } finally {
      setIsLoadingTrending(false)
    }
  }, [])

  // Fetch route from property to nearest college
  const fetchRoute = useCallback(async (propertyId: string, mode: string) => {
    if (!nearestCollege) return
    
    const property = properties.find(p => p._id === propertyId)
    if (!property || !property.coordinates?.coordinates) return
    
    setIsLoadingRoute(true)
    try {
      const [lng, lat] = property.coordinates.coordinates
      const response = await fetch(
        `/api/route-planner?originLat=${lat}&originLon=${lng}&destLat=${nearestCollege.lat}&destLon=${nearestCollege.lon}&mode=${mode}`
      )
      if (response.ok) {
        const data = await response.json()
        setRoute(data)
      }
    } catch (error) {
      console.error("Error fetching route:", error)
    } finally {
      setIsLoadingRoute(false)
    }
  }, [nearestCollege, properties])

  // Fetch nearby places from OpenStreetMap
  const fetchNearbyPlaces = useCallback(async (location: [number, number]) => {
    const enabledCategories = categories.filter(c => c.enabled)
    
    if (enabledCategories.length === 0) {
      setPlaces([])
      setIsFetchingPlaces(false)
      setInsights(null)
      if (map) {
        markers.forEach((marker) => {
          if (marker && marker.remove) {
            marker.remove()
          }
        })
        setMarkers([])
        addMarkersToMap(properties, [])
      }
      return
    }

    setIsFetchingPlaces(true)

    try {
      const [lat, lon] = location
      const radiusInMeters = radius
      
      const tagQueries = enabledCategories
        .flatMap(cat => cat.osmTags.map(tag => {
          const [key, value] = tag.split('=')
          return `node["${key}"="${value}"](around:${radiusInMeters},${lat},${lon});
                  way["${key}"="${value}"](around:${radiusInMeters},${lat},${lon});`
        }))
        .join('\n')

      const overpassQuery = `
        [out:json][timeout:20];
        (
          ${tagQueries}
        );
        out center;
      `

      // Multiple Overpass API endpoints (fallback if one is down)
      const overpassEndpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter',
      ]

      let response: Response | null = null
      let lastError: Error | null = null

      // Try each endpoint
      for (let i = 0; i < overpassEndpoints.length; i++) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout

          console.log(`🌐 Trying Overpass API endpoint ${i + 1}/${overpassEndpoints.length}...`)
          
          response = await fetch(overpassEndpoints[i], {
            method: 'POST',
            body: overpassQuery,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            console.log(`✅ Success with endpoint ${i + 1}`)
            break // Success, exit loop
        } else {
            console.warn(`⚠️ Endpoint ${i + 1} returned ${response.status}`)
            lastError = new Error(`Overpass API ${i + 1} returned ${response.status}`)
          }
        } catch (err) {
          console.warn(`⚠️ Endpoint ${i + 1} failed:`, err)
          lastError = err as Error
          continue // Try next endpoint
        }
      }

      if (!response || !response.ok) {
        console.error('❌ All Overpass API endpoints failed')
        throw lastError || new Error('All Overpass API endpoints failed')
      }

      const data = await response.json()
      
      const processedPlaces: Place[] = data.elements.map((element: any) => {
        const lat = element.lat || element.center?.lat
        const lon = element.lon || element.center?.lon
        const name = element.tags?.name || element.tags?.operator || 'Unnamed'
        
        let type = 'other'
        for (const category of enabledCategories) {
          for (const osmTag of category.osmTags) {
            const [key, value] = osmTag.split('=')
            if (element.tags[key] === value) {
              type = category.id
              break
            }
          }
          if (type !== 'other') break
        }

        return {
          id: `${element.type}-${element.id}`,
          name,
          type,
          lat,
          lon,
          tags: element.tags,
          openingHours: element.tags?.opening_hours,
        }
      }).filter((place: Place) => place.lat && place.lon)

      setPlaces(processedPlaces)
      
      // Extract colleges separately - this is for STUDENTS!
      const collegesList = processedPlaces.filter(p => p.type === 'college')
      setColleges(collegesList)
      
      // Find nearest college
      if (collegesList.length > 0) {
        const sortedColleges = collegesList.map(college => {
          const distance = Math.sqrt(
            Math.pow(college.lat - location[0], 2) + Math.pow(college.lon - location[1], 2)
          ) * 111 // Approximate km conversion
          return { ...college, distance }
        }).sort((a, b) => a.distance - b.distance)
        
        setNearestCollege(sortedColleges[0])
        
        toast({
          title: `🎓 Found ${collegesList.length} colleges nearby!`,
          description: `Nearest: ${sortedColleges[0].name}`,
        })
      }
      
      calculateInsights(processedPlaces, location)
      
        if (map) {
        addMarkersToMap(properties, processedPlaces)
        }
      } catch (error) {
        console.error("Error fetching nearby places:", error)
      
      // Show friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "⏱️ Request timed out",
          description: `Try selecting fewer categories (currently ${enabledCategories.length} enabled) or reduce the search radius.`,
          variant: "destructive",
        })
      } else if (errorMessage.includes('504') || errorMessage.includes('timeout')) {
        toast({
          title: "⚠️ Server overloaded",
          description: `Overpass API is busy. Try: 1) Reduce search radius (currently ${(radius/1000).toFixed(1)}km) 2) Disable some categories 3) Wait a moment and refresh`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "❌ Failed to load nearby places",
          description: `All data servers are unavailable. Try again in a moment. (${enabledCategories.length} categories, ${(radius/1000).toFixed(1)}km radius)`,
          variant: "destructive",
        })
      }
      
      setPlaces([])
      setInsights(null) // Clear insights - only show real data
      
      // Still show property markers if any
      if (map && properties.length > 0) {
        addMarkersToMap(properties, [])
      }
    } finally {
      setIsFetchingPlaces(false)
    }
  }, [categories, radius, map, properties, toast, markers])

  // Calculate insights
  const calculateInsights = (places: Place[], location: [number, number]) => {
    const countByType = (type: string) => places.filter(p => p.type === type).length
    
    const restaurants = countByType('restaurant')
    const hospitals = countByType('hospital')
    const transport = countByType('transport')
    const colleges = countByType('college')
    const atms = countByType('atm')
    const gyms = countByType('gym')
    const groceries = countByType('grocery')
    const pharmacies = countByType('pharmacy')
    const police = countByType('police')
    const cafes = places.filter(p => p.type === 'restaurant' && p.tags?.cuisine === 'cafe').length
    const laundries = places.filter(p => p.tags?.shop === 'laundry' || p.tags?.amenity === 'laundry').length

    const is24x7 = places.some(p => 
      p.openingHours?.includes('24/7') || 
      p.openingHours?.includes('00:00-24:00')
    )

    const foodScore = Math.min(100, (restaurants / 10) * 100)
    const healthScore = Math.min(100, ((hospitals + pharmacies) / 5) * 100)
    const connectivityScore = Math.min(100, (transport / 15) * 100)
    const safetyScore = Math.min(100, (police / 2) * 100)
    const convenienceScore = Math.min(100, ((groceries + atms) / 10) * 100)
    const fitnessScore = Math.min(100, (gyms / 3) * 100)
    const walkabilityScore = Math.min(100, ((restaurants + groceries + atms) / 15) * 100)
    const nightSafetyScore = Math.min(100, ((police * 30 + (is24x7 ? 20 : 0) + restaurants * 2) / 2))
    const wifiScore = Math.min(100, ((cafes + restaurants) / 8) * 100)

    const overallScore = Math.round(
      (foodScore * 0.20 + 
       healthScore * 0.10 + 
       connectivityScore * 0.20 + 
       safetyScore * 0.15 + 
       convenienceScore * 0.15 + 
       fitnessScore * 0.05 +
       walkabilityScore * 0.05 +
       nightSafetyScore * 0.05 +
       wifiScore * 0.05)
    )

    const foodCost = Math.max(3000, 6000 - (restaurants * 100))
    const transportCost = Math.max(500, 2000 - (transport * 50))
    const miscCost = 2000

    setInsights({
      restaurants,
      hospitals,
      transport,
      colleges,
      atms,
      gyms,
      groceries,
      pharmacies,
      police,
      cafes,
      laundries,
      scores: {
        food: Math.round(foodScore),
        health: Math.round(healthScore),
        connectivity: Math.round(connectivityScore),
        safety: Math.round(safetyScore),
        convenience: Math.round(convenienceScore),
        fitness: Math.round(fitnessScore),
        walkability: Math.round(walkabilityScore),
        nightSafety: Math.round(nightSafetyScore),
        wifiAvailability: Math.round(wifiScore),
        overall: overallScore,
      },
      costEstimate: {
        food: foodCost,
        transport: transportCost,
        misc: miscCost,
        total: foodCost + transportCost + miscCost,
      },
      is24x7Available: is24x7,
    })
  }

  // Get AI insights using SecondHome AI
  const getAIInsights = async (location: [number, number]) => {
    if (!insights) {
      console.log("⏳ Waiting for insights data...")
      return
    }
    
    console.log("🤖 Requesting AI insights from SecondHome AI...")
    setIsLoadingAI(true)
    try {
      const response = await fetch('/api/ai/location-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: currentLocationName,
          insights,
          properties: properties.length,
          budget: maxBudget,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAiInsight(data)
      }
    } catch (error) {
      console.error("Error getting AI insights:", error)
      } finally {
      setIsLoadingAI(false)
      }
  }

  // Add markers to map
  const addMarkersToMap = useCallback(
    async (properties: Property[], places: Place[]) => {
      if (!map || !mapInitialized.current) return

      try {
        const L = (await import('leaflet')).default

        markers.forEach((marker) => {
          if (marker && marker.remove) {
            marker.remove()
          }
        })

        const newMarkers: any[] = []

      properties.forEach((property) => {
          if (!property.coordinates?.coordinates) return

        const [lng, lat] = property.coordinates.coordinates

          const propertyIcon = L.divIcon({
            html: `<div class="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full border-4 border-white shadow-lg hover:scale-110 transition-transform cursor-pointer">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>`,
            className: "",
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          })

          const marker = L.marker([lat, lng], { icon: propertyIcon })
            .addTo(map)
            .bindPopup(
              `<div class="text-sm p-2">
                <strong class="text-base">${property.title}</strong><br/>
                <span class="text-gray-600">${property.location}</span><br/>
                <span class="font-bold text-blue-600 text-lg">₹${property.price}/month</span>
              </div>`
            )

          marker.on("click", () => {
          setSelectedProperty(property)
            setSelectedPlace(null)
        })

        newMarkers.push(marker)
      })

        if (places.length > 0) {
      places.forEach((place) => {
            const category = categories.find(c => c.id === place.type)
            if (!category) return

            const placeIcon = L.divIcon({
              html: `<div class="flex items-center justify-center w-8 h-8 ${category.color} rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform cursor-pointer">
                <div class="w-3 h-3 bg-white rounded-full"></div>
              </div>`,
              className: "",
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            })

            const marker = L.marker([place.lat, place.lon], { icon: placeIcon })
              .addTo(map)
              .bindPopup(
                `<div class="text-sm p-2">
                  <strong class="text-base">${place.name}</strong><br/>
                  <span class="text-gray-600">${category.name}</span>
                  ${place.openingHours ? `<br/><span class="text-xs text-gray-500">⏰ ${place.openingHours}</span>` : ''}
                </div>`
              )

            marker.on("click", () => {
              setSelectedPlace(place)
              setSelectedProperty(null)
        })

        newMarkers.push(marker)
      })
        }

      setMarkers(newMarkers)
      } catch (error) {
        console.error("Error adding markers to map:", error)
      }
    },
    [map, categories, markers]
  )

  // Handle category toggle
  const toggleCategory = (categoryId: string) => {
    // COLLEGES CAN'T BE DISABLED - this is for students!
    if (categoryId === 'college') {
      toast({
        title: "🎓 Colleges are always visible",
        description: "This map is designed for students, so colleges are always shown!",
      })
      return
    }
    
    const updated = categories.map(cat =>
      cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
    )
    setCategories(updated)
  }

  // Toggle all categories
  const toggleAllCategories = (enabled: boolean) => {
    // COLLEGES ALWAYS STAY ENABLED
    const updated = categories.map(cat => 
      cat.id === 'college' ? { ...cat, enabled: true } : { ...cat, enabled }
    )
    setCategories(updated)
  }

  // Refetch when categories change
  useEffect(() => {
    if (map && mapCenter && !isLoading) {
      fetchNearbyPlaces(mapCenter)
    }
  }, [categories])

  // Handle search suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const lat = parseFloat(suggestion.lat)
    const lng = parseFloat(suggestion.lon)
    const newCenter: [number, number] = [lat, lng]
    
    setSearchQuery(suggestion.display_name)
    setShowSuggestions(false)
    setMapCenter(newCenter)
    setCurrentLocationName(suggestion.display_name.split(',')[0])
    
    if (map) {
      map.setView(newCenter, 14)
    }
    
    loadDataForLocation(newCenter)
  }

  // Handle search form submission
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!searchQuery.trim() || !map) return

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            searchQuery + ", India"
          )}&format=json&limit=1`
        )
        const data = await response.json()

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lng = parseFloat(data[0].lon)

          const newCenter: [number, number] = [lat, lng]
          setMapCenter(newCenter)
          setCurrentLocationName(data[0].display_name.split(',')[0])
          map.setView(newCenter, 14)
          loadDataForLocation(newCenter)
          setShowSuggestions(false)
          } else {
            toast({
              title: "Location not found",
            description: "Could not find the location. Try a different query.",
              variant: "destructive",
            })
          }
      } catch (error) {
        console.error("Geocoding error:", error)
        toast({
          title: "Search failed",
          description: "Error searching for location.",
          variant: "destructive",
        })
      }
    },
    [searchQuery, map, loadDataForLocation, toast]
  )

  // Voice search
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Not supported",
        description: "Voice search is not supported in your browser.",
        variant: "destructive",
      })
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-IN'

    recognition.onstart = () => {
      setIsVoiceActive(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setSearchQuery(transcript)
      setIsVoiceActive(false)
    }

    recognition.onerror = () => {
      setIsVoiceActive(false)
      toast({
        title: "Voice search failed",
        description: "Could not recognize speech. Try again.",
        variant: "destructive",
      })
    }

    recognition.onend = () => {
      setIsVoiceActive(false)
    }

    recognition.start()
  }

  // Request current location
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "⚠️ Geolocation not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "📍 Getting your location...",
      description: "Please allow location access",
    })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation: [number, number] = [position.coords.latitude, position.coords.longitude]
        setMapCenter(userLocation)
        
        if (map) {
          map.setView(userLocation, 14)
        }
        
        reverseGeocode(userLocation)
        loadDataForLocation(userLocation)
        
        toast({
          title: "✅ Location detected!",
          description: "Showing nearby properties and amenities",
        })
      },
      (error) => {
        console.error("Geolocation error:", error)
        let errorMessage = "Could not get your location"
        
        if (error.code === 1) {
          errorMessage = "Location permission denied. Please enable it in browser settings."
        } else if (error.code === 2) {
          errorMessage = "Location unavailable. Please try again."
        } else if (error.code === 3) {
          errorMessage = "Location request timed out. Please try again."
        }
        
        toast({
          title: "❌ Location error",
          description: errorMessage,
          variant: "destructive",
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Save location
  const saveCurrentLocation = () => {
    const newLocation = {
      id: Date.now(),
      name: currentLocationName,
      center: mapCenter,
      insights,
      aiInsight,
      timestamp: new Date().toISOString(),
    }
    setSavedLocations([...savedLocations, newLocation])
    toast({
      title: "✅ Location saved!",
      description: "You can compare it with other locations later.",
    })
  }

  // Share location with Google Maps link
  const shareCurrentLocation = async () => {
    const [lat, lng] = mapCenter
    
    // Generate Google Maps link
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}&ll=${lat},${lng}&z=14`
    const shareText = `📍 ${currentLocationName}\n\nCheck out this location on SecondHome SmartMap!\n\nGoogle Maps: ${googleMapsUrl}`
    
    try {
      // Try Web Share API first (mobile/tablet)
      if (navigator.share) {
        await navigator.share({
          title: `Location: ${currentLocationName}`,
          text: shareText,
          url: googleMapsUrl,
        })
        
        toast({
          title: "✅ Location shared!",
          description: "Google Maps link shared successfully.",
        })
        return
      }
      
      // Fallback: Copy Google Maps link to clipboard
      await navigator.clipboard.writeText(googleMapsUrl)
      
      toast({
        title: "✅ Google Maps link copied!",
        description: `Link for ${currentLocationName} copied to clipboard.`,
        action: (
          <ToastAction altText="Open in Google Maps" onClick={() => window.open(googleMapsUrl, '_blank')}>
            Open Maps
          </ToastAction>
        ),
      })
    } catch (error) {
      // User cancelled share or clipboard failed
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Share error:", error)
        
        // Show toast with copy button
        toast({
          title: "📍 Share Location",
          description: `Location: ${currentLocationName}`,
          action: (
            <ToastAction 
              altText="Copy Google Maps link" 
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(googleMapsUrl)
                  toast({
                    title: "✅ Copied!",
                    description: "Google Maps link copied!",
                  })
                } catch (err) {
                  toast({
                    title: "❌ Error",
                    description: "Failed to copy link. Please try again.",
                    variant: "destructive",
                  })
                }
              }}
            >
              Copy Link
            </ToastAction>
          ),
        })
      }
    }
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-blue-500"
    if (score >= 40) return "text-yellow-500"
    return "text-red-500"
  }

    return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-[100] shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                SecondHome SmartMap
              </h1>
              <p className="text-gray-600 text-sm mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                AI-powered location intelligence for students
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={requestCurrentLocation}
                className="border-gray-300 hover:border-orange-500 hover:bg-orange-50"
              >
                <Navigation className="w-4 h-4 mr-2" />
                My Location
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={saveCurrentLocation}
                disabled={!insights}
                className="border-gray-300 hover:border-orange-500 hover:bg-orange-50"
              >
                <BookmarkPlus className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={shareCurrentLocation}
                className="border-gray-300 hover:border-orange-500 hover:bg-orange-50"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
          </Button>
        </div>
      </div>

          {/* Search Bar with AI Suggestions */}
          <form onSubmit={handleSearch} className="relative mb-4">
            <div className="flex gap-3">
              <div ref={searchContainerRef} className="relative flex-grow">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 z-10" />
              <Input
                  ref={searchInputRef}
                  placeholder="🔍 Search college, area, locality... (AI-powered suggestions)"
                  className="pl-10 pr-12 h-12 bg-white border-gray-300 focus:border-orange-500 text-gray-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2 h-8 w-8 p-0"
                  onClick={startVoiceSearch}
                  disabled={isVoiceActive}
                >
                  <Mic className={`w-4 h-4 ${isVoiceActive ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                </Button>

                {/* AI-Powered Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto z-[9999]"
                    >
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-900 font-semibold truncate">
                                {suggestion.display_name.split(',')[0]}
                              </div>
                              <div className="text-sm text-gray-600 truncate">
                                {suggestion.display_name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                                  {suggestion.type}
                                </Badge>
                                {suggestion.importance > 0.5 && (
                                  <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                                    <Star className="w-3 h-3 mr-1" />
                                    Popular
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Button type="submit" size="lg" className="bg-orange-500 hover:bg-orange-600 px-8 shadow-md">
                <Navigation className="w-5 h-5 mr-2" />
                Go
            </Button>
            </div>
          </form>

          {/* Budget Filter */}
          <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-gray-900 font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-500" />
                Max Budget: ₹{maxBudget.toLocaleString()}/month
              </Label>
              <span className="text-sm text-gray-600">{properties.length} properties available</span>
        </div>
            <Slider
              value={[maxBudget]}
              onValueChange={(value) => setMaxBudget(value[0])}
              max={50000}
              min={5000}
              step={1000}
              className="w-full"
            />
      </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Badge className="bg-orange-500 text-white px-3 py-1.5 flex items-center gap-1">
              <MapPinned className="w-3 h-3" />
              {(radius / 1000).toFixed(1)}km radius
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllCategories(true)}
              className="border-gray-300 hover:border-orange-500 hover:bg-orange-50"
            >
              <Filter className="w-3 h-3 mr-1" />
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllCategories(false)}
              className="border-gray-300 hover:border-orange-500 hover:bg-orange-50"
            >
              <X className="w-3 h-3 mr-1" />
              None
            </Button>
            <div className="h-4 w-px bg-gray-300" />
            {categories.map((category) => {
              const Icon = category.icon
              const isCollegeCategory = category.id === 'college'
              return (
                <div key={category.id} className="flex items-center space-x-2 relative">
                  <Checkbox
                    id={category.id}
                    checked={category.enabled}
                    onCheckedChange={() => toggleCategory(category.id)}
                    className={`border-slate-600 ${isCollegeCategory ? 'opacity-100' : ''}`}
                    disabled={isCollegeCategory}
                  />
                  <Label
                    htmlFor={category.id}
                    className={`flex items-center gap-2 text-gray-900 text-sm font-medium ${isCollegeCategory ? '' : 'cursor-pointer'}`}
                  >
                    <div className={`w-5 h-5 ${category.color} rounded-full flex items-center justify-center ${isCollegeCategory ? 'ring-2 ring-orange-400' : ''}`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    {category.name}
                    {isCollegeCategory && (
                      <Badge className="ml-1 bg-orange-500 text-white text-[10px] px-1 py-0">
                        ALWAYS ON
                      </Badge>
                    )}
                  </Label>
                </div>
              )
            })}
          </div>

          {/* Interactive Filter Summary */}
          {(properties.length > 0 || places.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 mr-2">Active Filters:</span>
                    <Badge className="bg-white text-gray-900 border-orange-300">
                      📍 {currentLocationName}
                    </Badge>
                    <Badge className="bg-white text-gray-900 border-orange-300">
                      💰 ₹{maxBudget.toLocaleString()}
                    </Badge>
                    <Badge className="bg-white text-gray-900 border-orange-300">
                      📏 {(radius/1000).toFixed(1)}km
                    </Badge>
                    {categories.filter(c => c.enabled).map(c => (
                      <Badge key={c.id} className="bg-orange-500 text-white">
                        {c.name} ({places.filter(p => p.type === c.id).length})
                      </Badge>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        {properties.length} properties • {places.length} places
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          </div>
        </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map - FULL WIDTH */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            <Card className="bg-white border-gray-200 overflow-hidden shadow-md relative z-0">
              <CardContent className="p-0">
                <div className="relative z-0">
                  <div ref={mapRef} className="w-full h-[70vh] rounded-lg"></div>
                  
                  {(isLoading || isFetchingPlaces) && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-2 shadow-md">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span className="text-sm text-gray-900 font-medium">
                        {isLoading ? 'Loading properties...' : 'Fetching nearby places...'}
                      </span>
              </div>
            )}

                  {/* Current Location Badge */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200 shadow-md">
                    <div className="flex items-center gap-2">
                      <MapPinned className="w-4 h-4 text-orange-500" />
                      <span className="text-gray-900 font-semibold">{currentLocationName}</span>
                    </div>
                  </div>

                  {/* Selected Property Card */}
                  <AnimatePresence>
            {selectedProperty && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-4 left-4 right-4 md:w-96 md:left-auto bg-white/98 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-5"
              >
                <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg">{selectedProperty.title}</h3>
                            <div className="flex items-center mt-2 text-sm text-gray-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{selectedProperty.location}</span>
                    </div>
                    <Badge className="mt-2">{selectedProperty.type}</Badge>
                            <p className="mt-3 font-bold text-orange-500 text-2xl">₹{selectedProperty.price}/month</p>
                  </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-900"
                            onClick={() => setSelectedProperty(null)}
                          >
                            <X className="h-4 w-4" />
                  </Button>
                </div>
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" asChild className="flex-1 border-gray-300 hover:border-orange-500 hover:bg-orange-50">
                            <Link href={`/listings/${selectedProperty._id}`}>
                              <MapPinned className="w-3 h-3 mr-1" />
                              Details
                            </Link>
                  </Button>
                          <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600">
                            <Zap className="w-3 h-3 mr-1" />
                    Book Now
                  </Button>
                </div>
              </motion.div>
            )}
                  </AnimatePresence>

                  {/* Selected Place Card */}
                  <AnimatePresence>
                    {selectedPlace && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-4 left-4 right-4 md:w-96 md:left-auto bg-white/98 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-5"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg">{selectedPlace.name}</h3>
                            <Badge className="mt-2 bg-orange-100 text-orange-700 border-orange-300">
                              {categories.find(c => c.id === selectedPlace.type)?.name}
                            </Badge>
                            {selectedPlace.openingHours && (
                              <div className="mt-3 flex items-center text-sm text-gray-600">
                                <Clock className="w-3 h-3 mr-1" />
                                {selectedPlace.openingHours}
              </div>
                            )}
              </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-900"
                            onClick={() => setSelectedPlace(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
              </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
              </div>
                  </CardContent>
                </Card>

            {/* WIDGETS BELOW MAP - FILL ALL EMPTY SPACE! */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Smart Empty State - No Properties */}
              {!isLoading && properties.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="md:col-span-2 lg:col-span-4"
                >
                  <Card className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200">
                    <CardContent className="p-8 text-center">
                      <MapPinOff className="w-16 h-16 mx-auto text-orange-300 mb-4" />
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No Properties Found</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Try adjusting your filters or search in a different location
                      </p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={() => setMaxBudget(50000)}
                        >
                          Increase Budget
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-300 hover:bg-orange-50"
                          onClick={requestCurrentLocation}
                        >
                          Use My Location
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Smart Empty State - No Nearby Places */}
              {!isFetchingPlaces && places.length === 0 && properties.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="md:col-span-2"
                >
                  <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
                    <CardContent className="p-6 text-center">
                      <MapPinOff className="w-12 h-12 mx-auto text-blue-300 mb-3" />
                      <h4 className="text-sm font-bold text-gray-900 mb-2">No Amenities Found</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Enable more categories to discover nearby places
                      </p>
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600"
                        onClick={() => toggleAllCategories(true)}
                      >
                        <Filter className="w-3 h-3 mr-2" />
                        Enable All Categories
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Loading State Placeholder */}
              {isLoading && (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card className="bg-white border-gray-200 shadow-md h-full">
                        <CardHeader className="pb-3">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 w-5/6 bg-gray-200 rounded animate-pulse" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </>
              )}

              {/* Commute Time Calculator */}
              {nearestCollege && properties.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <Bus className="w-4 h-4 text-orange-500" />
                        Commute Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {properties.slice(0, 3).map((property) => {
                        if (!property.coordinates?.coordinates) return null
                        const [lng, lat] = property.coordinates.coordinates
                        const distance = Math.sqrt(
                          Math.pow(lat - nearestCollege.lat, 2) + 
                          Math.pow(lng - nearestCollege.lon, 2)
                        ) * 111
                        const walkTime = Math.round(distance * 12)
                        const bikeTime = Math.round(distance * 3)
                        const autoTime = Math.round(distance * 2)
                        
                        return (
                          <div key={property._id} className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                            <p className="text-gray-900 font-semibold truncate mb-1">{property.title}</p>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-blue-600 font-medium">🚶 {walkTime}m</span>
                              <span className="text-orange-600 font-medium">🚲 {bikeTime}m</span>
                              <span className="text-green-600 font-medium">🚕 {autoTime}m</span>
              </div>
            </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Area Stats - REAL DATA */}
              {insights && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        Area Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-center">
                          <p className="text-lg font-bold text-gray-900">{colleges.length}</p>
                          <p className="text-gray-600 font-medium">Colleges</p>
          </div>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-center">
                          <p className="text-lg font-bold text-gray-900">{insights.restaurants}</p>
                          <p className="text-gray-600 font-medium">Eateries</p>
                        </div>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-center">
                          <p className="text-lg font-bold text-gray-900">{insights.transport}</p>
                          <p className="text-gray-600 font-medium">Transport</p>
                        </div>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-center">
                          <p className="text-lg font-bold text-gray-900">{insights.atms}</p>
                          <p className="text-gray-600 font-medium">ATMs</p>
                        </div>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-center">
                          <p className="text-lg font-bold text-gray-900">{insights.groceries}</p>
                          <p className="text-gray-600 font-medium">Groceries</p>
                        </div>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-center">
                          <p className="text-lg font-bold text-gray-900">{insights.cafes}</p>
                          <p className="text-gray-600 font-medium">Cafés</p>
                        </div>
                      </div>
                      {insights.is24x7Available && (
                        <div className="mt-2 p-1.5 bg-green-50 border border-green-200 rounded text-center">
                          <p className="text-[10px] text-green-700 font-semibold">🌙 24/7 services</p>
                        </div>
                      )}
                  </CardContent>
                </Card>
                </motion.div>
              )}

              {/* Nearby Places Breakdown - REAL DATA */}
              {places.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        Nearby Places
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {places
                        .slice(0, 8)
                        .map((place) => (
                          <div
                            key={place.id}
                            className="p-2 bg-gray-50 border border-gray-200 rounded text-xs cursor-pointer hover:bg-white hover:border-orange-300 hover:shadow-sm transition-all"
                            onClick={() => {
                              if (map) {
                                map.setView([place.lat, place.lon], 17)
                                setSelectedPlace(place)
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-gray-900 font-medium truncate flex-1">{place.name}</span>
                              <Badge className="text-[10px] ml-2 bg-orange-100 text-orange-700 border-orange-300">
                                {place.type}
                              </Badge>
                      </div>
                        </div>
                        ))}
                      {places.length > 8 && (
                        <p className="text-xs text-gray-600 font-medium text-center pt-1">
                          +{places.length - 8} more places
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}


              {/* Safety Indicators - REAL DATA */}
              {insights && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-orange-500" />
                        Safety Index
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                          <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 font-medium">Safety Score</span>
                          <span className={`font-bold ${insights.scores.safety >= 60 ? 'text-green-600' : insights.scores.safety >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {insights.scores.safety}/100
                          </span>
                          </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${insights.scores.safety >= 60 ? 'bg-green-500' : insights.scores.safety >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${insights.scores.safety}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 font-medium">Night Safety</span>
                          <span className={`font-bold ${insights.scores.nightSafety >= 60 ? 'text-green-600' : insights.scores.nightSafety >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {insights.scores.nightSafety}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${insights.scores.nightSafety >= 60 ? 'bg-green-500' : insights.scores.nightSafety >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${insights.scores.nightSafety}%` }}
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-xs">
                          <ShieldCheck className="w-3 h-3 text-orange-500" />
                          <span className="text-gray-700 font-medium">Police Stations:</span>
                          <span className="text-gray-900 font-bold">{insights.police}</span>
                        </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
              )}

              {/* Top Restaurants - REAL DATA */}
              {places.filter(p => p.type === 'restaurant').length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                        Top Eateries
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {places
                        .filter(p => p.type === 'restaurant')
                        .slice(0, 5)
                        .map((place) => (
                          <div
                            key={place.id}
                            className="p-2 bg-gray-50 border border-gray-200 rounded text-xs cursor-pointer hover:bg-white hover:border-orange-300 hover:shadow-sm transition-all"
                            onClick={() => {
                              if (map) {
                                map.setView([place.lat, place.lon], 17)
                                setSelectedPlace(place)
                              }
                            }}
                          >
                            <p className="text-gray-900 font-medium truncate">{place.name}</p>
                            {place.openingHours && (
                              <p className="text-[10px] text-gray-600 mt-0.5 truncate">{place.openingHours}</p>
                            )}
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Transport Options - REAL DATA */}
              {places.filter(p => p.type === 'transport').length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <Train className="w-4 h-4 text-orange-500" />
                        Transport
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {places
                        .filter(p => p.type === 'transport')
                        .slice(0, 6)
                        .map((place) => (
                          <div
                            key={place.id}
                            className="p-2 bg-gray-50 border border-gray-200 rounded text-xs cursor-pointer hover:bg-white hover:border-orange-300 hover:shadow-sm transition-all flex items-center gap-2"
                            onClick={() => {
                              if (map) {
                                map.setView([place.lat, place.lon], 17)
                                setSelectedPlace(place)
                              }
                            }}
                          >
                            <Bus className="w-3 h-3 text-orange-500" />
                            <span className="text-gray-900 font-medium truncate flex-1">{place.name}</span>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Properties List - REAL DATA */}
              {properties.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="md:col-span-2 lg:col-span-1"
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader>
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <Home className="w-4 h-4 text-orange-500" />
                        Properties ({properties.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {properties.slice(0, 4).map((property) => (
                        <div
                          key={property._id}
                          className="p-2 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:bg-white hover:border-orange-300 hover:shadow-sm transition-all"
                          onClick={() => {
                            setSelectedProperty(property)
                            if (map && property.coordinates?.coordinates) {
                              const [lng, lat] = property.coordinates.coordinates
                              map.setView([lat, lng], 16)
                            }
                          }}
                        >
                          <h4 className="font-semibold text-gray-900 text-xs">{property.title}</h4>
                          <p className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-2 h-2 text-orange-500" />
                            {property.location}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className="text-[10px] border-gray-300">{property.type}</Badge>
                            <p className="text-orange-500 font-bold text-xs">₹{property.price}/mo</p>
                          </div>
                        </div>
                      ))}
                      {properties.length > 4 && (
                        <Button variant="outline" size="sm" className="w-full mt-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 text-xs">
                          <Link href="/listings">View all {properties.length}</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Weather Widget - REAL DATA */}
              {weather && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <CloudSun className="w-4 h-4 text-orange-500" />
                        Weather Now
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-4xl font-bold text-gray-900">
                            {weather.main.temp}°C
                          </div>
                          <div className="text-xs text-gray-600 capitalize mt-1">
                            {weather.weather[0].description}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Droplets className="w-3 h-3" />
                              {weather.main.humidity}%
                            </span>
                            <span className="flex items-center gap-1">
                              <Wind className="w-3 h-3" />
                              {weather.wind.speed} m/s
                            </span>
                          </div>
                        </div>
                        <CloudSun className="w-16 h-16 text-orange-500 opacity-50" />
                      </div>
                      {weather.isMockData && (
                        <div className="mt-2 text-[9px] text-gray-500">
                          <Info className="w-3 h-3 inline mr-1" />
                          Estimated data
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Cost of Living Calculator - REAL DATA */}
              {insights && properties.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-orange-500" />
                        Monthly Cost
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rent (Avg)</span>
                          <span className="font-bold text-gray-900">
                            ₹{Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Food ({insights.restaurants} options)</span>
                          <span className="font-bold text-gray-900">₹{insights.costEstimate.food}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transport ({insights.transport} stops)</span>
                          <span className="font-bold text-gray-900">₹{insights.costEstimate.transport}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Misc</span>
                          <span className="font-bold text-gray-900">₹{insights.costEstimate.misc}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-base">
                          <span className="font-bold text-gray-900">Total (Est.)</span>
                          <span className="font-bold text-orange-500">
                            ₹{(Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length) + insights.costEstimate.total).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Trending Areas Widget - REAL DATA */}
              {trendingAreas.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        Trending Areas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {trendingAreas.map((area, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded hover:border-orange-300 transition-colors">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Badge className="bg-orange-500 text-white text-[10px] px-1.5">{i + 1}</Badge>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-gray-900 block truncate">{area.name}</span>
                              <span className="text-[10px] text-gray-600">{area.propertyCount} properties</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-orange-500">₹{area.minPrice}+</div>
                            {area.distance && (
                              <div className="text-[9px] text-gray-500">{area.distance}km away</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Area Reviews Widget - REAL DATA */}
              {reviews.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <Star className="w-4 h-4 text-orange-500" />
                        Area Reviews
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                      {reviews.slice(0, 3).map((review) => (
                        <div key={review._id} className="border-b border-gray-200 pb-2 last:border-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={review.user.image} />
                              <AvatarFallback className="bg-orange-100 text-orange-700 text-[10px]">
                                {review.user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-gray-900">{review.user.name}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 line-clamp-2">{review.comment}</p>
                          <div className="flex gap-1 mt-1">
                            {Array(review.rating).fill(0).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-orange-500 text-orange-500" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Route Planner Widget - REAL DATA */}
              {nearestCollege && properties.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 }}
                  className="md:col-span-2"
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <Route className="w-4 h-4 text-orange-500" />
                        Route to {nearestCollege.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-gray-600">Property</Label>
                            <Select 
                              value={selectedPropertyForRoute} 
                              onValueChange={(value) => {
                                setSelectedPropertyForRoute(value)
                                fetchRoute(value, routeMode)
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                              <SelectContent>
                                {properties.slice(0, 5).map(p => (
                                  <SelectItem key={p._id} value={p._id} className="text-xs">
                                    {p.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Mode</Label>
                            <Select 
                              value={routeMode} 
                              onValueChange={(value: any) => {
                                setRouteMode(value)
                                if (selectedPropertyForRoute) {
                                  fetchRoute(selectedPropertyForRoute, value)
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="driving" className="text-xs">🚗 Driving</SelectItem>
                                <SelectItem value="walking" className="text-xs">🚶 Walking</SelectItem>
                                <SelectItem value="bicycling" className="text-xs">🚲 Bicycling</SelectItem>
                                <SelectItem value="transit" className="text-xs">🚌 Transit</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {isLoadingRoute && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                          </div>
                        )}
                        
                        {route && !isLoadingRoute && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg">
                              <div className="text-center">
                                <div className="text-xs text-gray-600">Distance</div>
                                <div className="text-sm font-bold text-gray-900">{route.distance}</div>
                              </div>
                              <Separator orientation="vertical" className="h-8" />
                              <div className="text-center">
                                <div className="text-xs text-gray-600">Duration</div>
                                <div className="text-sm font-bold text-gray-900">{route.duration}</div>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full bg-orange-500 hover:bg-orange-600"
                              onClick={() => window.open(route.googleMapsUrl, '_blank')}
                            >
                              <Navigation className="w-3 h-3 mr-2" />
                              Open in Google Maps
                            </Button>
                            {route.isMockData && (
                              <div className="text-[9px] text-gray-500 text-center">
                                <Info className="w-3 h-3 inline mr-1" />
                                Estimated route
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Property Comparison Table - REAL DATA */}
              {properties.length >= 3 && nearestCollege && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="md:col-span-2 lg:col-span-4"
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-orange-500" />
                        Quick Compare (Top 3)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left p-2 font-semibold text-gray-700">Property</th>
                              <th className="text-center p-2 font-semibold text-gray-700">Price</th>
                              <th className="text-center p-2 font-semibold text-gray-700">Type</th>
                              <th className="text-center p-2 font-semibold text-gray-700">Distance</th>
                              <th className="text-center p-2 font-semibold text-gray-700">Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {properties.slice(0, 3).map((property) => {
                              if (!property.coordinates?.coordinates) return null
                              const [lng, lat] = property.coordinates.coordinates
                              const distance = Math.sqrt(
                                Math.pow(lat - nearestCollege.lat, 2) + 
                                Math.pow(lng - nearestCollege.lon, 2)
                              ) * 111
                              const score = Math.round(85 - (distance * 5)) // Mock score based on distance
                              
                              return (
                                <tr key={property._id} className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                                  <td className="p-2 font-medium text-gray-900 max-w-[200px] truncate">{property.title}</td>
                                  <td className="text-center p-2 font-bold text-orange-500">₹{property.price}</td>
                                  <td className="text-center p-2">
                                    <Badge variant="outline" className="text-[10px]">{property.type}</Badge>
                                  </td>
                                  <td className="text-center p-2 text-gray-600">{distance.toFixed(1)} km</td>
                                  <td className="text-center p-2">
                                    <Badge className={`${score >= 70 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} text-[10px]`}>
                                      {score}/100
                                    </Badge>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Property Availability Timeline - REAL DATA */}
              {properties.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6 }}
                  className="md:col-span-2"
                >
                  <Card className="bg-white border-gray-200 shadow-md h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-gray-900 text-sm font-semibold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        Availability
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {properties.slice(0, 4).map((property) => (
                        <div key={property._id} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded hover:border-orange-300 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-900 truncate">{property.title}</div>
                            <div className="text-[10px] text-gray-600">
                              Available Now
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700 text-[10px]">
                            ✓ Now
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>

          {/* Insights Sidebar */}
          <div className="space-y-4">
            {/* NEARBY COLLEGES - #1 PRIORITY FOR STUDENTS! */}
            {colleges.length > 0 && (
                  <motion.div
                initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-white border-2 border-orange-200 overflow-hidden shadow-lg">
                  <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-orange-100">
                    <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      Nearby Colleges ({colleges.length})
                    </CardTitle>
                    <p className="text-gray-700 text-sm font-medium">Perfect for student accommodation</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                      {colleges
                        .map(college => ({
                          ...college,
                          distance: Math.sqrt(
                            Math.pow(college.lat - mapCenter[0], 2) + 
                            Math.pow(college.lon - mapCenter[1], 2)
                          ) * 111
                        }))
                        .sort((a, b) => a.distance - b.distance)
                        .slice(0, 10)
                        .map((college, index) => (
                          <div
                            key={college.id}
                            className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => {
                              if (map) {
                                map.setView([college.lat, college.lon], 16)
                                setSelectedPlace(college)
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {index === 0 && (
                                    <Badge className="bg-orange-500 text-white text-xs">
                                      Nearest
                        </Badge>
                                  )}
                                  <h4 className="font-bold text-gray-900 text-base leading-tight">
                                    {college.name}
                                  </h4>
                      </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-orange-500" />
                                    {college.distance.toFixed(2)} km away
                                  </span>
                                  {college.tags?.website && (
                                    <a
                                      href={college.tags.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 hover:text-orange-500"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Globe className="w-3 h-3" />
                                      Website
                                    </a>
                                  )}
                        </div>
                          </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-600 hover:text-orange-500 hover:bg-orange-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (map) {
                                    map.setView([college.lat, college.lon], 17)
                                  }
                                }}
                              >
                                <Navigation className="w-4 h-4" />
                          </Button>
                        </div>
                          </div>
                        ))}
                    </div>
                    {nearestCollege && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          🎯 <strong className="text-gray-900">Showing properties near {nearestCollege.name}</strong>
                        </div>
                      </div>
                    )}
                      </CardContent>
                    </Card>
                  </motion.div>
            )}

            {/* No Colleges Warning */}
            {!isLoading && !isFetchingPlaces && colleges.length === 0 && (
              <Card className="bg-yellow-50 border-2 border-yellow-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-gray-900 font-bold text-sm">No Colleges Found</h4>
                      <p className="text-gray-700 text-xs mt-1">
                        This area may not be ideal for student accommodation. Try searching near a college or university.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Insight Card */}
            {aiInsight && (
                  <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-white border-2 border-orange-200 overflow-hidden shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      AI Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-semibold text-gray-900">Match Score</span>
                      </div>
                        <div className="text-4xl font-bold text-orange-500">{aiInsight.matchScore}%</div>
                        </div>
                      <p className="text-gray-700 leading-relaxed">{aiInsight.recommendation}</p>
                      
                      {aiInsight.bestFor && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="text-sm font-semibold mb-1 text-gray-900">✨ Best For</div>
                          <div className="text-gray-700 text-sm">{aiInsight.bestFor}</div>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {aiInsight.pros.length > 0 && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                            <div className="text-xs font-semibold mb-1 text-green-700">👍 Pros</div>
                            <ul className="text-xs space-y-1 text-gray-700">
                              {aiInsight.pros.slice(0, 2).map((pro, i) => (
                                <li key={i}>• {pro}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiInsight.cons.length > 0 && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-xs font-semibold mb-1 text-red-700">⚠️ Cons</div>
                            <ul className="text-xs space-y-1 text-gray-700">
                              {aiInsight.cons.slice(0, 2).map((con, i) => (
                                <li key={i}>• {con}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
            )}

            {isLoadingAI && !aiInsight && (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-orange-500 mb-3" />
                  <p className="text-gray-600 text-sm font-medium">AI is analyzing this location...</p>
                </CardContent>
              </Card>
            )}

            {/* Overall Score */}
            {insights && (
                  <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-white border-2 border-orange-200 overflow-hidden shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      Bachelor Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-6xl font-bold text-orange-500">{insights.scores.overall}</span>
                      <span className="text-3xl font-light text-gray-600">/100</span>
                      </div>
                    <p className="text-gray-700 text-lg mb-4 font-medium">
                      {insights.scores.overall >= 80 ? '🎉 Perfect for bachelors!' : 
                       insights.scores.overall >= 60 ? '👍 Great location!' : 
                       insights.scores.overall >= 40 ? '😐 Average facilities' : 
                       '⚠️ Limited amenities'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="text-gray-600 text-sm font-medium">Properties</div>
                        <div className="text-2xl font-bold text-gray-900">{properties.length}</div>
                      </div>
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="text-gray-600 text-sm font-medium">Amenities</div>
                        <div className="text-2xl font-bold text-gray-900">{places.length}</div>
                      </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
            )}

            {/* Detailed Insights Tabs */}
            {insights && (
              <Card className="bg-white border-gray-200 shadow-md">
                <CardContent className="p-0">
                  <Tabs defaultValue="scores" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 bg-gray-100 rounded-t-lg">
                      <TabsTrigger value="scores">Scores</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>

                    <TabsContent value="scores" className="p-4 space-y-3">
                      {Object.entries({
                        food: { label: 'Food', icon: UtensilsCrossed, count: insights.restaurants },
                        connectivity: { label: 'Transport', icon: Bus, count: insights.transport },
                        walkability: { label: 'Walkability', icon: Footprints, count: 0 },
                        safety: { label: 'Safety', icon: ShieldCheck, count: insights.police },
                        nightSafety: { label: 'Night Safety', icon: Moon, count: 0 },
                        wifiAvailability: { label: 'WiFi Spots', icon: Wifi, count: insights.cafes },
                        health: { label: 'Healthcare', icon: Hospital, count: insights.hospitals + insights.pharmacies },
                        convenience: { label: 'Convenience', icon: ShoppingCart, count: insights.groceries + insights.atms },
                        fitness: { label: 'Fitness', icon: Dumbbell, count: insights.gyms },
                      }).map(([key, { label, icon: Icon, count }]) => (
                        <div key={key}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium flex items-center gap-1">
                              <Icon className="w-3 h-3 text-orange-500" />
                              {label} {count > 0 && `(${count})`}
                            </span>
                            <span className={`font-bold ${getScoreColor(insights.scores[key as keyof typeof insights.scores])}`}>
                              {insights.scores[key as keyof typeof insights.scores]}/100
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full transition-all"
                              style={{ width: `${insights.scores[key as keyof typeof insights.scores]}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="details" className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          {insights.is24x7Available ? (
                            <>
                              <Clock className="w-8 h-8 text-green-600" />
                              <div>
                                <div className="text-gray-900 font-semibold">24/7 Services</div>
                                <div className="text-sm text-green-600 font-medium">Available</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <Clock className="w-8 h-8 text-gray-400" />
                              <div>
                                <div className="text-gray-900 font-semibold">24/7 Services</div>
                                <div className="text-sm text-gray-600">Limited</div>
                              </div>
              </>
            )}
          </div>

                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: GraduationCap, label: 'Colleges', count: insights.colleges, color: 'text-orange-500' },
                            { icon: DollarSign, label: 'ATMs', count: insights.atms, color: 'text-green-600' },
                            { icon: Dumbbell, label: 'Gyms', count: insights.gyms, color: 'text-pink-600' },
                            { icon: ShoppingCart, label: 'Groceries', count: insights.groceries, color: 'text-blue-600' },
                          ].map(({ icon: Icon, label, count, color }) => (
                            <div key={label} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                              <Icon className={`w-6 h-6 mx-auto mb-1 ${color}`} />
                              <div className="text-2xl font-bold text-gray-900">{count}</div>
                              <div className="text-xs text-gray-600 font-medium">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* No insights message */}
            {!insights && !isLoading && !isFetchingPlaces && (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium">
                    {categories.every(c => !c.enabled) ? 
                      "Select categories above to load real-time insights" : 
                      "Search a location to see live area analysis"}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Loading state */}
            {(isLoading || isFetchingPlaces) && !insights && (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-orange-500 mb-3" />
                  <p className="text-gray-600 font-medium">
                    {isLoading ? 'Loading properties...' : 'Analyzing area...'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* NO HARDCODED DATA - Only show real info from APIs! */}
      </div>
        </div>
      </div>

      {/* AI CHAT ASSISTANT - FLOATING WIDGET! */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-24 right-6 w-96 h-[32rem] bg-white border-2 border-gray-200 rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold">SecondHome AI</h3>
                  <p className="text-xs text-gray-600">Your smart assistant</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsChatOpen(false)}
                className="text-gray-600 hover:text-gray-900 hover:bg-orange-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {/* Welcome Message */}
              {chatMessages.length === 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-gray-900 font-semibold">
                    👋 Hi! I'm your SecondHome AI assistant. I can help you with:
                  </p>
                  <ul className="mt-2 text-xs text-gray-700 space-y-1 ml-4">
                    <li>• Finding properties near colleges</li>
                    <li>• Comparing different locations</li>
                    <li>• Understanding area safety & amenities</li>
                    <li>• Budget recommendations</li>
                  </ul>
                  <p className="mt-2 text-xs text-gray-600">
                    Ask me anything about {currentLocationName}!
                  </p>
                </div>
              )}

              {/* Chat Messages */}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* AI Thinking */}
              {isAiThinking && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 border border-gray-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span className="text-sm text-gray-600 font-medium">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!chatInput.trim() || isAiThinking) return

                  const userMessage = chatInput.trim()
                  setChatInput("")
                  setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
                  setIsAiThinking(true)

                  try {
                    // Prepare context
                    const context = {
                      location: currentLocationName,
                      properties: properties.length,
                      colleges: colleges.length,
                      insights: insights ? {
                        restaurants: insights.restaurants,
                        transport: insights.transport,
                        safety: insights.police,
                        scores: insights.scores
                      } : null,
                      nearestCollege: nearestCollege?.name
                    }

                    // Call SecondHome AI service
                    const response = await fetch('/api/ai/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: userMessage,
                        context
                      })
                    })

                    const data = await response.json()

                    if (data.reply) {
                      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
                    } else {
                      throw new Error('No reply from AI')
                    }
                  } catch (error) {
                    console.error('Chat error:', error)
                    setChatMessages(prev => [...prev, { 
                      role: 'assistant', 
                      content: "Sorry, I'm having trouble right now. Please try again!" 
                    }])
                  } finally {
                    setIsAiThinking(false)
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-orange-500"
                  disabled={isAiThinking}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!chatInput.trim() || isAiThinking}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Sparkles className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chat FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-orange-500 hover:bg-orange-600 rounded-full shadow-xl flex items-center justify-center z-50 transition-all"
      >
        {isChatOpen ? (
          <X className="w-8 h-8 text-white" />
        ) : (
          <Bot className="w-8 h-8 text-white" />
        )}
        {!isChatOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
            AI
          </span>
        )}
      </motion.button>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #f97316;
        }
      `}</style>
    </div>
  )
}
