"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Search,
  Home,
  Building2,
  UtensilsCrossed,
  MapPin,
  Calendar,
  CreditCard,
  ArrowRight,
  Star,
  Shield,
  Users,
  CheckCircle,
  Phone,
  Tag,
  TrendingUp,
  Wifi,
  Utensils,
  Zap,
  Droplet,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import HowItWorks from "@/components/how-it-works"
import { SmartLocationInput } from "@/components/smart-location-input"
import { useLanguage } from "@/providers/language-provider"

export default function Page() {
  const { t, lang } = useLanguage()
  const [forceUpdate, setForceUpdate] = useState(0)

  useEffect(() => {
    setForceUpdate(prev => prev + 1)
  }, [lang])
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [stats, setStats] = useState({ properties: 0, cities: 0, students: 0 })
  const [selectedService, setSelectedService] = useState("pgs")
  const [location, setLocation] = useState("")
  const [budget, setBudget] = useState("")
  const [moveInDate, setMoveInDate] = useState("")
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([])
  const [offers, setOffers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isAuthenticated = status === "authenticated"

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch properties
        try {
          const propertiesRes = await fetch("/api/properties")
          if (propertiesRes.ok) {
            const propsData = await propertiesRes.json()
            const approvedProps = (propsData.properties || []).filter((p: any) => p.isApproved && !p.isRejected)
            setStats((prev) => ({ ...prev, properties: approvedProps.length }))

            const cities = new Set(
              approvedProps
                .map((p: any) => {
                  const parts = p.location?.split(",")
                  return parts?.[parts.length - 1]?.trim() || parts?.[0]?.trim()
                })
                .filter(Boolean)
            )
            setStats((prev) => ({ ...prev, cities: cities.size }))
          }
        } catch (error) {
          console.error("Error fetching properties:", error)
        }

        // Fetch colleges
        try {
          const collegesRes = await fetch("/api/colleges")
          if (collegesRes.ok) {
            const collegesData = await collegesRes.json()
            setStats((prev) => ({ ...prev, students: prev.properties * 50 }))
          }
        } catch (error) {
          console.error("Error fetching colleges:", error)
        }

        // Fetch featured properties
        try {
          const featuredRes = await fetch("/api/properties/featured")
          if (featuredRes.ok) {
            const featuredData = await featuredRes.json()
            const props = featuredData.properties || []
            setFeaturedProperties(props)

            // Generate offers from featured properties
            if (props.length > 0) {
              setOffers([
                {
                  id: "first-booking",
                  title: "Get FLAT 12% OFF",
                  description: "On Your First Property Booking",
                  code: "WELCOME12",
                  image: props[0]?.image || "/placeholder.jpg",
                },
                {
                  id: "semester-plan",
                  title: "Save Up to ₹5,000",
                  description: "Book Semester-Wise Plans",
                  code: "SEMESTER",
                  image: props[1]?.image || props[0]?.image || "/placeholder.jpg",
                },
                {
                  id: "referral",
                  title: "Earn ₹1,000",
                  description: "Refer a Friend & Both Save",
                  code: "REFER1000",
                  image: props[2]?.image || props[0]?.image || "/placeholder.jpg",
                },
              ])
            }
          }
        } catch (error) {
          console.error("Error fetching featured properties:", error)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const services = [
    { id: "pgs", label: t("home.service.pgs"), icon: Home },
    { id: "flats", label: t("home.service.flats"), icon: Building2 },
    { id: "messes", label: t("home.service.mess"), icon: UtensilsCrossed },
  ]

  const handleSearch = () => {
    const params = new URLSearchParams()

    if (location.trim()) {
      params.set("query", location.trim())
    }

    if (budget) {
      params.set("maxPrice", budget)
    }

    if (selectedService === "pgs") {
      params.set("type", "PG")
    } else if (selectedService === "flats") {
      params.set("type", "Flat")
    }

    // Navigate based on service type
    if (selectedService === "map") {
      router.push(`/map${params.toString() ? `?${params.toString()}` : ""}`)
    } else if (selectedService === "messes") {
      router.push(`/messes${params.toString() ? `?${params.toString()}` : ""}`)
    } else {
      router.push(`/listings${params.toString() ? `?${params.toString()}` : ""}`)
    }
  }

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId)
  }

  const categories = [
    {
      id: "boys-pg",
      title: "Boys PG",
      image: "/boys-hostel-comfort.jpg",
      link: "/listings?type=PG&gender=boys",
      count: Math.floor(stats.properties * 0.3),
    },
    {
      id: "girls-pg",
      title: "Girls PG",
      image: "/modern-girls-pg.jpg",
      link: "/listings?type=PG&gender=girls",
      count: Math.floor(stats.properties * 0.35),
    },
    {
      id: "flats",
      title: "Student Flats",
      image: "/modern-flat-students.jpg",
      link: "/listings?type=Flat",
      count: Math.floor(stats.properties * 0.25),
    },
    {
      id: "hostels",
      title: "Hostels",
      image: "/cozy-student-hostel.jpg",
      link: "/listings?type=Hostel",
      count: Math.floor(stats.properties * 0.1),
    },
  ]

  return (
    <div className="min-h-screen bg-white" key={`home-${lang}-${forceUpdate}`}>
      {/* Hero Section with Background Image */}
      <section 
        className="relative min-h-[600px] flex items-center"
        style={{
          backgroundImage: 'url(/pexels-photo-439391.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Content */}
        <div className="container mx-auto px-4 relative z-10 py-16">
          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              {t("home.heroTitle")}
            </h1>
            <p className="text-xl md:text-2xl text-white/95 drop-shadow-md">
              {t("home.heroSubtitle")}
            </p>
          </div>

          {/* Non-authenticated users: Show Get Started */}
          {!isAuthenticated && (
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  🎓 {t("home.welcomeTitle")}
                </h2>
                <p className="text-lg text-gray-700 mb-6">
                  {t("home.welcomeDesc")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => router.push("/signup")}
                    size="lg"
                    className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 h-auto"
                  >
                    {t("home.ctaPrimary")} 
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => router.push("/login")}
                    size="lg"
                    variant="outline"
                    className="bg-white text-gray-900 text-lg px-8 py-6 h-auto border-2 border-gray-300 hover:bg-white hover:border-orange-500 hover:text-orange-600 transition-all"
                  >
                    {t("home.ctaSecondary")}
                  </Button>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-orange-600">{stats.properties}</div>
                    <div className="text-sm text-gray-600">{t("home.statProperties")}</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-orange-600">{stats.cities}</div>
                    <div className="text-sm text-gray-600">{t("home.statCities")}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Authenticated users: Show Search Card */}
          {isAuthenticated && <div className="max-w-5xl mx-auto">
            <Card className="border-0 shadow-2xl">
              <CardContent className="p-4 md:p-6 lg:p-8">
                {/* Service Tabs */}
                <div className="flex gap-1 md:gap-2 mb-4 md:mb-6 border-b border-gray-200 overflow-x-auto hide-scrollbar -mx-4 md:-mx-0 px-4 md:px-0">
                  {services.map((service) => {
                    const Icon = service.icon
                    const isActive = selectedService === service.id
                    return (
                      <button
                        key={service.id}
                        onClick={() => handleServiceChange(service.id)}
                        className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2.5 md:py-3 font-semibold text-sm md:text-base transition-all border-b-2 whitespace-nowrap flex-shrink-0 ${
                          isActive
                            ? "border-orange-500 text-orange-600"
                            : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                        <span className="truncate">{service.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Search Form */}
                <div className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    {/* Location - Smart AI Search */}
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-xs md:text-sm font-semibold text-gray-700">
                        City, Area or College
                      </label>
                      <SmartLocationInput
                        value={location}
                        onChange={setLocation}
                        placeholder="Search locations, colleges..."
                      />
                    </div>

                    {/* Budget */}
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-xs md:text-sm font-semibold text-gray-700">
                        Budget
                      </label>
                      <div className="relative">
                        <CreditCard className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 pointer-events-none z-10" />
                        <select
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          className="w-full pl-9 md:pl-11 pr-8 md:pr-4 py-2.5 md:py-3.5 border-2 border-gray-300 rounded focus:border-orange-500 focus:outline-none appearance-none cursor-pointer bg-white text-gray-900 text-sm md:text-base"
                        >
                          <option value="">Any Budget</option>
                          <option value="5000">Up to ₹5,000</option>
                          <option value="10000">Up to ₹10,000</option>
                          <option value="15000">Up to ₹15,000</option>
                          <option value="20000">Up to ₹20,000</option>
                          <option value="25000">Up to ₹25,000</option>
                          <option value="30000">Up to ₹30,000</option>
                        </select>
                        <div className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Move-in Date */}
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-xs md:text-sm font-semibold text-gray-700">
                        Move-in Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 pointer-events-none z-10" />
                        <input
                          type="date"
                          value={moveInDate}
                          onChange={(e) => setMoveInDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full pl-9 md:pl-11 pr-3 md:pr-4 py-2.5 md:py-3.5 border-2 border-gray-300 rounded focus:border-orange-500 focus:outline-none bg-white text-gray-900 text-sm md:text-base"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Search Button */}
                  <Button
                    onClick={handleSearch}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 md:py-6 text-base md:text-lg rounded shadow-md"
                  >
                    <Search className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    <span className="hidden sm:inline">SEARCH PROPERTIES</span>
                    <span className="sm:hidden">SEARCH</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>}
        </div>
      </section>

      {/* Stats Bar - Only show for authenticated users */}
      {isAuthenticated && <section className="bg-orange-50 border-b border-orange-100 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {stats.properties || "500+"}
              </div>
              <div className="text-sm text-gray-700 font-medium">{t("home.stats.propertiesListed")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {stats.cities || "25+"}
              </div>
              <div className="text-sm text-gray-700 font-medium">{t("home.stats.cities")}</div>
            </div>
          </div>
        </div>
      </section>}

      {/* Browse by Category - With Real Images - Only show for authenticated users */}
      {isAuthenticated && <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-10">
              Browse by Category
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link key={category.id} href={category.link}>
                  <Card className="border-2 border-gray-200 hover:border-orange-500 hover:shadow-xl transition-all cursor-pointer overflow-hidden h-full group">
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      <Image
                        src={category.image}
                        alt={category.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-white font-bold text-xl mb-1">{category.title}</h3>
                        {category.count > 0 && (
                          <p className="text-white/90 text-sm">{category.count} Properties</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>}

      {/* Why Choose Us - With Image */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Image Side */}
              <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/happy-college-students-finding-accommodation.jpg"
                  alt="Happy students finding accommodation"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Content Side */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  {t("home.trust.title")}
                </h2>
                <div className="space-y-6">
                  {[
                    { 
                      icon: Shield, 
                      title: t("home.trust.items.verified.title"), 
                      desc: t("home.trust.items.verified.desc")
                    },
                    { 
                      icon: Tag, 
                      title: t("home.trust.items.brokerage.title"), 
                      desc: t("home.trust.items.brokerage.desc")
                    },
                    { 
                      icon: Users, 
                      title: t("home.trust.items.support.title"), 
                      desc: t("home.trust.items.support.desc")
                    },
                    { 
                      icon: CheckCircle, 
                      title: t("home.trust.items.booking.title"), 
                      desc: t("home.trust.items.booking.desc")
                    },
                  ].map((item, idx) => {
                    const Icon = item.icon
                    return (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-6 h-6 text-orange-600" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1 text-lg">{item.title}</h3>
                          <p className="text-gray-600">{item.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties - Real Data - Only show for authenticated users */}
      {isAuthenticated && featuredProperties.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Properties</h2>
                <p className="text-gray-600">Top-rated accommodations for students</p>
              </div>
              <Link href="/listings">
                <Button variant="outline" className="border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600 font-semibold">
                  VIEW ALL
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredProperties.slice(0, 3).map((property) => (
                <Link key={property._id} href={`/listings/${property._id}`}>
                  <Card className="border-2 border-gray-200 hover:border-orange-500 hover:shadow-xl transition-all cursor-pointer overflow-hidden h-full group">
                    <div className="relative h-52 overflow-hidden bg-gray-100">
                      <Image
                        src={property.image || "/placeholder.jpg"}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                      {property.isVerified && (
                        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          VERIFIED
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-1">{property.title}</h3>
                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{typeof property.location === 'string' ? property.location : property.location?.address || property.address || "Location not specified"}</span>
                      </div>
                      
                      {/* Amenities */}
                      {(property.amenities && property.amenities.length > 0) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {property.amenities.slice(0, 3).map((amenity: string, idx: number) => {
                            let Icon = Wifi
                            if (amenity.toLowerCase().includes('food') || amenity.toLowerCase().includes('meal')) Icon = Utensils
                            if (amenity.toLowerCase().includes('power') || amenity.toLowerCase().includes('backup')) Icon = Zap
                            if (amenity.toLowerCase().includes('water')) Icon = Droplet
                            
                            return (
                              <div key={idx} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                <Icon className="w-3 h-3" />
                                <span className="line-clamp-1">{amenity}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">
                            ₹{property.price?.toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-gray-500">per month</div>
                        </div>
                        {property.rating > 0 && (
                          <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
                            <Star className="w-4 h-4 fill-green-600 text-green-600" />
                            <span className="font-bold text-green-700 text-sm">{property.rating}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Offers Section - Real Data - Only show for authenticated users */}
      {isAuthenticated && offers.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-10">
              Exclusive Student Offers
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {offers.map((offer, idx) => (
                <Card key={idx} className="border-2 border-gray-200 hover:border-orange-500 hover:shadow-xl transition-all overflow-hidden">
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    <Image
                      src={offer.image || "/placeholder.jpg"}
                      alt={offer.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-white font-bold text-xl mb-1">{offer.title}</div>
                      <div className="text-white/90 text-sm">{offer.description}</div>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4 p-3 bg-orange-50 rounded border border-orange-200">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Use Code</div>
                        <div className="font-bold text-orange-600 text-lg">{offer.code}</div>
                      </div>
                      <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                        ACTIVE
                      </div>
                    </div>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
                      onClick={() => {
                        router.push(`/listings?promo=${offer.code}`)
                        toast({
                          title: "Offer Applied!",
                          description: `Promo code ${offer.code} has been applied`,
                        })
                      }}
                    >
                      {idx === 0 ? "BOOK NOW" : idx === 1 ? "VIEW PLANS" : "REFER NOW"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <HowItWorks />

      {/* List Property CTA - With Image */}
      <section 
        className="relative py-24 overflow-hidden"
        style={{
          backgroundImage: 'url(/luxury-girls-pg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-6">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("home.listProperty.title")}
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl">
              {t("home.listProperty.desc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register-property">
                <Button
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-6 text-base"
                >
                  {t("home.listProperty.ctaPrimary")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100 font-bold px-8 py-6 text-base shadow-lg"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  {t("home.listProperty.ctaSecondary")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t("home.final.title")}
          </h2>
          <p className="text-xl mb-10 text-gray-300 max-w-2xl mx-auto">
            {t("home.final.subtitle")}
          </p>
          <Link href="/listings">
            <Button
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded px-12 py-7 text-lg shadow-xl"
            >
              {t("home.final.cta")}
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
