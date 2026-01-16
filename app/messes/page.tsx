"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MapPin, Star, Clock, IndianRupee, Truck, Plus, Loader2, 
  UtensilsCrossed, Search, Filter, Heart
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/providers/language-provider"
// Map view is shown on the single mess detail page.

export default function MessesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()
  
  const [messes, setMesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchMesses()
  }, [])

  const fetchMesses = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/messes")
      if (!res.ok) throw new Error("Failed to fetch messes")
      
      const data = await res.json()
      // Only show approved messes
      const approvedMesses = (data.messes || []).filter((m: any) => m.isApproved && !m.isRejected)
      setMesses(approvedMesses)
    } catch (error) {
      console.error("❌ Error fetching messes:", error)
      toast({
        title: t("common.error"),
        description: t("messes.toast.loadFailed"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredMesses = messes.filter(mess => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      mess.name?.toLowerCase().includes(query) ||
      mess.location?.toLowerCase().includes(query) ||
      mess.city?.toLowerCase().includes(query) ||
      mess.cuisineTypes?.some((c: string) => c.toLowerCase().includes(query))
    )
  })

  const handleListYourMess = () => {
    if (!session) {
      toast({
        title: t("common.loginRequired"),
        description: t("messes.toast.loginToList"),
        variant: "destructive",
      })
      router.push("/login")
      return
    }
    router.push("/list-mess")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative text-white overflow-hidden min-h-[500px] md:min-h-[600px]">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/mess_secondhome.png)',
            backgroundPosition: 'center center',
            backgroundSize: 'cover',
          }}
        />
        {/* Gradient Overlay for better text readability and blend - careful opacity */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 via-orange-500/25 to-red-600/35" />
        {/* Additional subtle overlay for depth */}
        <div className="absolute inset-0 bg-black/10" />
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating circles */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" />
          <div className="absolute bottom-32 right-20 w-40 h-40 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl" />
        </div>
        
        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto text-center mb-10"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 mb-6"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-sm font-medium">{t("messes.hero.badge")}</span>
            </motion.div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight drop-shadow-2xl">
              <span className="bg-gradient-to-r from-white via-orange-50 to-white bg-clip-text text-transparent">
                {t("messes.hero.title")}
              </span>
            </h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl text-white/95 mb-4 font-medium drop-shadow-lg"
            >
              {filteredMesses.length}{" "}
              {filteredMesses.length === 1 ? t("messes.count.mess") : t("messes.count.messes")}{" "}
              {t("messes.count.available")}
            </motion.p>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-base md:text-lg text-white/80 mb-10 max-w-2xl mx-auto"
            >
              {t("messes.hero.subtitle")}
            </motion.p>

            {/* Enhanced Search Bar with Glassmorphism */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-3 flex gap-3 border border-white/20 max-w-3xl mx-auto"
            >
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search className="w-5 h-5 text-orange-500" />
                <Input
                  placeholder={t("messes.search.placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-none focus-visible:ring-0 text-gray-900 placeholder:text-gray-500 text-base"
                />
              </div>
              <Button 
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-8 py-6 text-base font-semibold shadow-lg"
              >
                {t("common.search")}
              </Button>
            </motion.div>
          </motion.div>

          {/* List Your Mess Button */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center mb-8"
          >
            <Button
              size="lg"
              onClick={handleListYourMess}
              className="bg-white/95 backdrop-blur-md text-orange-600 hover:bg-white shadow-xl border-2 border-white/50 px-8 py-6 text-base font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t("messes.action.listYourMess")}
            </Button>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl font-bold mb-1">{messes.length}</div>
              <div className="text-sm text-white/80">{t("messes.stats.total")}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl font-bold mb-1">{messes.filter(m => m.homeDeliveryAvailable).length}</div>
              <div className="text-sm text-white/80">{t("messes.stats.delivery")}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl font-bold mb-1">{messes.filter(m => m.rating >= 4).length}</div>
              <div className="text-sm text-white/80">{t("messes.stats.highlyRated")}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl font-bold mb-1">{new Set(messes.map(m => m.city).filter(Boolean)).size}</div>
              <div className="text-sm text-white/80">{t("messes.stats.cities")}</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("messes.section.title")}</h2>
            <p className="text-gray-600 mt-1">{t("messes.section.subtitle")}</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full h-48" />
                <CardContent className="p-5">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredMesses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-12 text-center max-w-2xl mx-auto"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <UtensilsCrossed className="w-12 h-12 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {searchQuery ? t("messes.empty.searchTitle") : t("messes.empty.noDataTitle")}
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {searchQuery 
                ? t("messes.empty.searchHint")
                : t("messes.empty.noDataHint")}
            </p>
            {searchQuery ? (
              <Button onClick={() => setSearchQuery("")} variant="outline">
                {t("common.clearSearch")}
              </Button>
            ) : (
              <Button onClick={handleListYourMess} className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                <Plus className="w-4 h-4 mr-2" />
                {t("messes.action.listYourMess")}
              </Button>
            )}
          </motion.div>
        )}

        {/* Mess Cards */}
        {!loading && filteredMesses.length > 0 && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {filteredMesses.map((mess, index) => (
                <MessCard key={mess._id} mess={mess} index={index} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

// Mess Card Component
function MessCard({ mess, index }: { mess: any; index: number }) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const { t } = useLanguage()

  const formatPrice = (price: number) => {
    if (price >= 100000) return `${(price / 100000).toFixed(1)}L`
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`
    return price.toString()
  }

  const getMessImage = () => {
    if (mess.images && mess.images.length > 0) {
      return mess.images[0]
    }
    return "/placeholder.jpg"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="group overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer bg-white"
        onClick={() => router.push(`/messes/${encodeURIComponent(String(mess._id))}`)}
      >
        <div className="relative h-48 overflow-hidden">
          <Image
            src={imageError ? "/placeholder.jpg" : getMessImage()}
            alt={mess.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <Badge className="bg-orange-500/90 text-white backdrop-blur">
              {t("messes.card.badge")}
            </Badge>
            {mess.homeDeliveryAvailable && (
              <Badge className="bg-green-500/90 text-white backdrop-blur flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {t("messes.card.delivery")}
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="absolute bottom-4 right-4">
            <div className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
              ₹{formatPrice(mess.monthlyPrice)}/mo
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-orange-500 transition-colors">
            {mess.name}
          </h3>

          {/* Location */}
          <div className="flex items-center text-gray-600 mb-4">
            <MapPin className="w-4 h-4 mr-2 text-orange-500" />
            <span className="text-sm line-clamp-1">
              {mess.location || mess.city || t("messes.card.locationNotSpecified")}
            </span>
          </div>

          {/* Rating */}
          {mess.rating > 0 && (
            <div className="flex items-center mb-4">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
              <span className="font-semibold text-gray-900">{mess.rating}</span>
              <span className="text-gray-500 text-sm ml-2">
                ({mess.reviews || 0} {t("common.reviews")})
              </span>
            </div>
          )}

          {/* Meal Times */}
          {mess.openingHours && (
            <div className="mb-4 space-y-1">
              {mess.openingHours.breakfast && (
                <div className="flex items-center text-xs text-gray-600">
                  <Clock className="w-3 h-3 mr-2" />
                  <span>
                    {t("common.meal.breakfast")}: {mess.openingHours.breakfast}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Diet Types */}
          {mess.dietTypes && mess.dietTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {mess.dietTypes.slice(0, 3).map((diet: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {diet}
                </Badge>
              ))}
            </div>
          )}

          {/* Daily Price */}
          {mess.dailyPrice && (
            <div className="text-sm text-blue-600 font-medium">
              ₹{mess.dailyPrice}/day
            </div>
          )}

          {/* Delivery / Packaging */}
          {(mess.homeDeliveryAvailable || mess.packagingAvailable) && (
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              {mess.homeDeliveryAvailable && (
                <div className="flex items-center gap-2">
                  <Truck className="w-3 h-3" />
                  <span>
                    {t("messes.card.deliveryLabel")}: {t("messes.card.upTo")} {mess.deliveryRadius || 0}km • ₹{mess.deliveryCharges || 0}
                  </span>
                </div>
              )}
              {mess.packagingAvailable && (
                <div>
                  {t("messes.card.packaging")}: ₹{mess.packagingPrice || 0}
                </div>
              )}
            </div>
          )}

          {/* View Details Button */}
          <Button 
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/messes/${encodeURIComponent(String(mess._id))}`)
            }}
          >
            {t("common.viewDetails")}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
