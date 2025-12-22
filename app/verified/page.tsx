"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import {
  MapPin, Star, Shield, CheckCircle2, IndianRupee, Search, Filter, 
  Loader2, TrendingUp, Award, Sparkles, Home, Building2
} from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

interface VerifiedProperty {
  _id: string
  title: string
  location: string
  price: number
  images: string[]
  rating: number
  reviews: number
  type: string
  gender: string
  amenities: string[]
  isVerified: boolean
  verifiedAt: string
}

export default function VerifiedPropertiesPage() {
  const { t, lang } = useLanguage()
  const [properties, setProperties] = useState<VerifiedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const { toast } = useToast()
  const [forceUpdate, setForceUpdate] = useState(0)

  useEffect(() => {
    fetchVerifiedProperties()
  }, [])

  // Force re-render when language changes
  useEffect(() => {
    setForceUpdate(prev => prev + 1)
  }, [lang])

  const fetchVerifiedProperties = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/properties/verified")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setProperties(data.properties || [])
    } catch (error) {
      console.error("Error fetching verified properties:", error)
      toast({
        title: t("verified.error.title") || "Error",
        description: t("verified.error.description") || "Failed to load verified properties",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === "all" || property.type === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-background" key={`${lang}-${forceUpdate}`}>
      {/* Header Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8" />
            <h1 className="text-4xl font-bold">{t("verified.title")}</h1>
          </div>
          <p className="text-lg text-white/90 max-w-2xl">
            {t("verified.description")}
          </p>
          <div className="mt-6 flex items-center gap-4 flex-wrap">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {t("verified.badge.trusted")}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <TrendingUp className="h-4 w-4 mr-1" />
              {t("verified.badge.leads")}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Award className="h-4 w-4 mr-1" />
              {t("verified.badge.premium")}
            </Badge>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("verified.search.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedType === "all" ? "default" : "outline"}
              onClick={() => setSelectedType("all")}
            >
              {t("verified.filter.all")}
            </Button>
            <Button
              variant={selectedType === "PG" ? "default" : "outline"}
              onClick={() => setSelectedType("PG")}
            >
              {t("home.service.pgs")}
            </Button>
            <Button
              variant={selectedType === "Flat" ? "default" : "outline"}
              onClick={() => setSelectedType("Flat")}
            >
              {t("home.service.flats")}
            </Button>
          </div>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="h-64 bg-gray-200" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-2xl font-bold mb-2">{t("verified.empty.title")}</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? t("verified.empty.searchMessage") : t("verified.empty.noSearchMessage")}
            </p>
            <Button asChild>
              <Link href="/list-property">{t("home.listProperty.ctaPrimary")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property, index) => (
              <motion.div
                key={property._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 group">
                  <Link href={`/listings/${property._id}`}>
                    <div className="relative h-64 overflow-hidden">
                      <Image
                        src={property.images[0] || "/placeholder.svg"}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      {/* Verified Badge */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-green-600 text-white border-none shadow-lg">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t("verified.badge.verified")}
                        </Badge>
                      </div>
                      {/* Property Type Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                          {property.type === "PG" ? t("home.service.pgs") : property.type === "Flat" ? t("home.service.flats") : property.type}
                        </Badge>
                      </div>
                      {/* Price Badge */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            <span className="text-xl font-bold">{property.price.toLocaleString()}</span>
                            <span className="text-sm text-white/80">/{t("verified.price.perMonth")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-1">{property.title}</h3>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{typeof property.location === 'string' ? property.location : property.location?.address || property.address || "Location not specified"}</span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{property.rating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">
                            ({property.reviews} {property.reviews === 1 ? t("verified.review.singular") : t("verified.review.plural")})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {property.gender === "Male" ? t("common.gender.male") : property.gender === "Female" ? t("common.gender.female") : property.gender === "Co-ed" ? t("common.gender.coed") : property.gender}
                        </Badge>
                      </div>
                      {/* Amenities Preview */}
                      <div className="flex flex-wrap gap-1">
                        {property.amenities.slice(0, 3).map((amenity, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                        {property.amenities.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{property.amenities.length - 3} {t("verified.amenities.more")}
                          </Badge>
                        )}
                      </div>
                      {/* Verified Info */}
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-green-600" />
                        <span>{t("verified.verifiedOn")} {new Date(property.verifiedAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats Section */}
        {!loading && filteredProperties.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                  <span className="text-3xl font-bold">{filteredProperties.length}</span>
                </div>
                <p className="text-muted-foreground">{t("verified.stats.properties")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <span className="text-3xl font-bold">3x</span>
                </div>
                <p className="text-muted-foreground">{t("verified.stats.leads")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <span className="text-3xl font-bold">100%</span>
                </div>
                <p className="text-muted-foreground">{t("verified.stats.trusted")}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  )
}



