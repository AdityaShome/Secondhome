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
import { WhatsAppChatButton, WhatsAppScheduleButton } from "@/components/whatsapp-chat-button"
import { SettlingInKits, type SettlingInKit } from "@/components/settling-in-kits"

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

const getDeliveryPromiseCopy = (checkInValue: string) => {
  const parsed = new Date(checkInValue)
  if (!checkInValue || Number.isNaN(parsed.getTime())) {
    return "Tell us when you arrive so we can time delivery ~2 hours before check-in."
  }
  const hours = (parsed.getTime() - Date.now()) / 3600000
  if (hours >= 4) return "We'll place the kit in your room ~2 hours before you arrive."
  if (hours >= 2) return "Tight window: we aim for before arrival; might land right as you arrive."
  return "Short notice: dispatching immediately to align with your arrival window."
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

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
        title: "Login Required",
        description: "Please login to book this property",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!property) return

    if (!checkInDateTime) {
      toast({
        title: "Choose your check-in time",
        description: "We need your arrival time to schedule the Day Zero kit.",
        variant: "destructive",
      })
      return
    }

    const parsedCheckIn = new Date(checkInDateTime)
    if (Number.isNaN(parsedCheckIn.getTime())) {
      toast({
        title: "Invalid check-in time",
        description: "Please pick a valid date and time for check-in.",
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
        title: "Booking Error",
        description: error instanceof Error ? error.message : "Failed to create booking. Please try again.",
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
      } catch (error) {
        console.error("Error fetching property:", error)
        toast({
          title: "Error",
          description: "Failed to load property details",
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
  }, [params.id, router, toast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
          <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/listings")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Listings
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
  const deliveryPromiseCopy = getDeliveryPromiseCopy(checkInDateTime)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
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

        {/* Back Button & Actions */}
        <div className="absolute top-6 left-0 right-0 z-10 px-6 flex justify-between items-center">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
              className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <Share className="h-5 w-5" />
            </Button>
            <LikeButton 
              itemType="property" 
              itemId={property._id} 
              size="md"
              className="bg-white/90 backdrop-blur-sm shadow-lg rounded-full"
            />
                </div>
              </div>

        {/* Property Badges */}
        <div className="absolute top-6 left-6 z-10 flex gap-2 flex-wrap">
          {property.verificationStatus === "verified" && (
            <div className="relative">
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
          <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 text-sm font-semibold shadow-lg">
            <Sparkles className="w-4 h-4 mr-1" />
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
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{property.title}</h1>
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <span className="text-base">{typeof property.location === 'string' ? property.location : property.location?.address || property.address || "Location not specified"}</span>
                  </div>
                  {/* Verification Details */}
                  {property.verificationStatus === "verified" && property.executiveVisit?.checks && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">Verified by Second Home</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {property.executiveVisit.checks.wifiTested && property.executiveVisit.checks.wifiSpeed && (
                          <div className="flex items-center gap-1">
                            <Wifi className="h-4 w-4 text-green-600" />
                            <span className="text-green-700">WiFi Tested: {property.executiveVisit.checks.wifiSpeed}</span>
                          </div>
                        )}
                        {property.executiveVisit.checks.rawVideoCheck && (
                          <div className="flex items-center gap-1">
                            <Video className="h-4 w-4 text-green-600" />
                            <span className="text-green-700">Raw Video Checked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-gray-900">{property.rating || 0}</span>
                      <span className="text-gray-500 text-sm">({property.reviews || 0} reviews)</span>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {property.gender}
                    </Badge>
                      </div>
                  </div>
                </div>

              <div className="border-t pt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">About this property</h2>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenities</h2>
              {property.amenities && property.amenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                        </div>
                      <span className="text-gray-800 font-medium">{amenity}</span>
                            </div>
                          ))}
                        </div>
              ) : (
                <p className="text-gray-500">No amenities listed</p>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Room Options</h2>
                <div className="space-y-4">
                  {property.roomTypes.map((room, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                          <Bed className="w-6 h-6 text-white" />
                      </div>
                            <div>
                          <h3 className="font-bold text-gray-900">{room.type}</h3>
                          <p className="text-sm text-gray-600">{room.available} rooms available</p>
                              </div>
                            </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">₹{room.price}</p>
                        <p className="text-sm text-gray-500">/month</p>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">House Rules</h2>
                <div className="space-y-3">
                  {property.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-purple-600" />
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Location</h2>
              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                {(() => {
                  // Handle both old nested structure and new flat array structure
                  let coords: [number, number] | null = null
                  
                  if (property.coordinates) {
                    if (Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
                      // New flat structure: [lng, lat]
                      coords = property.coordinates as [number, number]
                    } else if (property.coordinates.coordinates && Array.isArray(property.coordinates.coordinates) && property.coordinates.coordinates.length >= 2) {
                      // Old nested structure: {type: 'Point', coordinates: [lng, lat]}
                      coords = property.coordinates.coordinates as [number, number]
                    }
                  }
                  
                  return coords && coords[0] !== 0 && coords[1] !== 0 ? (
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords[0] - 0.01},${coords[1] - 0.01},${coords[0] + 0.01},${coords[1] + 0.01}&layer=mapnik&marker=${coords[1]},${coords[0]}`}
                      className="border-0"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <MapPin className="w-8 h-8 mr-2" />
                      <span className="text-sm">Map location not available - coordinates not set</span>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>
              <ReviewsList itemType="property" itemId={property._id} onRatingChange={(r) => {}} />
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Write a Review</h3>
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
              className="sticky top-24 space-y-6"
            >
              {/* Price Card */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="text-center mb-6">
                  <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 mb-2">
                    <span className="text-sm font-semibold text-purple-700">Starting from</span>
                </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">₹{property.price}</div>
                  <p className="text-gray-500">per month</p>
                  <p className="text-sm text-gray-500 mt-2">+ ₹{property.deposit} security deposit</p>
              </div>

                <div className="space-y-3 mb-6">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
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
                        Creating Booking...
                      </>
                    ) : (
                      <>
                        <Calendar className="mr-2 h-5 w-5" />
                        Book Now
                      </>
                    )}
                  </Button>
                  
                  <WhatsAppScheduleButton
                    propertyId={property._id}
                    propertyTitle={property.title}
                    ownerPhone={property.owner?.phone}
                    ownerName={property.owner?.name}
                  />
                  </div>

                {property.owner && (
                  <div className="border-t pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">Contact Owner</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
                          {property.owner.name?.charAt(0) || "O"}
                    </div>
                    <div>
                          <p className="font-semibold text-gray-900">{property.owner.name || "Property Owner"}</p>
                          <p className="text-sm text-gray-500">Property Owner</p>
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
                            label="Chat on WhatsApp"
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
                            Contact via Email
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
                    <h3 className="font-bold text-gray-900">Day Zero Settling-In Kit</h3>
                    <p className="text-sm text-gray-600">Delivered ~2h before check-in</p>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                    Day 0
                  </Badge>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-800">Check-in date & time</label>
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
                    <span>First month rent</span>
                    <span className="font-semibold">₹{baseRent.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Commission ({commissionRate}%)</span>
                    <span className="font-semibold">₹{estimatedCommission.toLocaleString()}</span>
                  </div>
                  {selectedKit && (
                    <div className="flex items-center justify-between text-sm">
                      <span>{selectedKit.packageName}</span>
                      <span className="font-semibold">₹{kitPrice.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Security deposit (paid separately)</span>
                    <span>
                      ₹
                      {typeof property.deposit === "number"
                        ? property.deposit.toLocaleString()
                        : property.deposit || "-"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between font-semibold">
                    <span>Estimated total (excl. deposit)</span>
                    <span className="text-purple-700">₹{estimatedTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              {property.distance && (property.distance.college > 0 || property.distance.hospital > 0 || property.distance.busStop > 0 || property.distance.metro > 0) && (
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4">Nearby</h3>
                  <div className="space-y-3">
                    {property.distance.college > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-gray-700">College</span>
                        </div>
                        <span className="font-semibold text-gray-900">{property.distance.college} km</span>
                      </div>
                    )}
                    {property.distance.hospital > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-2">
                          <Hospital className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Hospital</span>
                        </div>
                        <span className="font-semibold text-gray-900">{property.distance.hospital} km</span>
                      </div>
                    )}
                    {property.distance.busStop > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">Bus Stop</span>
                        </div>
                        <span className="font-semibold text-gray-900">{property.distance.busStop} km</span>
                      </div>
                    )}
                    {property.distance.metro > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                        <div className="flex items-center gap-2">
                          <Train className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-700">Metro</span>
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

