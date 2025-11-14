"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  MapPin, Star, Filter, Loader2, SlidersHorizontal, X, Bed, Bath, Users, Eye, TrendingUp, Heart, 
  Search, IndianRupee, Wifi, Car, Home, Shield, Sparkles, ChevronDown, Grid3x3, List, Map as MapIcon,
  CheckCircle2, Award, Zap, Building2
} from "lucide-react"

// Property Card Skeleton Loader
const PropertyCardSkeleton = () => (
  <Card className="overflow-hidden animate-pulse">
    <div className="relative h-64 bg-gray-200" />
    <CardContent className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded w-20" />
        <div className="h-6 bg-gray-200 rounded w-20" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-full" />
    </CardContent>
  </Card>
)

// Empty State Component
const EmptyState = ({ onReset }: { onReset: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="col-span-full flex flex-col items-center justify-center py-20"
  >
    <h3 className="text-2xl font-bold text-gray-900">No property found</h3>
  </motion.div>
)

export default function ListingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  
  // State Management
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState("recent")
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "")
  const [userFavorites, setUserFavorites] = useState<string[]>([])
  
  const [filters, setFilters] = useState({
    priceRange: [0, 100000] as [number, number],
    propertyTypes: [] as string[],
    genders: [] as string[],
    amenities: [] as string[],
    minRating: 0,
    verified: false,
  })

  // Fetch Properties and Favorites
  useEffect(() => {
    fetchProperties()
    if (session) {
      fetchFavorites()
    }
  }, [session])

  const fetchProperties = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/properties")
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      const data = await res.json()
      const approvedProperties = (data.properties || []).filter(
        (p: any) => p.isApproved && !p.isRejected
      )
      setListings(approvedProperties)

      // Set dynamic price range
      if (approvedProperties.length > 0) {
        const maxPrice = Math.max(...approvedProperties.map((p: any) => p.price || 0))
        setFilters((prev) => ({
          ...prev,
          priceRange: [0, Math.max(maxPrice, 100000)],
        }))
      }
    } catch (error) {
      console.error("❌ Error fetching properties:", error)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFavorites = async () => {
    try {
      const res = await fetch("/api/favorites")
      if (res.ok) {
        const data = await res.json()
        setUserFavorites(data.favorites || [])
      }
    } catch (error) {
      console.error("❌ Error fetching favorites:", error)
    }
  }

  const toggleFavorite = async (propertyId: string) => {
    if (!session) {
      toast({
        title: "Login Required",
        description: "Please login to save properties to favorites",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    const isFavorited = userFavorites.includes(propertyId)

    // Optimistic update
    if (isFavorited) {
      setUserFavorites(prev => prev.filter(id => id !== propertyId))
    } else {
      setUserFavorites(prev => [...prev, propertyId])
    }

    try {
      if (isFavorited) {
        // Remove from favorites
        const res = await fetch(`/api/favorites?propertyId=${propertyId}`, {
          method: "DELETE",
        })

        if (res.ok) {
          toast({
            title: "Removed from favorites",
            description: "Property removed from your favorites",
          })
        } else {
          throw new Error("Failed to remove favorite")
        }
      } else {
        // Add to favorites
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId }),
        })

        if (res.ok) {
          toast({
            title: "Added to favorites ❤️",
            description: "Property saved to your favorites",
          })
        } else {
          throw new Error("Failed to add favorite")
        }
      }
    } catch (error) {
      console.error("❌ Error toggling favorite:", error)
      // Revert optimistic update on error
      if (isFavorited) {
        setUserFavorites(prev => [...prev, propertyId])
      } else {
        setUserFavorites(prev => prev.filter(id => id !== propertyId))
      }
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Filter and Sort Logic
  const filteredAndSortedListings = useMemo(() => {
    let filtered = [...listings]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((p) =>
        p.title?.toLowerCase().includes(query) ||
        p.location?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.address?.toLowerCase().includes(query)
      )
    }

    // Price filter
    filtered = filtered.filter((p) => {
      const price = p.price || 0
      return price >= filters.priceRange[0] && price <= filters.priceRange[1]
    })

    // Property type filter
    if (filters.propertyTypes.length > 0) {
      filtered = filtered.filter((p) => filters.propertyTypes.includes(p.type))
    }

    // Gender filter
    if (filters.genders.length > 0) {
      filtered = filtered.filter((p) => filters.genders.includes(p.gender))
    }

    // Amenities filter
    if (filters.amenities.length > 0) {
      filtered = filtered.filter((p) =>
        filters.amenities.every((amenity) => p.amenities?.includes(amenity))
      )
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter((p) => (p.rating || 0) >= filters.minRating)
    }

    // Verified filter
    if (filters.verified) {
      filtered = filtered.filter((p) => p.approvalMethod === "AI")
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (a.price || 0) - (b.price || 0)
        case "price-high":
          return (b.price || 0) - (a.price || 0)
        case "rating":
          return (b.rating || 0) - (a.rating || 0)
        case "popular":
          return (b.reviews || 0) - (a.reviews || 0)
        case "recent":
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      }
    })

    return filtered
  }, [listings, searchQuery, filters, sortBy])

  // Available filter options - ONLY PG and Flat (NO HOSTEL!)
  const propertyTypes = ["PG", "Flat"] as const

  const genderOptions = useMemo(() => {
    const genders = new Set(listings.map((p) => p.gender).filter(Boolean))
    return Array.from(genders)
  }, [listings])

  // Dynamic amenities from actual listings
  const availableAmenities = useMemo(() => {
    const amenitiesSet = new Set<string>()
    listings.forEach(listing => {
      if (listing.amenities && Array.isArray(listing.amenities)) {
        listing.amenities.forEach((amenity: string) => amenitiesSet.add(amenity))
      }
    })
    return Array.from(amenitiesSet).sort()
  }, [listings])

  // Reset filters
  const resetFilters = () => {
    const maxPrice = Math.max(...listings.map((p: any) => p.price || 0), 100000)
    setFilters({
      priceRange: [0, maxPrice],
      propertyTypes: [],
      genders: [],
      amenities: [],
      minRating: 0,
      verified: false,
    })
    setSearchQuery("")
  }

  // Active filters count
  const activeFiltersCount = 
    filters.propertyTypes.length +
    filters.genders.length +
    filters.amenities.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.verified ? 1 : 0)

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`
    if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`
    return `₹${price}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50">
      {/* Hero Search Section */}
      <div className="relative bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
        
        <div className="relative container mx-auto px-4 py-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Perfect Second Home
            </h1>
            <p className="text-lg md:text-xl text-orange-100 mb-8">
              {filteredAndSortedListings.length} {filteredAndSortedListings.length === 1 ? 'property' : 'properties'} available
            </p>

            {/* Enhanced Search Bar */}
            <div className="bg-white rounded-2xl shadow-2xl p-2 flex gap-2">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by college, area, locality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-none focus-visible:ring-0 text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <Button 
                onClick={() => {/* Search logic */}}
                className="bg-orange-500 hover:bg-orange-600 px-8"
              >
                Search
              </Button>
            </div>
          </motion.div>

          {/* Quick Filters - ALL property types from schema */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {propertyTypes.map((type) => {
              const count = listings.filter(p => p.type === type).length
              return (
                <Button
                  key={type}
                  variant={filters.propertyTypes.includes(type) ? "default" : "secondary"}
                  size="sm"
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      propertyTypes: prev.propertyTypes.includes(type)
                        ? prev.propertyTypes.filter(t => t !== type)
                        : [...prev.propertyTypes, type]
                    }))
                  }}
                  className={filters.propertyTypes.includes(type) 
                    ? "bg-white text-orange-600 hover:bg-white/90" 
                    : "bg-white/20 text-white hover:bg-white/30"
                  }
                >
                  {type === "PG" && <Home className="w-4 h-4 mr-2" />}
                  {type === "Flat" && <Building2 className="w-4 h-4 mr-2" />}
                  {type}
                  <Badge className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0">
                    {count}
                  </Badge>
                </Button>
              )
            })}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 bg-orange-500 text-white">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-2xl">Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search to find the perfect property
                  </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-8">
                  {/* Price Range */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Price Range</Label>
                      <span className="text-sm text-gray-600">
                        {formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={Math.max(...listings.map((p: any) => p.price || 0), 100000)}
                      step={1000}
                      value={filters.priceRange}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, priceRange: value as [number, number] }))
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Property Types */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Property Type</Label>
                    <div className="space-y-3">
                      {propertyTypes.map((type) => {
                        const count = listings.filter(p => p.type === type).length
                        return (
                          <div key={type} className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`type-${type}`}
                                checked={filters.propertyTypes.includes(type)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    propertyTypes: checked
                                      ? [...prev.propertyTypes, type]
                                      : prev.propertyTypes.filter((t) => t !== type),
                                  }))
                                }}
                              />
                              <Label htmlFor={`type-${type}`} className="cursor-pointer">
                                {type}
                              </Label>
                            </div>
                            <span className="text-xs text-gray-500">({count})</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Gender */}
                  {genderOptions.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Gender Preference</Label>
                      <div className="space-y-3">
                        {genderOptions.map((gender) => (
                          <div key={gender} className="flex items-center space-x-2">
                            <Checkbox
                              id={`gender-${gender}`}
                              checked={filters.genders.includes(gender)}
                              onCheckedChange={(checked) => {
                                setFilters((prev) => ({
                                  ...prev,
                                  genders: checked
                                    ? [...prev.genders, gender]
                                    : prev.genders.filter((g) => g !== gender),
                                }))
                              }}
                            />
                            <Label htmlFor={`gender-${gender}`} className="cursor-pointer">
                              {gender}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amenities */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Amenities</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {availableAmenities.map((amenity) => (
                        <div key={amenity} className="flex items-center space-x-2">
                          <Checkbox
                            id={`amenity-${amenity}`}
                            checked={filters.amenities.includes(amenity)}
                            onCheckedChange={(checked) => {
                              setFilters((prev) => ({
                                ...prev,
                                amenities: checked
                                  ? [...prev.amenities, amenity]
                                  : prev.amenities.filter((a) => a !== amenity),
                              }))
                            }}
                          />
                          <Label htmlFor={`amenity-${amenity}`} className="cursor-pointer capitalize">
                            {amenity}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Minimum Rating</Label>
                    <div className="flex gap-2">
                      {[0, 3, 4, 4.5].map((rating) => (
                        <Button
                          key={rating}
                          variant={filters.minRating === rating ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilters((prev) => ({ ...prev, minRating: rating }))}
                          className={filters.minRating === rating ? "bg-orange-500" : ""}
                        >
                          {rating === 0 ? "Any" : `${rating}+`}
                          {rating > 0 && <Star className="w-3 h-3 ml-1 fill-current" />}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* AI Verified */}
                  <div className="flex items-center space-x-2 p-4 bg-purple-50 rounded-lg">
                    <Checkbox
                      id="verified"
                      checked={filters.verified}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({ ...prev, verified: checked as boolean }))
                      }
                    />
                    <Label htmlFor="verified" className="cursor-pointer flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>AI Verified Only</span>
                    </Label>
                  </div>

                  {/* Reset Button */}
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      onClick={resetFilters}
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <span className="text-sm text-gray-600">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
              </span>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-orange-500" : ""}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-orange-500" : ""}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {[...Array(6)].map((_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAndSortedListings.length === 0 ? (
          <EmptyState onReset={resetFilters} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
            >
              {filteredAndSortedListings.map((property, index) => (
                <PropertyCard 
                  key={property._id} 
                  property={property} 
                  index={index} 
                  viewMode={viewMode}
                  isFavorited={userFavorites.includes(property._id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Results Summary */}
        {!loading && filteredAndSortedListings.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center text-gray-600"
          >
            Showing {filteredAndSortedListings.length} of {listings.length} properties
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Property Card Component
function PropertyCard({ 
  property, 
  index, 
  viewMode,
  isFavorited,
  onToggleFavorite
}: { 
  property: any; 
  index: number; 
  viewMode: "grid" | "list";
  isFavorited: boolean;
  onToggleFavorite: (propertyId: string) => void;
}) {
  const [imageError, setImageError] = useState(false)
  const router = useRouter()

  const formatPrice = (price: number) => {
    if (price >= 100000) return `${(price / 100000).toFixed(1)}L`
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`
    return price.toString()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`group overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-orange-200 ${viewMode === "list" ? "flex" : ""}`}>
        {/* Image Section */}
        <div className={`relative ${viewMode === "grid" ? "h-64" : "w-80 flex-shrink-0"} overflow-hidden`}>
          <Link href={`/listings/${property._id}`}>
            <Image
              src={imageError ? "/placeholder.jpg" : (property.images?.[0] || "/placeholder.jpg")}
              alt={property.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              onError={() => setImageError(true)}
            />
          </Link>

          {/* Overlays */}
          <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
            <Badge className="bg-white/95 text-gray-900 backdrop-blur">
              {property.type || "PG"}
            </Badge>
            {property.gender && (
              <Badge variant="secondary" className="bg-blue-500/95 text-white backdrop-blur">
                {property.gender}
              </Badge>
            )}
            {property.approvalMethod === "AI" && (
              <Badge className="bg-purple-500/95 text-white backdrop-blur">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Verified
              </Badge>
            )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(property._id)
            }}
            className="absolute top-4 right-4 w-10 h-10 bg-white/95 backdrop-blur rounded-full flex items-center justify-center hover:scale-110 transition-all active:scale-95"
          >
            <Heart className={`w-5 h-5 transition-all ${isFavorited ? "fill-red-500 text-red-500 scale-110" : "text-gray-600"}`} />
          </button>

          <div className="absolute bottom-4 right-4">
            <div className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
              ₹{formatPrice(property.price)}/mo
            </div>
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="p-6 flex-1">
          <Link href={`/listings/${property._id}`}>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
              {property.title || "Untitled Property"}
            </h3>
          </Link>

          <div className="flex items-center text-gray-600 mb-4">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="text-sm line-clamp-1">{property.location || property.address || "Location not specified"}</span>
          </div>

          {/* Rating */}
          {property.rating > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center bg-green-500 text-white px-2 py-1 rounded-md">
                <Star className="w-3 h-3 fill-current mr-1" />
                <span className="text-sm font-semibold">{property.rating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-gray-500">
                {property.reviews || 0} review{property.reviews !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {property.amenities.slice(0, 4).map((amenity: string, idx: number) => {
                const icons: any = { wifi: Wifi, parking: Car, ac: Zap }
                const Icon = icons[amenity.toLowerCase()] || CheckCircle2
                return (
                  <div key={idx} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                    <Icon className="w-3 h-3" />
                    <span className="capitalize">{amenity}</span>
                  </div>
                )
              })}
              {property.amenities.length > 4 && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  +{property.amenities.length - 4} more
                </div>
              )}
            </div>
          )}

          {/* Room Types */}
          {property.roomTypes && property.roomTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {property.roomTypes.slice(0, 2).map((room: any, idx: number) => (
                <div key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  {room.type}: ₹{formatPrice(room.price)}
                </div>
              ))}
            </div>
          )}

          <Button 
            onClick={() => router.push(`/listings/${property._id}`)}
            className="w-full bg-orange-500 hover:bg-orange-600 group-hover:bg-orange-600"
          >
            View Details
            <Eye className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
