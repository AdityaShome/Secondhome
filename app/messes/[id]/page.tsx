"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { motion } from "framer-motion"
import { MapPin, Star, Clock, Utensils, Share, Phone, Mail, Map } from "lucide-react"
import { LikeButton } from "@/components/like-button"
import { ShareModal } from "@/components/share-modal"
import { ReviewForm } from "@/components/review-form"
import { ReviewsList } from "@/components/reviews-list"
import { MessLocationMapReadonly } from "@/components/mess-location-map-readonly"
import { useLanguage } from "@/providers/language-provider"

interface Mess {
  _id: string
  name: string
  description: string
  address: string
  location: string
  coordinates?: {
    type?: string
    coordinates?: [number, number]
  }
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  monthlyPrice: number
  dailyPrice: number
  packagingAvailable?: boolean
  packagingPrice?: number
  images: string[]
  menu: {
    day: string
    breakfast: string
    lunch: string
    dinner: string
  }[]
  openingHours: {
    breakfast: string
    lunch: string
    dinner: string
  }
  owner: {
    _id: string
    name: string
    phone: string
    email: string
    image?: string
  }
  rating: number
  reviews: number
}

export default function MessDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()

  const messId = Array.isArray((params as any)?.id) ? (params as any).id[0] : (params as any)?.id

  const [mess, setMess] = useState<Mess | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("location")

  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false)
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<string>(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  })
  const [subscriptionPhone, setSubscriptionPhone] = useState("")
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false)

  const imageCount = mess?.images?.length ?? 0

  useEffect(() => {
    if (imageCount < 2) return

    const intervalId = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % imageCount)
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [imageCount])

  useEffect(() => {
    if (activeImageIndex >= imageCount && imageCount > 0) {
      setActiveImageIndex(0)
    }
  }, [activeImageIndex, imageCount])

  useEffect(() => {
    const fetchMess = async () => {
      if (!messId || typeof messId !== "string") {
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/messes/${encodeURIComponent(messId)}`)

        if (!response.ok) {
          if (response.status === 400) {
            toast({
              title: t("mess.detail.toast.invalidLink.title"),
              description: t("mess.detail.toast.invalidLink.desc"),
              variant: "destructive",
            })
            router.push("/messes")
            return
          }

          if (response.status === 401 || response.status === 403) {
            toast({
              title: t("mess.detail.toast.notAuthorized.title"),
              description: t("mess.detail.toast.notAuthorized.desc"),
              variant: "destructive",
            })
            router.push("/messes")
            return
          }

          if (response.status === 404) {
            toast({
              title: t("mess.detail.toast.notFound.title"),
              description: t("mess.detail.toast.notFound.desc"),
              variant: "destructive",
            })
            router.push("/messes")
            return
          }
          throw new Error("Failed to fetch mess details")
        }

        const data = await response.json()
        setMess(data)

        const hasMenu = Array.isArray(data?.menu) && data.menu.some((day: any) => day && (day.breakfast || day.lunch || day.dinner))
        setActiveTab(hasMenu ? "menu" : "location")
      } catch (error) {
        console.error("Error fetching mess details:", error)
        toast({
          title: t("common.error"),
          description: t("mess.detail.toast.fetchFailed"),
          variant: "destructive",
        })

        // No fallback - only show real data
        setMess(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMess()
  }, [messId, router, toast])

  const handleRatingChange = (rating: number, count: number) => {
    if (mess) {
      setMess({
        ...mess,
        rating,
        reviews: count,
      })
    }
  }

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.href
    }
    return `https://secondhome.com/messes/${messId}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("mess.detail.loading")}</p>
        </div>
      </div>
    )
  }

  if (!mess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-bold mb-2">{t("mess.detail.notFoundTitle")}</h2>
          <p className="text-muted-foreground mb-6">{t("mess.detail.notFoundDesc")}</p>
          <Button asChild>
            <Link href="/messes">{t("mess.detail.browseOthers")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  const addressText = (mess.address || "").trim() || (mess.location || "").trim()
  const monthlyPrice = Number(mess.monthlyPrice)
  const dailyPrice = Number(mess.dailyPrice)
  const packagingPrice = Number(mess.packagingPrice)

  const hasMonthlyPrice = Number.isFinite(monthlyPrice) && monthlyPrice > 0
  const hasDailyPrice = Number.isFinite(dailyPrice) && dailyPrice > 0
  const hasPackagingCharges = Boolean(mess.packagingAvailable) && Number.isFinite(packagingPrice) && packagingPrice > 0

  const mealTimings = [
    { label: t("common.meal.breakfast"), value: mess.openingHours?.breakfast },
    { label: t("common.meal.lunch"), value: mess.openingHours?.lunch },
    { label: t("common.meal.dinner"), value: mess.openingHours?.dinner },
  ].filter((t) => Boolean((t.value || "").trim()))
  const hasMealTimings = mealTimings.length > 0

  const hasMenu = Array.isArray(mess.menu) && mess.menu.some((day) => day && (day.breakfast || day.lunch || day.dinner))
  const hasPhotos = Array.isArray(mess.images) && mess.images.length > 0

  const contactName = (mess.contactName || "").trim() || mess.owner?.name
  const contactPhone = (mess.contactPhone || "").trim() || mess.owner?.phone
  const contactEmail = (mess.contactEmail || "").trim() || mess.owner?.email

  const handleSubscribeMonthly = async () => {
    if (!user) {
      toast({
        title: t("common.loginRequired"),
        description: t("mess.detail.toast.loginToSubscribe"),
        variant: "destructive",
      })
      router.push(`/login?redirect=/messes/${encodeURIComponent(String(messId || ""))}`)
      return
    }

    if (!hasMonthlyPrice) {
      toast({
        title: t("common.notAvailable"),
        description: t("mess.detail.toast.subscriptionNotAvailable"),
        variant: "destructive",
      })
      return
    }

    setIsSubscribeOpen(true)
  }

  const confirmSubscription = async () => {
    if (!mess?._id) return
    if (!subscriptionStartDate) {
      toast({
        title: t("mess.detail.toast.startDateRequired.title"),
        description: t("mess.detail.toast.startDateRequired.desc"),
        variant: "destructive",
      })
      return
    }

    const normalizedPhone = (subscriptionPhone || "").replace(/\D/g, "")
    if (normalizedPhone.length !== 10) {
      toast({
        title: t("mess.detail.toast.phoneRequired.title"),
        description: t("mess.detail.toast.phoneRequired.desc"),
        variant: "destructive",
      })
      return
    }

    setIsCreatingSubscription(true)
    try {
      const res = await fetch("/api/mess-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messId: mess._id,
          startDate: subscriptionStartDate,
          phone: normalizedPhone,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create subscription")
      }

      toast({
        title: t("mess.detail.toast.subscriptionCreated.title"),
        description: t("mess.detail.toast.subscriptionCreated.desc"),
      })

      setIsSubscribeOpen(false)
    } catch (e) {
      toast({
        title: t("mess.detail.toast.subscribeFailed.title"),
        description: e instanceof Error ? e.message : t("common.somethingWentWrong"),
        variant: "destructive",
      })
    } finally {
      setIsCreatingSubscription(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-2 items-start mb-6">
          <Link href="/messes" className="text-sm text-muted-foreground hover:text-primary">
            {t("nav.messes")}
          </Link>
          <span className="hidden md:inline text-muted-foreground">/</span>
          <span className="text-sm">{mess.name}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <Badge className="absolute top-4 left-4 z-10">Mess</Badge>
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <LikeButton itemType="mess" itemId={mess._id} appearance="overlay" />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full bg-white/80 backdrop-blur-sm"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <Share className="h-5 w-5" />
                    <span className="sr-only">Share</span>
                  </Button>
                </div>
                <Image
                  src={mess.images[activeImageIndex] || "/placeholder.svg"}
                  alt={mess.name}
                  width={800}
                  height={500}
                  className="w-full h-[300px] md:h-[400px] object-cover"
                  priority
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {mess.images.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === activeImageIndex ? "bg-white" : "bg-white/50"}`}
                      onClick={() => setActiveImageIndex(index)}
                    />
                  ))}
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h1 className="text-2xl md:text-3xl font-bold">{mess.name}</h1>
                  <div className="flex items-center">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="font-medium">{mess.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground ml-1">
                      ({mess.reviews} {t("common.reviews")})
                    </span>
                  </div>
                </div>

                <div className="flex items-center mt-2 text-muted-foreground">
                  <MapPin className="w-5 h-5 mr-1 flex-shrink-0" />
                  {addressText ? <span className="text-sm">{addressText}</span> : null}
                </div>

                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-3">{t("common.description")}</h2>
                  <p className="text-muted-foreground">{mess.description}</p>
                </div>

                {hasMealTimings && (
                  <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4">{t("mess.detail.mealTimings")}</h2>
                    <div className={`grid gap-4 ${mealTimings.length >= 3 ? "md:grid-cols-3" : mealTimings.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                      {mealTimings.map((timing) => (
                        <Card key={timing.label}>
                          <CardContent className="p-4">
                            <div className="flex items-center mb-2">
                              <Clock className="w-5 h-5 mr-2 text-primary" />
                              <h3 className="font-medium">{timing.label}</h3>
                            </div>
                            <p className="text-muted-foreground">{timing.value}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{t("mess.detail.pricing.title")}</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {hasMonthlyPrice && (
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-medium mb-2">{t("mess.detail.pricing.monthlyTitle")}</h3>
                          <div className="flex items-end">
                            <span className="text-2xl font-bold">₹{monthlyPrice}</span>
                            <span className="text-muted-foreground ml-1">/{t("common.perMonth")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {t("mess.detail.pricing.monthlySubtitle")}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {hasDailyPrice && (
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-medium mb-2">{t("mess.detail.pricing.dailyTitle")}</h3>
                          <div className="flex items-end">
                            <span className="text-2xl font-bold">₹{dailyPrice}</span>
                            <span className="text-muted-foreground ml-1">/{t("common.perDay")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{t("mess.detail.pricing.payAsYouGo")}</p>
                        </CardContent>
                      </Card>
                    )}

                    {hasPackagingCharges && (
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-medium mb-2">{t("mess.detail.packaging.title")}</h3>
                          <div className="flex items-end">
                            <span className="text-2xl font-bold">₹{packagingPrice}</span>
                            <span className="text-muted-foreground ml-1">/{t("common.perOrder")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{t("mess.detail.packaging.subtitle")}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="mt-8 bg-white rounded-lg shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full border-b rounded-none p-0">
                  {hasMenu && (
                    <TabsTrigger value="menu" className="flex-1 rounded-none py-3">
                      {t("mess.tabs.menu")}
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="location" className="flex-1 rounded-none py-3">
                    <Map className="w-4 h-4 mr-2" />
                    {t("mess.tabs.location")}
                  </TabsTrigger>
                  {hasPhotos && (
                    <TabsTrigger value="photos" className="flex-1 rounded-none py-3">
                      {t("mess.tabs.photos")}
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="reviews" className="flex-1 rounded-none py-3">
                    {t("mess.tabs.reviews")}
                  </TabsTrigger>
                </TabsList>
                {hasMenu && (
                  <TabsContent value="menu" className="p-6">
                    <div className="space-y-6">
                      {mess.menu.map((day, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <h3 className="font-bold text-lg mb-3">{day.day}</h3>
                            <div className="grid gap-4 md:grid-cols-3">
                              {day.breakfast && (
                                <div>
                                  <div className="flex items-center mb-2">
                                    <Utensils className="w-4 h-4 mr-2 text-primary" />
                                      <h4 className="font-medium">{t("common.meal.breakfast")}</h4>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{day.breakfast}</p>
                                </div>
                              )}
                              {day.lunch && (
                                <div>
                                  <div className="flex items-center mb-2">
                                    <Utensils className="w-4 h-4 mr-2 text-primary" />
                                      <h4 className="font-medium">{t("common.meal.lunch")}</h4>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{day.lunch}</p>
                                </div>
                              )}
                              {day.dinner && (
                                <div>
                                  <div className="flex items-center mb-2">
                                    <Utensils className="w-4 h-4 mr-2 text-primary" />
                                      <h4 className="font-medium">{t("common.meal.dinner")}</h4>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{day.dinner}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                )}
                <TabsContent value="location" className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold mb-4">{t("mess.detail.location.heading")}</h3>
                      <Card className="mb-4">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-muted-foreground font-medium">{t("common.address")}</p>
                              <p className="text-base text-gray-900">{addressText || t("common.notProvided")}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {addressText ? (
                        <MessLocationMapReadonly
                          address={addressText}
                          coordinates={mess.coordinates || null}
                          heightClassName="h-[420px]"
                        />
                      ) : null}

                    </div>
                  </div>
                </TabsContent>
                {hasPhotos && (
                  <TabsContent value="photos" className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {mess.images.map((image, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden">
                          <Image
                            src={image || "/placeholder.svg"}
                            alt={`${mess.name} - Photo ${index + 1}`}
                            width={300}
                            height={300}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onClick={() => setActiveImageIndex(index)}
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
                <TabsContent value="reviews" className="p-6">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-bold mb-4">{t("reviews.writeTitle")}</h3>
                      <ReviewForm itemType="mess" itemId={mess._id} onSuccess={() => setActiveTab("reviews")} />
                    </div>

                    <div className="pt-6 border-t">
                      <h3 className="text-lg font-bold mb-4">{t("reviews.title")}</h3>
                      <ReviewsList itemType="mess" itemId={mess._id} onRatingChange={handleRatingChange} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <div className="mb-4 pb-4 border-b">
                {hasMonthlyPrice ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">₹{monthlyPrice}</span>
                      <span className="text-muted-foreground">/{t("common.perMonth")}</span>
                    </div>
                    {hasDailyPrice ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("common.or")} ₹{dailyPrice}/{t("common.perDay")}
                      </p>
                    ) : null}
                  </>
                ) : hasDailyPrice ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">₹{dailyPrice}</span>
                      <span className="text-muted-foreground">/{t("common.perDay")}</span>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="mb-6">
                <h3 className="font-bold mb-3">{t("common.contactInformation")}</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      <Utensils className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{contactName}</p>
                      <p className="text-sm text-muted-foreground">{t("mess.detail.contact.owner")}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{contactPhone || t("common.notProvided")}</p>
                      <p className="text-sm text-muted-foreground">{t("common.callOrWhatsapp")}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{contactEmail || t("common.notProvided")}</p>
                      <p className="text-sm text-muted-foreground">{t("common.email")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {hasMonthlyPrice ? (
                  <Button
                    className="w-full h-12"
                    onClick={() => {
                      handleSubscribeMonthly()
                    }}
                  >
                    {t("mess.detail.action.subscribeMonthly")}
                  </Button>
                ) : null}

                {hasDailyPrice ? (
                  <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => {
                      if (!user) {
                        toast({
                          title: t("common.loginRequired"),
                          description: t("mess.detail.toast.loginToBookMeal"),
                          variant: "destructive",
                        })
                        router.push(`/login?redirect=/messes/${encodeURIComponent(String(messId || ""))}`)
                        return
                      }

                      toast({
                        title: t("mess.detail.toast.mealBooked.title"),
                        description: t("mess.detail.toast.mealBooked.desc"),
                      })
                    }}
                  >
                    {t("mess.detail.action.bookDailyMeal")}
                  </Button>
                ) : null}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-bold mb-3">{t("mess.detail.mealTimings")}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-primary" />
                      <span className="text-sm">{t("common.meal.breakfast")}</span>
                    </div>
                    <span className="text-sm font-medium">{mess.openingHours.breakfast}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-primary" />
                      <span className="text-sm">{t("common.meal.lunch")}</span>
                    </div>
                    <span className="text-sm font-medium">{mess.openingHours.lunch}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-primary" />
                      <span className="text-sm">{t("common.meal.dinner")}</span>
                    </div>
                    <span className="text-sm font-medium">{mess.openingHours.dinner}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={mess.name}
        url={getShareUrl()}
      />

      <Dialog open={isSubscribeOpen} onOpenChange={setIsSubscribeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mess.detail.subscribeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("mess.detail.subscribeDialog.desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscriptionStartDate">{t("mess.detail.subscribeDialog.startDate")}</Label>
              <input
                id="subscriptionStartDate"
                type="date"
                value={subscriptionStartDate}
                onChange={(e) => setSubscriptionStartDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              {hasMonthlyPrice ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.amount")}: ₹{monthlyPrice}/{t("common.perMonth")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriptionPhone">{t("mess.detail.subscribeDialog.phone")}</Label>
              <input
                id="subscriptionPhone"
                type="tel"
                inputMode="numeric"
                placeholder={t("mess.detail.subscribeDialog.phonePlaceholder")}
                value={subscriptionPhone}
                onChange={(e) => setSubscriptionPhone(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t("mess.detail.subscribeDialog.phoneHelp")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscribeOpen(false)} disabled={isCreatingSubscription}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmSubscription} disabled={isCreatingSubscription}>
              {isCreatingSubscription ? t("common.creating") : t("mess.detail.subscribeDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
