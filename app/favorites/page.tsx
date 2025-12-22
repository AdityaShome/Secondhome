"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"
import {
  MapPin, Star, Loader2, Heart, IndianRupee, Wifi, Car, Home, Shield, Sparkles,
  CheckCircle2, Award, Zap, Building2, Trash2, ArrowLeft, HeartOff
} from "lucide-react"

// Property Card Skeleton Loader
const PropertyCardSkeleton = () => (
  <Card className="overflow-hidden animate-pulse">
    <div className="relative h-64 bg-gray-200" />
    <CardContent className="p-6">
      <div className="h-6 bg-gray-200 rounded mb-4" />
      <div className="h-4 bg-gray-200 rounded mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </CardContent>
  </Card>
)

export default function FavoritesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    
    if (status === "authenticated") {
      fetchFavorites()
    }
  }, [status, router])

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/favorites")
      if (!res.ok) throw new Error("Failed to fetch favorites")

      const data = await res.json()
      
      // Fetch full property details for each favorite
      const propertyPromises = data.favorites.map(async (propertyId: string) => {
        const propRes = await fetch(`/api/properties/${propertyId}`)
        if (propRes.ok) {
          const propData = await propRes.json()
          return propData.property
        }
        return null
      })

      const properties = await Promise.all(propertyPromises)
      setFavorites(properties.filter(Boolean))
    } catch (error) {
      console.error("❌ Error fetching favorites:", error)
      toast({
        title: "Error",
        description: "Failed to load favorites",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (propertyId: string) => {
    setRemovingId(propertyId)
    try {
      const res = await fetch(`/api/favorites?propertyId=${propertyId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setFavorites(prev => prev.filter(p => p._id !== propertyId))
        toast({
          title: "Removed",
          description: "Property removed from favorites",
        })
      } else {
        throw new Error("Failed to remove favorite")
      }
    } catch (error) {
      console.error("❌ Error removing favorite:", error)
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <h1 className="text-4xl font-bold text-gray-900">Loading Your Favorites...</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">My Favorites</h1>
              <p className="text-gray-600 mt-2">
                {favorites.length === 0 
                  ? "You haven't saved any properties yet" 
                  : `${favorites.length} ${favorites.length === 1 ? 'property' : 'properties'} saved`}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Empty State */}
        {!loading && favorites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-12 text-center max-w-2xl mx-auto"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <HeartOff className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No Favorites Yet
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start exploring amazing properties and save your favorites to view them here!
            </p>
            <Button
              size="lg"
              onClick={() => router.push("/listings")}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <Heart className="w-4 h-4 mr-2" />
              Explore Properties
            </Button>
          </motion.div>
        )}

        {/* Favorites Grid */}
        {favorites.length > 0 && (
          <AnimatePresence mode="popLayout">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {favorites.map((property, index) => (
                <PropertyCard
                  key={property._id}
                  property={property}
                  index={index}
                  onRemove={removeFavorite}
                  isRemoving={removingId === property._id}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

// Property Card Component
function PropertyCard({
  property,
  index,
  onRemove,
  isRemoving,
}: {
  property: any
  index: number
  onRemove: (id: string) => void
  isRemoving: boolean
}) {
  const [imageError, setImageError] = useState(false)
  const router = useRouter()

  const formatPrice = (price: number) => {
    if (price >= 100000) return `${(price / 100000).toFixed(1)}L`
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`
    return price.toString()
  }

  const getPropertyImage = () => {
    if (property.images && property.images.length > 0) {
      return property.images[0]
    }
    return "/placeholder-property.jpg"
  }

  const amenityIcons: Record<string, any> = {
    "WiFi": Wifi,
    "Parking": Car,
    "Furnished": Home,
    "Security": Shield,
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="group overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer bg-white"
        onClick={() => router.push(`/property/${property._id}`)}
      >
        <div className="relative h-64 overflow-hidden">
          <Image
            src={imageError ? "/placeholder-property.jpg" : getPropertyImage()}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {property.gender && (
              <Badge className="bg-blue-500/90 text-white backdrop-blur">
                {property.gender}
              </Badge>
            )}
            {property.type && (
              <Badge className="bg-purple-500/90 text-white backdrop-blur">
                {property.type}
              </Badge>
            )}
            {property.aiReview?.isLegit && (
              <Badge className="bg-green-500/90 text-white backdrop-blur flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Verified
              </Badge>
            )}
          </div>

          {/* Remove Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove(property._id)
            }}
            disabled={isRemoving}
            className="absolute top-4 right-4 w-10 h-10 bg-white/95 backdrop-blur rounded-full flex items-center justify-center hover:scale-110 transition-all active:scale-95 disabled:opacity-50"
          >
            {isRemoving ? (
              <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5 text-red-500" />
            )}
          </button>

          {/* Price */}
          <div className="absolute bottom-4 right-4">
            <div className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
              ₹{formatPrice(property.price)}/mo
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-orange-500 transition-colors">
            {property.title}
          </h3>

          {/* Location */}
          <div className="flex items-center text-gray-600 mb-4">
            <MapPin className="w-4 h-4 mr-2 text-orange-500" />
            <span className="text-sm line-clamp-1">
              {typeof property.location === 'string' ? property.location : property.location?.address || property.city || property.address || "Location not specified"}
            </span>
          </div>

          {/* Rating */}
          {property.rating && (
            <div className="flex items-center mb-4">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
              <span className="font-semibold text-gray-900">{property.rating}</span>
              <span className="text-gray-500 text-sm ml-2">
                ({property.reviews?.length || 0} reviews)
              </span>
            </div>
          )}

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {property.amenities.slice(0, 4).map((amenity: string) => {
                const Icon = amenityIcons[amenity] || CheckCircle2
                return (
                  <div
                    key={amenity}
                    className="flex items-center gap-1 text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-700"
                  >
                    <Icon className="w-3 h-3" />
                    {amenity}
                  </div>
                )
              })}
            </div>
          )}

          {/* Room Types */}
          {property.rooms && property.rooms.length > 0 && (
            <div className="text-sm text-blue-600 font-medium">
              {property.rooms.map((r: any) => r.type).join(", ")}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

