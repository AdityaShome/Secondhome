"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  GraduationCap,
  Camera,
  Save,
  ArrowLeft,
  Edit2,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Heart,
  Settings as SettingsIcon,
  Building2,
  Star,
  LayoutDashboard,
  ListChecks,
  Trash2,
} from "lucide-react"
import { LikeButton } from "@/components/like-button"
import { PhoneVerification } from "@/components/phone-verification"

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const { toast } = useToast()

  // Tab management
  const tabFromUrl = searchParams.get("tab") || "overview"
  const [activeTab, setActiveTab] = useState(tabFromUrl)

  // Profile state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phoneVerified: false,
    dateOfBirth: "",
    gender: "",
    nationality: "",
    college: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  // Dashboard data
  const [bookings, setBookings] = useState<any[]>([])
  const [likedProperties, setLikedProperties] = useState<any[]>([])
  const [userProperties, setUserProperties] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  
  // Counts for overview tab
  const [savedCount, setSavedCount] = useState(0)
  const [propertiesCount, setPropertiesCount] = useState(0)

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: false,
    smsNotifications: false,
    showProfile: true,
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab") || "overview"
    setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetchProfileData()
    }
  }, [user, loading, router])

  const fetchProfileData = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        const userData = data.user || data
        const nameParts = (userData.name || "").split(" ").filter(Boolean)
        const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0] || ""
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""
        setProfileData({
          name: userData.name || "",
          firstName: firstName || "",
          lastName: lastName || "",
          email: userData.email || "",
          phoneVerified: userData.phoneVerified || false,
          phone: userData.phone || "",
          dateOfBirth: userData.dateOfBirth || "",
          gender: userData.gender || "",
          nationality: userData.nationality || "",
          college: userData.college || "",
          address: userData.address || "",
          city: userData.city || "",
          state: userData.state || "",
          pincode: userData.pincode || "",
        })
        calculateProfileCompletion(userData)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
  }

  // Fetch counts for overview tab
  useEffect(() => {
    if (!user) return

    const fetchCounts = async () => {
      try {
        // Fetch saved properties count
        const favoritesResponse = await fetch("/api/favorites")
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json()
          setSavedCount(favoritesData.count || 0)
        }

        // Fetch user's properties count (if owner/admin)
        if (user.role === "owner" || user.role === "admin") {
          const propertiesResponse = await fetch("/api/properties")
          if (propertiesResponse.ok) {
            const propertiesData = await propertiesResponse.json()
            const myProperties = (propertiesData.properties || []).filter(
              (p: any) => p.owner?._id === user.id || p.owner?._id?.toString() === user.id
            )
            setPropertiesCount(myProperties.length || 0)
          }
        }
      } catch (error) {
        console.error("Error fetching counts:", error)
      }
    }

    fetchCounts()
  }, [user])

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setIsLoadingData(true)
      try {
        if (activeTab === "bookings") {
          const response = await fetch("/api/bookings")
          if (response.ok) {
            const data = await response.json()
            setBookings(data.bookings || data || [])
          }
        } else if (activeTab === "liked") {
          // Use the same API as favorites page
          const response = await fetch("/api/favorites")
          if (response.ok) {
            const data = await response.json()
            const favoritePropertyIds = data.favorites || []
            
            // Fetch full property details for each favorite
            const propertyPromises = favoritePropertyIds.map(async (propertyId: string) => {
              try {
                const propRes = await fetch(`/api/properties/${propertyId}`)
                if (propRes.ok) {
                  const propData = await propRes.json()
                  return propData.property
                }
                return null
              } catch (error) {
                console.error(`Error fetching property ${propertyId}:`, error)
                return null
              }
            })

            const properties = await Promise.all(propertyPromises)
            const validProperties = properties.filter(Boolean)
            setLikedProperties(validProperties)
            // Update saved count when fetching liked properties
            setSavedCount(validProperties.length)
          }
        } else if (activeTab === "properties" && (user.role === "owner" || user.role === "admin")) {
          const response = await fetch("/api/properties")
          if (response.ok) {
            const data = await response.json()
            const myProperties = (data.properties || []).filter(
              (p: any) => p.owner?._id === user.id || p.owner?._id?.toString() === user.id
            )
            setUserProperties(myProperties || [])
            // Update properties count when fetching user properties
            setPropertiesCount(myProperties.length || 0)
          }
        } else if (activeTab === "settings") {
          const response = await fetch("/api/user/settings")
          if (response.ok) {
            const data = await response.json()
            setSettings(data.preferences || {
              emailNotifications: false,
              smsNotifications: false,
              showProfile: true,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()

    // Refresh saved properties every 3 seconds if on liked tab
    let interval: NodeJS.Timeout | null = null
    if (activeTab === "liked") {
      interval = setInterval(async () => {
        try {
          const response = await fetch("/api/favorites")
          if (response.ok) {
            const data = await response.json()
            const favoritePropertyIds = data.favorites || []
            
            // Fetch full property details for each favorite
            const propertyPromises = favoritePropertyIds.map(async (propertyId: string) => {
              try {
                const propRes = await fetch(`/api/properties/${propertyId}`)
                if (propRes.ok) {
                  const propData = await propRes.json()
                  return propData.property
                }
                return null
              } catch (error) {
                return null
              }
            })

            const properties = await Promise.all(propertyPromises)
            const validProperties = properties.filter(Boolean)
            setLikedProperties(validProperties)
            setSavedCount(validProperties.length)
          }
        } catch (err) {
          console.error("Error refreshing saved properties:", err)
        }
      }, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeTab, user])

  const calculateProfileCompletion = (data: any) => {
    const fields = [
      data.name,
      data.email,
      data.phone,
      data.dateOfBirth,
      data.gender,
      data.college,
      data.address,
    ]
    const filledFields = fields.filter((field) => field && field.trim() !== "").length
    setProfileCompletion(Math.round((filledFields / fields.length) * 100))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/user/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update profile")
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      })
      setIsEditing(false)
      fetchProfileData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/user/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update password")
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      })
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setShowPasswordForm(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update settings")
      }

      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/profile?tab=${value}`, { scroll: false })
  }

  const removeFavorite = async (propertyId: string) => {
    setRemovingId(propertyId)
    try {
      const res = await fetch(`/api/favorites?propertyId=${propertyId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setLikedProperties(prev => prev.filter(p => p._id !== propertyId))
        setSavedCount(prev => Math.max(0, prev - 1))
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

  const sidebarLinks = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "bookings", label: "My Bookings", icon: Calendar },
    { id: "liked", label: "Saved Properties", icon: Heart },
    ...(user?.role === "owner" || user?.role === "admin"
      ? [{ id: "properties", label: "My Properties", icon: Building2 }]
      : []),
    ...(user?.role === "admin" ? [{ id: "admin", label: "Admin Panel", icon: Shield }] : []),
    { id: "settings", label: "Settings", icon: SettingsIcon },
    { id: "profile", label: "My Profile", icon: User },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header Section with Background Photo */}
      <section
        className="relative h-64 md:h-80 overflow-hidden"
        style={{
          backgroundImage: 'url(/nature_second_home.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        } as React.CSSProperties}
      >
        {/* Professional overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />

        <div className="container mx-auto px-4 relative z-10 h-full flex items-end pb-8">
          <div className="flex items-end gap-6 w-full">
            {/* Breadcrumb */}
            <Link
              href="/"
              className="absolute top-6 left-4 text-white/90 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>

            {/* Profile Picture */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-4xl md:text-5xl font-bold shadow-2xl border-4 border-white">
                {user.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-200">
                <Camera className="w-5 h-5 text-gray-700" />
              </button>
              {/* Online indicator */}
              <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md" />
            </div>

            {/* User Info */}
            <div className="flex-1 text-white pb-2">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{user.name || "Student"}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm md:text-base mb-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/30">
                  <Phone className="w-4 h-4" />
                  <span>{profileData.phone || "Add Phone Number"}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/30">
                  <Mail className="w-4 h-4" />
                  <span className="max-w-xs truncate">{user.email || "Add Email Address"}</span>
                </div>
              </div>
              {user.role && (
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-orange-500/90 text-white border border-orange-400/50 backdrop-blur-sm">
                  {user.role === "admin" ? "Admin" : user.role === "owner" ? "Property Owner" : "Student"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Navigation */}
          <aside className="lg:col-span-1">
            <Card className="bg-white shadow-md">
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-bold text-gray-900">MY ACCOUNT</h2>
                  <p className="text-xs text-gray-500 mt-1">Manage your account</p>
                </div>
                <nav className="p-2">
                  {sidebarLinks.map((link) => {
                    const Icon = link.icon
                    const isActive = activeTab === link.id
                    return (
                      <button
                        key={link.id}
                        onClick={() => handleTabChange(link.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-600 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                        <span className="flex-1 text-left">{link.label}</span>
                        {isActive && <div className="ml-auto w-2 h-2 bg-red-500 rounded-full" />}
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content - Tabs */}
          <main className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">Welcome back, {user.name?.split(" ")[0] || "Student"}! 👋</CardTitle>
                    <CardDescription className="text-gray-600">Here's a summary of your activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      <Card className="bg-white border border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold text-gray-900">Bookings</CardTitle>
                            <Calendar className="w-5 h-5 text-orange-500" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-4xl font-bold text-orange-500">{bookings.length}</p>
                          <p className="text-sm text-gray-700 mt-2">Total bookings</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-white border border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold text-gray-900">Saved</CardTitle>
                            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-4xl font-bold text-red-500">{savedCount}</p>
                          <p className="text-sm text-gray-700 mt-2">Saved properties</p>
                        </CardContent>
                      </Card>
                      {(user.role === "owner" || user.role === "admin") && (
                        <Card className="bg-white border border-gray-200">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-semibold text-gray-900">Properties</CardTitle>
                              <Building2 className="w-5 h-5 text-blue-500" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-4xl font-bold text-blue-500">{propertiesCount}</p>
                            <p className="text-sm text-gray-700 mt-2">Listed properties</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full bg-primary hover:bg-primary/90">
                      <Link href="/listings">Browse Properties</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* My Bookings Tab */}
              <TabsContent value="bookings">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">My Bookings</CardTitle>
                    <CardDescription className="text-gray-600">View and manage your bookings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingData ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">You don't have any bookings yet.</p>
                        <Button asChild>
                          <Link href="/listings">Find Accommodation</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings.map((booking) => (
                          <Card key={booking._id} className="border border-gray-200 bg-white">
                            <CardHeader>
                              <CardTitle className="text-lg text-gray-900">{booking.property?.title || booking.propertyName || "Property"}</CardTitle>
                              <CardDescription className="text-gray-600">
                                {booking.property?.location || booking.location || "Location not specified"}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600 mb-1">Check-in</p>
                                  <p className="font-semibold text-gray-900">
                                    {booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : "Not specified"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600 mb-1">Room Type</p>
                                  <p className="font-semibold text-gray-900">{booking.roomType || "Standard"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 mb-1">Status</p>
                                  <Badge
                                    variant={
                                      booking.status === "confirmed"
                                        ? "default"
                                        : booking.status === "pending"
                                        ? "secondary"
                                        : "destructive"
                                    }
                                  >
                                    {booking.status || "pending"}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-gray-600 mb-1">Amount</p>
                                  <p className="font-semibold text-lg text-gray-900">
                                    ₹{booking.totalAmount ? booking.totalAmount.toLocaleString('en-IN') : booking.amount ? booking.amount.toLocaleString('en-IN') : "0"}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Saved Properties Tab */}
              <TabsContent value="liked">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">Saved Properties</CardTitle>
                    <CardDescription className="text-gray-600">Properties and messes you've liked</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingData ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : likedProperties.length === 0 ? (
                      <div className="text-center py-8">
                        <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">You haven't saved any properties yet.</p>
                        <Button asChild>
                          <Link href="/listings">Browse Listings</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {likedProperties.map((property) => (
                          <Card 
                            key={property._id} 
                            className="overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
                            onClick={() => router.push(`/property/${property._id}`)}
                          >
                            <div className="relative h-48 overflow-hidden bg-muted">
                              <Image
                                src={property.images?.[0] || "/placeholder.jpg"}
                                alt={property.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">
                                {property.type}
                              </Badge>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeFavorite(property._id)
                                }}
                                disabled={removingId === property._id}
                                className="absolute top-3 right-3 w-10 h-10 bg-white/95 backdrop-blur rounded-full flex items-center justify-center hover:scale-110 transition-all active:scale-95 disabled:opacity-50 shadow-lg"
                              >
                                {removingId === property._id ? (
                                  <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                                ) : (
                                  <Trash2 className="w-5 h-5 text-red-500" />
                                )}
                              </button>
                            </div>
                            <CardHeader>
                              <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                                {property.title}
                              </CardTitle>
                              <CardDescription className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                                <span className="line-clamp-2">
                                  {typeof property.location === 'string' ? property.location : property.location?.address || property.city || property.address || "Location not specified"}
                                </span>
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-2xl font-bold text-primary">₹{property.price}</p>
                                  <span className="text-xs text-muted-foreground">/month</span>
                                </div>
                                {property.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    <span className="text-sm font-semibold">{property.rating}</span>
                                    <span className="text-xs text-muted-foreground">({property.reviews || 0})</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button asChild className="w-full">
                                <Link href={`/property/${property._id}`}>View Details</Link>
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* My Properties Tab */}
              {(user.role === "owner" || user.role === "admin") && (
                <TabsContent value="properties">
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-gray-900">My Properties</CardTitle>
                      <CardDescription className="text-gray-600">Manage your property listings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingData ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : userProperties.length === 0 ? (
                        <div className="text-center py-8">
                          <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500 mb-4">You haven't listed any properties yet.</p>
                          <Button asChild>
                            <Link href="/list-property">List Your First Property</Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {userProperties.map((property) => (
                            <Card key={property._id} className="overflow-hidden">
                              <CardHeader>
                                <CardTitle className="text-lg">{property.title}</CardTitle>
                                <CardDescription>{typeof property.location === 'string' ? property.location : property.location?.address || property.address || "Location not specified"}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <p className="text-2xl font-bold text-primary">₹{property.price}/month</p>
                                  <Badge
                                    variant={
                                      property.isApproved && !property.isRejected
                                        ? "default"
                                        : property.isRejected
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {property.isApproved && !property.isRejected
                                      ? "Approved"
                                      : property.isRejected
                                      ? "Rejected"
                                      : "Pending"}
                                  </Badge>
                                </div>
                              </CardContent>
                              <CardFooter className="gap-2">
                                <Button asChild variant="outline" className="flex-1">
                                  <Link href={`/listings/${property._id}`}>View</Link>
                                </Button>
                                <Button asChild className="flex-1">
                                  <Link href={`/list-property?id=${property._id}`}>Edit</Link>
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Admin Panel Tab */}
              {user.role === "admin" && (
                <TabsContent value="admin">
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-gray-900">Admin Panel</CardTitle>
                      <CardDescription className="text-gray-600">Manage all properties and users</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">Access the admin panel to manage properties.</p>
                        <Button asChild>
                          <Link href="/admin/properties">Go to Admin Panel</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Settings Tab */}
              <TabsContent value="settings">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">Settings</CardTitle>
                    <CardDescription className="text-gray-600">Manage your account settings and preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Display Name</Label>
                            <p className="text-sm text-gray-500 mt-1">{user.name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Email Address</Label>
                            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Account Type</Label>
                            <p className="text-sm text-gray-500 mt-1 capitalize">{user.role || "User"}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Preferences</h3>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="email-notifications"
                              checked={settings.emailNotifications}
                              onCheckedChange={(checked) =>
                                setSettings({ ...settings, emailNotifications: checked === true })
                              }
                            />
                            <Label htmlFor="email-notifications" className="text-sm cursor-pointer">
                              Email notifications for new properties
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="sms-notifications"
                              checked={settings.smsNotifications}
                              onCheckedChange={(checked) =>
                                setSettings({ ...settings, smsNotifications: checked === true })
                              }
                            />
                            <Label htmlFor="sms-notifications" className="text-sm cursor-pointer">
                              SMS notifications for bookings
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="show-profile"
                              checked={settings.showProfile}
                              onCheckedChange={(checked) =>
                                setSettings({ ...settings, showProfile: checked === true })
                              }
                            />
                            <Label htmlFor="show-profile" className="text-sm cursor-pointer">
                              Show my profile to property owners
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                      {isSavingSettings ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card className="bg-white shadow-md">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                      <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
                      {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center gap-2">
                          <Edit2 className="w-4 h-4" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setIsEditing(false)
                              fetchProfileData()
                            }}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Profile Completion Banner */}
                    {profileCompletion < 100 && (
                      <div className="bg-pink-50 border-l-4 border-pink-400 p-4 rounded-lg mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16">
                            <svg className="transform -rotate-90 w-16 h-16">
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                className="text-gray-200"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 28}`}
                                strokeDashoffset={`${2 * Math.PI * 28 * (1 - profileCompletion / 100)}`}
                                className="text-pink-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-bold text-pink-600">{profileCompletion}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">Complete your profile</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Add your contact details to receive booking updates and important information.
                            </p>
                          </div>
                        </div>
                        {!profileData.email && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsEditing(true)}>
                            Add Email
                          </Button>
                        )}
                      </div>
                    )}

                    {/* General Information */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">General Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First & Middle Name</Label>
                          <Input
                            id="firstName"
                            type="text"
                            value={profileData.firstName ?? ""}
                            onChange={(e) => {
                              const newFirstName = e.target.value
                              const fullName = newFirstName.trim() + (profileData.lastName ? " " + profileData.lastName : "")
                              setProfileData((prev) => ({
                                ...prev,
                                firstName: newFirstName,
                                name: fullName.trim(),
                              }))
                            }}
                            disabled={!isEditing}
                            className="bg-white text-gray-900"
                            placeholder="Enter first name"
                            autoComplete="given-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            type="text"
                            value={profileData.lastName ?? ""}
                            onChange={(e) => {
                              const newLastName = e.target.value
                              const fullName = (profileData.firstName ? profileData.firstName + " " : "") + newLastName.trim()
                              setProfileData((prev) => ({
                                ...prev,
                                lastName: newLastName,
                                name: fullName.trim(),
                              }))
                            }}
                            disabled={!isEditing}
                            className="bg-white text-gray-900"
                            placeholder="Enter last name"
                            autoComplete="family-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gender</Label>
                          <select
                            id="gender"
                            value={profileData.gender || ""}
                            onChange={(e) => {
                              setProfileData((prev) => ({
                                ...prev,
                                gender: e.target.value,
                              }))
                            }}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input
                            id="dob"
                            type="date"
                            value={profileData.dateOfBirth ?? ""}
                            onChange={(e) => {
                              setProfileData((prev) => ({
                                ...prev,
                                dateOfBirth: e.target.value,
                              }))
                            }}
                            disabled={!isEditing}
                            className="bg-white text-gray-900"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nationality">Nationality</Label>
                          <Input
                            id="nationality"
                            type="text"
                            value={profileData.nationality ?? ""}
                            onChange={(e) => {
                              setProfileData((prev) => ({
                                ...prev,
                                nationality: e.target.value,
                              }))
                            }}
                            placeholder="Indian"
                            disabled={!isEditing}
                            className="bg-white text-gray-900"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="college">
                            <GraduationCap className="w-4 h-4 inline mr-1" />
                            College/University
                          </Label>
                          <Input
                            id="college"
                            type="text"
                            value={profileData.college ?? ""}
                            onChange={(e) => {
                              const newValue = e.target.value
                              setProfileData((prev) => ({
                                ...prev,
                                college: newValue,
                              }))
                            }}
                            placeholder="Enter your college name"
                            disabled={!isEditing}
                            className="bg-white text-gray-900"
                            autoComplete="organization"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="email"
                              type="email"
                              value={profileData.email || user?.email || ""}
                              onChange={(e) => {
                                setProfileData((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }}
                              disabled={!isEditing}
                              className="pl-10 bg-white text-gray-900"
                              autoComplete="email"
                            />
                          </div>
                        </div>
                        <PhoneVerification
                          phone={profileData.phone}
                          onPhoneChange={(newPhone) => {
                            setProfileData((prev) => ({
                              ...prev,
                              phone: newPhone,
                            }))
                          }}
                          isEditing={isEditing}
                          phoneVerified={profileData.phoneVerified}
                          onVerificationComplete={() => {
                            // Refresh profile data to get updated verification status
                            fetchProfileData()
                          }}
                        />
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="address">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Address
                          </Label>
                          <Input
                            id="address"
                            type="text"
                            value={profileData.address ?? ""}
                            onChange={(e) => {
                              setProfileData((prev) => ({
                                ...prev,
                                address: e.target.value,
                              }))
                            }}
                            placeholder="Enter your address"
                            disabled={!isEditing}
                            className="bg-white text-gray-900"
                            autoComplete="street-address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            type="text"
                            value={profileData.city ?? ""}
                            onChange={(e) => {
                              setProfileData((prev) => ({
                                ...prev,
                                city: e.target.value,
                              }))
                            }}
                            placeholder="Enter city"
                            disabled={!isEditing}
                            className="bg-white text-gray-900"
                            autoComplete="address-level2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            type="text"
                            value={profileData.state ?? ""}
                            onChange={(e) => {
                              setProfileData((prev) => ({
                                ...prev,
                                state: e.target.value,
                              }))
                            }}
                            placeholder="Enter state"
                            disabled={!isEditing}
                            className="bg-white text-gray-900"
                            autoComplete="address-level1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pincode">PIN Code</Label>
                          <Input
                            id="pincode"
                            type="text"
                            value={profileData.pincode ?? ""}
                            onChange={(e) => {
                              setProfileData((prev) => ({
                                ...prev,
                                pincode: e.target.value,
                              }))
                            }}
                            placeholder="Enter PIN code"
                            disabled={!isEditing}
                            className="bg-white text-gray-900"
                            autoComplete="postal-code"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password Change Section */}
                    {showPasswordForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                              <Input
                                id="currentPassword"
                                type={showPassword ? "text" : "password"}
                                value={passwordForm.currentPassword}
                                onChange={(e) =>
                                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                                }
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) =>
                                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handlePasswordChange}
                              disabled={isSaving}
                              className="bg-orange-500 hover:bg-orange-600"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                "Update Password"
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowPasswordForm(false)
                                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  )
}
