"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Star,
  Wifi,
  Bath,
  Users,
  Phone,
  Mail,
  Share,
  Clock,
  Bed,
  Home,
  Hospital,
  Bus,
  Train,
  Calendar,
  Check,
  X,
  ArrowLeft,
  Sparkles,
  Video,
  CheckCircle2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { motion } from "framer-motion"
import { PaymentModal } from "@/components/payment-modal"
import { ScheduleVisitModal } from "@/components/schedule-visit-modal"
import { LikeButton } from "@/components/like-button"
import { ShareModal } from "@/components/share-modal"
import { ReviewForm } from "@/components/review-form"
import { ReviewsList } from "@/components/reviews-list"
import { WhatsAppChatButton } from "@/components/whatsapp-chat-button"
import { SettlingInKits, type SettlingInKit } from "@/components/settling-in-kits"
import { MessLocationMapReadonly } from "@/components/mess-location-map-readonly"
import { useLanguage } from "@/providers/language-provider"

interface Property {
  _id: string
  title: string
  description: string
  location: string
  address: string
  rating: number
  reviews: number
  price: number
  deposit: number
  images: string[]
  amenities: string[]
  type: string
  gender: string
  verificationStatus?: "pending" | "verified" | "rejected"
  executiveVisit?: {
    checks?: {
      wifiTested?: boolean
      wifiSpeed?: string
      rawVideoCheck?: boolean
    }
  }
  distance?: {
    college: number
    hospital: number
    busStop: number
    metro: number
  }
  rules: string[]
  owner: {
    _id: string
    name: string
    phone: string
    email: string
    image?: string
  }
  roomTypes: {
    type: string
    price: number
    available: number
  }[]
  coordinates: {
    type: string
    coordinates: [number, number]
  }
}

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getDefaultCheckInDateTime = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  return formatDateTimeLocal(date)
}

const getDeliveryPromiseCopy = (t: (key: string) => string, checkInValue: string) => {
  const parsed = new Date(checkInValue)
  if (!checkInValue || Number.isNaN(parsed.getTime())) {
    return t("listing.kitDelivery.default")
  }
  const hours = (parsed.getTime() - Date.now()) / 3600000
  if (hours >= 4) return t("listing.kitDelivery.longWindow")
  if (hours >= 2) return t("listing.kitDelivery.tightWindow")
  return t("listing.kitDelivery.shortNotice")
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isScheduleVisitModalOpen, setIsScheduleVisitModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null)
  const [isCreatingBooking, setIsCreatingBooking] = useState(false)
  const [selectedKit, setSelectedKit] = useState<SettlingInKit | null>(null)
  const [checkInDateTime, setCheckInDateTime] = useState<string>(getDefaultCheckInDateTime())
  const [bookingTotal, setBookingTotal] = useState<number | null>(null)

  const handleBookNow = async () => {
    if (!user) {
      toast({
        title: t("common.loginRequired"),
        description: t("listing.detail.toast.loginToBook"),
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!property) return

    if (!checkInDateTime) {
      toast({
        title: t("listing.detail.toast.checkInRequired.title"),
        description: t("listing.detail.toast.checkInRequired.desc"),
        variant: "destructive",
      })
      return
    }

    const parsedCheckIn = new Date(checkInDateTime)
    if (Number.isNaN(parsedCheckIn.getTime())) {
      toast({
        title: t("listing.detail.toast.checkInInvalid.title"),
        description: t("listing.detail.toast.checkInInvalid.desc"),
        variant: "destructive",
      })
      return
    }

    setIsCreatingBooking(true)

    const checkOutDate = new Date(parsedCheckIn.getTime() + 86400000 * 30)
    const commissionRate = 7.5

    try {
      // Create a booking
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property: property._id,
          checkIn: parsedCheckIn.toISOString(),
          checkOut: checkOutDate.toISOString(),
          guests: 1,
          commissionRate,
          settlingInKit: selectedKit
            ? {
                packageId: selectedKit.packageId,
                packageName: selectedKit.packageName,
                price: selectedKit.price,
                items: selectedKit.items,
              }
            : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create booking")
      }

      const data = await response.json()
      setCurrentBookingId(data._id)
      setBookingTotal(data.totalAmount ?? null)
      setIsPaymentModalOpen(true)
    } catch (error) {
      console.error("Error creating booking:", error)
      toast({
        title: t("listing.detail.toast.bookingError.title"),
        description: error instanceof Error ? error.message : t("listing.detail.toast.bookingError.desc"),
        variant: "destructive",
      })
    } finally {
      setIsCreatingBooking(false)
    }
  }

  useEffect(() => {
    const fetchProperty = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/properties/${params.id}`)
        if (!res.ok) throw new Error("Failed to fetch property")
        const data = await res.json()
        // API returns { success: true, property: {...} }
        setProperty(data.property || data)
        
        // Track property view and create notification (silently, don't block on error)
        if (user?.id && params.id) {
          fetch(`/api/properties/${params.id}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }).catch((err) => {
            // Silently fail - notification tracking shouldn't block page load
            console.log("Failed to track property view:", err)
          })
        }
      } catch (error) {
        console.error("Error fetching property:", error)
        toast({
          title: t("common.error"),
          description: t("listing.detail.toast.loadFailed"),
          variant: "destructive",
        })
        router.push("/listings")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchProperty()
    }
  }, [params.id, router, toast, user?.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("listing.detail.loading")}</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t("listing.detail.notFoundTitle")}</h2>
          <p className="text-muted-foreground mb-4">{t("listing.detail.notFoundDesc")}</p>
          <Button onClick={() => router.push("/listings")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("listing.detail.backToListings")}
          </Button>
        </div>
      </div>
    )
  }

  const commissionRate = 7.5
  const baseRent = property.price || 0
  const estimatedCommission = Math.round((baseRent * commissionRate) / 100)
  const kitPrice = selectedKit?.price || 0
  const estimatedTotal = baseRent + estimatedCommission + kitPrice
  const deliveryPromiseCopy = getDeliveryPromiseCopy(t, checkInDateTime)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Hero Image Gallery */}
      <div className="relative h-[60vh] md:h-[70vh] w-full bg-gradient-to-b from-black/20 to-black/5">
        <div className="absolute inset-0">
          <Image
            src={(property.images && property.images.length > 0) ? (property.images[activeImageIndex] || property.images[0]) : "/placeholder.jpg"}
            alt={property.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Actions */}
        <div className="absolute top-6 right-0 z-10 px-4 sm:px-6 flex items-center gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg flex-shrink-0"
            onClick={() => setIsShareModalOpen(true)}
          >
            <Share className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm shadow-lg rounded-full px-2 py-1">
            <LikeButton 
              itemType="property" 
              itemId={property._id} 
              size="md"
              className="p-0 bg-transparent shadow-none backdrop-blur-none"
            />
          </div>
        </div>

        {/* Property Badges */}
        <div className="absolute top-6 left-4 sm:left-6 z-10 flex gap-2 flex-wrap max-w-[calc(100%-8rem)]">
          {property.verificationStatus === "verified" && (
            <div className="relative flex-shrink-0">
              <Image
                src="/sechome_verification.png"
                alt="Verified by Second Home"
                width={120}
                height={120}
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
          )}
          <Badge className="bg-gradient-to-r from-primary to-orange-600 text-white px-4 py-2 text-sm font-semibold shadow-lg flex-shrink-0">
            {property.type}
          </Badge>
        </div>

        {/* Image Thumbnails */}
        {property.images && property.images.length > 1 && (
          <div className="absolute bottom-6 left-0 right-0 z-10 px-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {property.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === activeImageIndex
                      ? "border-white shadow-lg scale-110"
                      : "border-white/50 hover:border-white"
                  }`}
                >
                  <Image src={img} alt={`View ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-12 relative z-20 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">{property.title}</h1>
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="text-base">
                      {typeof property.location === "string"
                        ? property.location
                        : property.location?.address || property.address || t("listings.property.locationNotSpecified")}
                    </span>
                  </div>
                  {/* Verification Details */}
                  {property.verificationStatus === "verified" && property.executiveVisit?.checks && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">{t("listing.detail.verifiedBy")}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {property.executiveVisit.checks.wifiTested && property.executiveVisit.checks.wifiSpeed && (
                          <div className="flex items-center gap-1">
                            <Wifi className="h-4 w-4 text-green-600" />
                            <span className="text-green-700">
                              {t("listing.detail.wifiTested")} {property.executiveVisit.checks.wifiSpeed}
                            </span>
                          </div>
                        )}
                        {property.executiveVisit.checks.rawVideoCheck && (
                          <div className="flex items-center gap-1">
                            <Video className="h-4 w-4 text-green-600" />
                            <span className="text-green-700">{t("listing.detail.rawVideoChecked")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-gray-900">{property.rating || 0}</span>
                      <span className="text-gray-500 text-sm">({property.reviews || 0} {t("common.reviews")})</span>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {property.gender === "Male"
                        ? t("common.gender.male")
                        : property.gender === "Female"
                          ? t("common.gender.female")
                          : property.gender === "Co-ed"
                            ? t("common.gender.coed")
                            : property.gender}
                    </Badge>
                  </div>
                </div>
                </div>

              <div className="border-t pt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">{t("listing.detail.about")}</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            </motion.div>

            {/* Amenities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("listing.detail.amenities")}</h2>
              {property.amenities && property.amenities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {property.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-gray-800 font-medium">{amenity}</span>
                    </div>
                  ))}
                        </div>
              ) : (
                <p className="text-gray-500">{t("listing.detail.noAmenities")}</p>
              )}
            </motion.div>

            {/* Room Types */}
            {property.roomTypes && property.roomTypes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100"
              >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("listing.detail.roomOptions")}</h2>
                <div className="space-y-4">
                  {property.roomTypes.map((room, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
                          <Bed className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{room.type}</h3>
                          <p className="text-sm text-gray-600">
                            {room.available} {t("listing.detail.roomsAvailable")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">₹{room.price}</p>
                        <p className="text-sm text-gray-500">/{t("common.perMonth")}</p>
                      </div>
                    </div>
                  ))}
                      </div>
              </motion.div>
            )}

            {/* Rules */}
            {property.rules && property.rules.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100"
              >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("listing.detail.houseRules")}</h2>
                <div className="space-y-3">
                  {property.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-gray-700">{rule}</p>
                    </div>
                  ))}
                      </div>
              </motion.div>
            )}

            {/* Location Map */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("listing.detail.location")}</h2>
              <div className="space-y-4">
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-sm text-muted-foreground font-medium">{t("common.address")}</p>
                  <p className="text-base text-gray-900">
                    {typeof property.location === "string"
                      ? property.location
                      : property.location?.address || property.address || t("common.notProvided")}
                  </p>
                </div>

                {(() => {
                  const addressText =
                    (typeof property.location === "string" ? property.location : property.location?.address || property.address || "").trim()

                  let normalizedCoordinates: { type?: string; coordinates?: [number, number] } | null = null
                  if (property.coordinates) {
                    if (Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
                      normalizedCoordinates = { type: "Point", coordinates: property.coordinates as any }
                    } else if (
                      (property.coordinates as any).coordinates &&
                      Array.isArray((property.coordinates as any).coordinates) &&
                      (property.coordinates as any).coordinates.length >= 2
                    ) {
                      normalizedCoordinates = property.coordinates as any
                    }
                  }

                  return addressText ? (
                    <MessLocationMapReadonly address={addressText} coordinates={normalizedCoordinates} heightClassName="h-[420px]" />
                  ) : (
                    <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center text-gray-500">
                      <MapPin className="w-8 h-8 mr-2" />
                      <span className="text-sm">{t("listing.detail.mapNotAvailable")}</span>
                    </div>
                  )
                })()}
              </div>
            </motion.div>

            {/* Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("reviews.title")}</h2>
              <ReviewsList itemType="property" itemId={property._id} onRatingChange={(r) => {}} />
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t("reviews.writeTitle")}</h3>
                <ReviewForm itemType="property" itemId={property._id} onSuccess={() => {}} />
                  </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-20 lg:top-24 space-y-6"
            >
              {/* Price Card */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="text-center mb-6">
                  <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 mb-2">
                    <span className="text-sm font-semibold text-orange-700">{t("listing.detail.startingFrom")}</span>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">₹{property.price}</div>
                  <p className="text-gray-500">{t("listing.detail.perMonth")}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    + ₹{property.deposit} {t("listing.detail.securityDeposit")}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    onClick={handleBookNow}
                    disabled={isCreatingBooking}
                  >
                    {isCreatingBooking ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                        />
                          {t("listing.detail.creatingBooking")}
                      </>
                    ) : (
                      <>
                        <Calendar className="mr-2 h-5 w-5" />
                          {t("listing.detail.bookNow")}
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setIsScheduleVisitModalOpen(true)}
                    className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    {t("listing.detail.scheduleVisitWhatsapp")}
                  </Button>
                  </div>

                {property.owner && (
                  <div className="border-t pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">{t("listing.detail.contactOwner")}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold">
                          {property.owner.name?.charAt(0) || "O"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{property.owner.name || t("listing.detail.propertyOwner")}</p>
                          <p className="text-sm text-gray-500">{t("listing.detail.propertyOwner")}</p>
                        </div>
                      </div>

                      {property.owner.phone && (
                        <>
                          <WhatsAppChatButton
                            propertyId={property._id}
                            propertyTitle={property.title}
                            ownerPhone={property.owner.phone}
                            ownerName={property.owner.name}
                            variant="outline"
                            size="default"
                            label={t("listing.detail.chatOnWhatsapp")}
                            className="w-full"
                          />
                          <Button variant="outline" className="w-full justify-start" asChild>
                            <a href={`tel:${property.owner.phone}`}>
                              <Phone className="mr-2 h-4 w-4" />
                              {property.owner.phone}
                            </a>
                          </Button>
                        </>
                      )}
                      
                      {property.owner.email && (
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <a href={`mailto:${property.owner.email}`}>
                            <Mail className="mr-2 h-4 w-4" />
                            {t("listing.detail.contactViaEmail")}
                          </a>
                                    </Button>
                      )}
                          </div>
                        </div>
                )}
              </div>

              {/* Day Zero Settling-In Kit */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{t("listing.detail.dayZeroKitTitle")}</h3>
                    <p className="text-sm text-gray-600">{deliveryPromiseCopy}</p>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                    {t("listing.detail.day0")}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-800">{t("listing.detail.checkInDateTime")}</label>
                  <Input
                    type="datetime-local"
                    value={checkInDateTime}
                    onChange={(e) => setCheckInDateTime(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">{deliveryPromiseCopy}</p>
                </div>

                <SettlingInKits
                  selectedKit={selectedKit}
                  onKitSelect={setSelectedKit}
                  orientation="stacked"
                />

                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t("listing.detail.firstMonthRent")}</span>
                    <span className="font-semibold">₹{baseRent.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {t("listing.detail.commission")} ({commissionRate}%)
                    </span>
                    <span className="font-semibold">₹{estimatedCommission.toLocaleString()}</span>
                  </div>
                  {selectedKit && (
                    <div className="flex items-center justify-between text-sm">
                      <span>{selectedKit.packageName}</span>
                      <span className="font-semibold">₹{kitPrice.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{t("listing.detail.securityDepositPaidSeparately")}</span>
                    <span>
                      ₹
                      {typeof property.deposit === "number"
                        ? property.deposit.toLocaleString()
                        : property.deposit || "-"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between font-semibold">
                    <span>{t("listing.detail.estimatedTotalExclDeposit")}</span>
                    <span className="text-primary font-semibold">₹{estimatedTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              {property.distance && (property.distance.college > 0 || property.distance.hospital > 0 || property.distance.busStop > 0 || property.distance.metro > 0) && (
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4">{t("listing.detail.nearby")}</h3>
                  <div className="space-y-3">
                    {property.distance.college > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-primary" />
                          <span className="text-sm text-gray-700">{t("listing.detail.nearby.college")}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{property.distance.college} km</span>
                      </div>
                    )}
                    {property.distance.hospital > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-2">
                          <Hospital className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">{t("listing.detail.nearby.hospital")}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{property.distance.hospital} km</span>
                      </div>
                    )}
                    {property.distance.busStop > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">{t("listing.detail.nearby.busStop")}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{property.distance.busStop} km</span>
                      </div>
                    )}
                    {property.distance.metro > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                        <div className="flex items-center gap-2">
                          <Train className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-700">{t("listing.detail.nearby.metro")}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{property.distance.metro} km</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
                </div>
              </div>
            </div>

      {/* Modals */}
      {property && (
        <>
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            bookingId={currentBookingId || ""}
            amount={bookingTotal ?? estimatedTotal}
            propertyName={property.title}
            propertyOwnerId={property.owner?._id || property.owner}
          />
          <ScheduleVisitModal
            isOpen={isScheduleVisitModalOpen}
            onClose={() => setIsScheduleVisitModalOpen(false)}
            propertyId={property._id}
            propertyName={property.title}
          />
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            url={typeof window !== "undefined" ? window.location.href : ""}
            title={property.title}
          />
        </>
      )}
    </div>
  )
}

