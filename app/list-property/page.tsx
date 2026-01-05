"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { 
  Building2, Home, Users, MapPin, Sparkles, CheckCircle2, 
  ChevronRight, ChevronLeft, AlertCircle, Loader2, Star,
  Bed, Bath, Ruler, Calendar, IndianRupee, Shield, FileText,
  Wifi, Car, Utensils, Tv, AirVent, Dumbbell, Check, X,
  Clock, Phone, Mail, Camera, Video, Image as ImageIcon,
  TrendingUp, Award, Zap, Target, Lightbulb, Plus, User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import MapCoordinatePicker from "@/components/map-coordinate-picker"

// Property type options
const propertyTypes = [
  {
    id: "flat",
    title: "Flat/Apartment",
    description: "Independent flats & apartments for rent",
    icon: Building2,
    color: "orange",
    subtypes: [
      { id: "1bhk", label: "1 BHK", image: "/1bhk.jpg" },
      { id: "2bhk", label: "2 BHK", image: "/2bhk.png" },
      { id: "3bhk", label: "3 BHK", image: "/3bhk.png" },
      { id: "studio", label: "Studio Apartment", image: "/studio apartment.png" },
    ]
  },
  {
    id: "pg",
    title: "PG",
    description: "Paying Guest accommodations with facilities",
    icon: Home,
    color: "blue",
    subtypes: [
      { id: "boys-pg", label: "Boys PG", image: "/boys pg.png" },
      { id: "girls-pg", label: "Girls PG", image: "/girls pg.png" },
      { id: "unisex-pg", label: "Unisex PG", image: "/coliving pg.png" },
    ]
  }
]

// Tab configuration
const tabs = [
  { id: "type", label: "Property Type", icon: Building2, required: true },
  { id: "basic", label: "Basic Info", icon: FileText, required: true },
  { id: "location", label: "Location", icon: MapPin, required: true },
  { id: "details", label: "Property Details", icon: Home, required: true },
  { id: "amenities", label: "Amenities", icon: Star, required: true },
  { id: "rooms", label: "Rooms & Pricing", icon: Bed, required: true },
  { id: "media", label: "Photos & Videos", icon: Camera, required: true },
  { id: "policies", label: "House Rules", icon: Shield, required: true },
  { id: "financial", label: "Financial Details", icon: IndianRupee, required: true },
  { id: "preview", label: "Preview & Submit", icon: CheckCircle2, required: true },
]

// Amenities list
const amenitiesList = [
  { id: "wifi", label: "WiFi", icon: Wifi, category: "basic" },
  { id: "parking", label: "Parking", icon: Car, category: "basic" },
  { id: "ac", label: "Air Conditioning", icon: AirVent, category: "basic" },
  { id: "tv", label: "TV", icon: Tv, category: "basic" },
  { id: "kitchen", label: "Kitchen", icon: Utensils, category: "basic" },
  { id: "gym", label: "Gym", icon: Dumbbell, category: "premium" },
  { id: "laundry", label: "Laundry", icon: Target, category: "basic" },
  { id: "powerbackup", label: "Power Backup", icon: Zap, category: "basic" },
]

export default function ListPropertyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [currentTab, setCurrentTab] = useState(0)
  const [completedTabs, setCompletedTabs] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  // Form data state
  const [propertyData, setPropertyData] = useState<any>({
    propertyType: "",
    propertySubtype: "",
    title: "",
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    locality: "",
    nearbyColleges: [],
    amenities: [],
    rooms: [],
    images: [],
    coordinates: [0, 0], // Initialize as flat array [lng, lat]
    furnishing: "",
    propertyAge: "",
    carpetArea: "",
    floor: "",
    totalFloors: "",
    houseRules: {
      checkIn: "",
      checkOut: "",
      smokingAllowed: false,
      petsAllowed: false,
      guestsAllowed: false,
      partiesAllowed: false,
    },
    monthlyRent: "",
    feeStructure: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      const userRole = (session?.user as any)?.role
      if (userRole !== "owner" && userRole !== "admin") {
        // Double-check with the API to ensure role is correct
        fetch("/api/user/profile")
          .then(res => res.json())
          .then(data => {
            const actualRole = data.user?.role || "user"
            if (actualRole === "owner" || actualRole === "admin") {
              // Role mismatch - user is actually an owner, refresh session
              setUserProfile(data.user)
              // Continue to allow access
            } else {
              // User is really not an owner
              toast({
                title: "Access Denied",
                description: "You need to register as a property owner first.",
                variant: "destructive",
              })
              router.push("/register-property")
            }
          })
          .catch(() => {
            toast({
              title: "Access Denied",
              description: "You need to register as a property owner first.",
              variant: "destructive",
            })
            router.push("/register-property")
          })
      } else {
        // Fetch user profile data
        fetchUserProfile()
      }
    }
  }, [status, session, router])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        console.log("👤 User profile fetched:", data)
        setUserProfile(data.user) // Extract the user object from response
      } else {
        console.error("Failed to fetch profile:", response.status)
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
    }
  }

  // AI-powered suggestions
  const getAISuggestions = async (context: string, data: any) => {
    setLoadingAI(true)
    try {
      const response = await fetch("/api/ai/property-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, data }),
      })

      if (response.ok) {
        const suggestions = await response.json()
        setAiSuggestions(suggestions)
      }
    } catch (error) {
      console.error("AI suggestions error:", error)
    } finally {
      setLoadingAI(false)
    }
  }

  const handleNext = () => {
    // Validate current tab
    const isValid = validateCurrentTab()
    if (isValid) {
      if (!completedTabs.includes(currentTab)) {
        setCompletedTabs([...completedTabs, currentTab])
      }
      if (currentTab < tabs.length - 1) {
        setCurrentTab(currentTab + 1)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }
  }

  const handleBack = () => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const validateCurrentTab = () => {
    const tab = tabs[currentTab]
    
    switch (tab.id) {
      case "type":
        if (!propertyData.propertyType || !propertyData.propertySubtype) {
          toast({
            title: "⚠️ Property Type Required",
            description: "Please select both property type and subtype before proceeding",
            variant: "destructive",
          })
          return false
        }
        return true
      
      case "basic":
        // Title validation
        if (!propertyData.title || propertyData.title.trim().length < 10) {
          toast({
            title: "⚠️ Title Required",
            description: "Please enter a property title (minimum 10 characters)",
            variant: "destructive",
          })
          return false
        }
        
        // Description validation
        if (!propertyData.description || propertyData.description.trim().length < 50) {
          toast({
            title: "⚠️ Description Required",
            description: "Please enter a detailed description (minimum 50 characters)",
            variant: "destructive",
          })
          return false
        }
        
        return true
      
      case "location":
        if (!propertyData.address || propertyData.address.trim().length < 10) {
          toast({
            title: "⚠️ Address Required",
            description: "Please enter complete address with landmark",
            variant: "destructive",
          })
          return false
        }
        
        if (!propertyData.city || propertyData.city.trim().length < 2) {
          toast({
            title: "⚠️ City Required",
            description: "Please enter the city name",
            variant: "destructive",
          })
          return false
        }
        
        if (!propertyData.state || propertyData.state.trim().length < 2) {
          toast({
            title: "⚠️ State Required",
            description: "Please enter the state name",
            variant: "destructive",
          })
          return false
        }
        
        if (!propertyData.pincode || propertyData.pincode.length !== 6) {
          toast({
            title: "⚠️ Pincode Required",
            description: "Please enter a valid 6-digit pincode",
            variant: "destructive",
          })
          return false
        }
        
        return true
      
      case "details":
        if (!propertyData.furnishing) {
          toast({
            title: "⚠️ Furnishing Status Required",
            description: "Please select the furnishing status",
            variant: "destructive",
          })
          return false
        }
        
        if (!propertyData.propertyAge) {
          toast({
            title: "⚠️ Property Age Required",
            description: "Please select the property age",
            variant: "destructive",
          })
          return false
        }
        
        // For flats, validate additional fields
        if (propertyData.propertyType === "flat") {
          if (!propertyData.carpetArea || propertyData.carpetArea <= 0) {
            toast({
              title: "⚠️ Carpet Area Required",
              description: "Please enter the carpet area in square feet",
              variant: "destructive",
            })
            return false
          }
        }
        
        return true
      
      case "amenities":
        if (!propertyData.amenities || propertyData.amenities.length < 3) {
          toast({
            title: "⚠️ Amenities Required",
            description: "Please select at least 3 amenities available at your property",
            variant: "destructive",
          })
          return false
        }
        return true
      
      case "rooms":
        if (!propertyData.rooms || propertyData.rooms.length === 0) {
          toast({
            title: "⚠️ Room Details Required",
            description: "Please add at least one room type with pricing",
            variant: "destructive",
          })
          return false
        }
        
        // Validate each room
        for (let i = 0; i < propertyData.rooms.length; i++) {
          const room = propertyData.rooms[i]
          
          if (!room.type) {
            toast({
              title: `⚠️ Room #${i + 1} - Type Missing`,
              description: "Please select the room type",
              variant: "destructive",
            })
            return false
          }
          
          if (!room.price || room.price <= 0) {
            toast({
              title: `⚠️ Room #${i + 1} - Price Missing`,
              description: "Please enter the monthly rent",
              variant: "destructive",
            })
            return false
          }
          
          if (!room.available || room.available <= 0) {
            toast({
              title: `⚠️ Room #${i + 1} - Availability Missing`,
              description: "Please enter number of available rooms",
              variant: "destructive",
            })
            return false
          }
        }
        
        return true
      
      case "media":
        if (!propertyData.images || propertyData.images.length === 0) {
          toast({
            title: "⚠️ Property Photos Required",
            description: "Please upload at least 3 photos of your property",
            variant: "destructive",
          })
          return false
        }
        
        if (propertyData.images.length < 3) {
          toast({
            title: "⚠️ More Photos Needed",
            description: `You've uploaded ${propertyData.images.length} photo(s). Please upload at least 3 photos`,
            variant: "destructive",
          })
          return false
        }
        
        return true
      
      case "policies":
        if (!propertyData.houseRules?.checkIn) {
          toast({
            title: "⚠️ Check-in Time Required",
            description: "Please set the check-in time",
            variant: "destructive",
          })
          return false
        }
        
        if (!propertyData.houseRules?.checkOut) {
          toast({
            title: "⚠️ Check-out Time Required",
            description: "Please set the check-out time",
            variant: "destructive",
          })
          return false
        }
        
        return true
      
      case "financial":
        if (!propertyData.monthlyRent || propertyData.monthlyRent <= 0) {
          toast({
            title: "⚠️ Monthly Rent Required",
            description: "Please enter the monthly rent amount",
            variant: "destructive",
          })
          return false
        }
        
        return true
      
      case "preview":
        // Final validation before submit
        return true
      
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      // Transform propertyData to match the Property model schema
      const transformedData = {
        // Basic Info
        title: propertyData.title,
        description: propertyData.description,
        
        // Property Type Mapping
        type: propertyData.propertyType === "flat" ? "Flat" : "PG",
        
        // Gender Mapping (for PG properties)
        gender: propertyData.propertyType === "pg" 
          ? (propertyData.propertySubtype === "boys-pg" ? "Male" 
             : propertyData.propertySubtype === "girls-pg" ? "Female" 
             : "Unisex")
          : "Unisex", // Default for flats
        
        // Location
        address: propertyData.address,
        location: `${propertyData.city}, ${propertyData.state}`,
        coordinates: {
          type: "Point",
          coordinates: propertyData.coordinates || [0, 0] // Use picked coordinates from map
        },
        
        // Pricing
        price: parseInt(propertyData.monthlyRent) || 0,
        feeStructure: propertyData.feeStructure || "",
        
        // Images - Extract just URLs (placeholder for now)
        images: propertyData.images?.map((img: any) => img.url || img) || [
          "/placeholder.jpg",
          "/placeholder.jpg",
          "/placeholder.jpg"
        ],
        
        // Amenities
        amenities: propertyData.amenities || [],
        
        // House Rules
        rules: [
          propertyData.houseRules?.checkIn ? `Check-in: ${propertyData.houseRules.checkIn}` : "",
          propertyData.houseRules?.checkOut ? `Check-out: ${propertyData.houseRules.checkOut}` : "",
          propertyData.houseRules?.smokingAllowed ? "Smoking allowed" : "No smoking",
          propertyData.houseRules?.petsAllowed ? "Pets allowed" : "No pets",
          propertyData.houseRules?.guestsAllowed ? "Guests allowed" : "No guests",
          propertyData.houseRules?.partiesAllowed ? "Parties allowed" : "No parties"
        ].filter(Boolean),
        
        // Room Types
        roomTypes: propertyData.rooms?.map((room: any) => ({
          type: room.type || "single",
          price: parseInt(room.price) || 0,
          available: parseInt(room.available) || 0
        })) || [],
        
        // Distances (optional fields)
        distance: {
          college: 0,
          hospital: 0,
          busStop: 0,
          metro: 0
        },
        
        // Nearby Places (optional)
        nearbyPlaces: {
          messes: [],
          restaurants: [],
          hospitals: [],
          transport: []
        },
        
        // Nearby Colleges
        nearbyColleges: propertyData.nearbyColleges || [],
        
        // Owner is automatically set from session in the API
        // Contact info comes from user's profile
      }

      console.log("📤 Submitting transformed property data:", transformedData)

      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedData),
      })

      const result = await response.json()

      if (response.ok) {
        // Check if property was auto-approved by AI
        if (result.status === "approved" && result.verifiedBy === "AI") {
          toast({
            title: "🎉 Property Verified & Live!",
            description: result.message || "Your property has been verified by AI and is now live on Second Home!",
            duration: 6000,
          })
        } else if (result.aiVerification) {
          // Show AI verification details
          const aiScore = result.aiVerification.score || 0
          const scoreEmoji = aiScore >= 70 ? "✅" : aiScore >= 50 ? "⚠️" : "🔍"
          
          toast({
            title: `${scoreEmoji} Property Submitted`,
            description: `${result.message} (AI Score: ${aiScore}/100)`,
            duration: 5000,
          })
        } else {
          toast({
            title: "Success!",
            description: result.message || "Your property has been submitted for review",
          })
        }
        
        // Redirect to profile after 2 seconds
        setTimeout(() => {
          router.push("/profile?tab=properties")
        }, 2000)
      } else {
        console.error("❌ Server error:", result)
        throw new Error(result.error || "Failed to submit property")
      }
    } catch (error: any) {
      console.error("❌ Submission error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit property. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">List Your Property</h1>
              <p className="text-sm text-gray-600">Complete all steps to list your property</p>
            </div>
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Step {currentTab + 1} of {tabs.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Tabs */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-4">
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              const isCompleted = completedTabs.includes(index)
              const isCurrent = currentTab === index
              const isAccessible = index === 0 || completedTabs.includes(index - 1)

              return (
                <button
                  key={tab.id}
                  onClick={() => isAccessible && setCurrentTab(index)}
                  disabled={!isAccessible}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all whitespace-nowrap",
                    isCurrent && "border-orange-500 bg-orange-50",
                    isCompleted && !isCurrent && "border-green-500 bg-green-50",
                    !isCurrent && !isCompleted && !isAccessible && "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed",
                    !isCurrent && !isCompleted && isAccessible && "border-gray-300 hover:border-gray-400"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Icon className={cn(
                      "w-5 h-5",
                      isCurrent ? "text-orange-600" : "text-gray-600"
                    )} />
                  )}
                  <span className={cn(
                    "font-medium text-sm",
                    isCurrent && "text-orange-600",
                    isCompleted && !isCurrent && "text-green-600",
                    !isCurrent && !isCompleted && "text-gray-600"
                  )}>
                    {tab.label}
                  </span>
                  {tab.required && (
                    <span className="text-red-500 text-xs">*</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Tab Content */}
              {currentTab === 0 && <PropertyTypeTab propertyData={propertyData} setPropertyData={setPropertyData} />}
              {currentTab === 1 && <BasicInfoTab propertyData={propertyData} setPropertyData={setPropertyData} loadingAI={loadingAI} getAISuggestions={getAISuggestions} aiSuggestions={aiSuggestions} userProfile={userProfile} />}
              {currentTab === 2 && <LocationTab propertyData={propertyData} setPropertyData={setPropertyData} />}
              {currentTab === 3 && <PropertyDetailsTab propertyData={propertyData} setPropertyData={setPropertyData} />}
              {currentTab === 4 && <AmenitiesTab propertyData={propertyData} setPropertyData={setPropertyData} />}
              {currentTab === 5 && <RoomsTab propertyData={propertyData} setPropertyData={setPropertyData} />}
              {currentTab === 6 && <MediaTab propertyData={propertyData} setPropertyData={setPropertyData} />}
              {currentTab === 7 && <PoliciesTab propertyData={propertyData} setPropertyData={setPropertyData} />}
              {currentTab === 8 && <FinancialTab propertyData={propertyData} setPropertyData={setPropertyData} />}
              {currentTab === 9 && <PreviewTab propertyData={propertyData} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentTab === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentTab < tabs.length - 1 ? (
              <Button
                onClick={handleNext}
                className="bg-orange-500 hover:bg-orange-600 gap-2"
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying with AI...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Property
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Property Type Selection Tab
function PropertyTypeTab({ propertyData, setPropertyData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-orange-500" />
          Choose Property Type
        </CardTitle>
        <CardDescription>Select the type of property you want to list</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Property Type */}
        <div className="grid md:grid-cols-2 gap-4">
          {propertyTypes.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => setPropertyData({ ...propertyData, propertyType: type.id, propertySubtype: "" })}
                className={cn(
                  "p-6 rounded-xl border-2 transition-all text-left hover:shadow-lg",
                  propertyData.propertyType === type.id
                    ? "border-orange-500 bg-orange-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-lg",
                    propertyData.propertyType === type.id ? "bg-orange-500" : "bg-gray-100"
                  )}>
                    <Icon className={cn(
                      "w-8 h-8",
                      propertyData.propertyType === type.id ? "text-white" : "text-gray-600"
                    )} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{type.title}</h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                  {propertyData.propertyType === type.id && (
                    <CheckCircle2 className="w-6 h-6 text-orange-500" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Subtype Selection */}
        {propertyData.propertyType && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              <span className="text-sm font-medium text-gray-600">Select Category</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {propertyTypes
                .find((t) => t.id === propertyData.propertyType)
                ?.subtypes.map((subtype) => (
                  <button
                    key={subtype.id}
                    onClick={() => setPropertyData({ ...propertyData, propertySubtype: subtype.id })}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all hover:shadow-md overflow-hidden group",
                      propertyData.propertySubtype === subtype.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="relative w-full h-20 mb-3 rounded-lg overflow-hidden">
                      <Image
                        src={subtype.image}
                        alt={subtype.label}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="font-medium text-sm text-gray-900">{subtype.label}</div>
                  </button>
                ))}
            </div>
          </motion.div>
        )}

        {/* AI Insight */}
        {propertyData.propertyType && propertyData.propertySubtype && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-900 mb-1">AI Insight</h4>
                <p className="text-sm text-purple-800">
                  {(() => {
                    const subtype = propertyData.propertySubtype
                    if (subtype === '1bhk') return 'Great choice! 1 BHK apartments are perfect for single students or young professionals. Highlight proximity to colleges, public transport, and essential amenities to attract tenants.'
                    if (subtype === '2bhk') return 'Excellent! 2 BHK apartments are highly sought after by students who want to share costs. Emphasize spacious rooms, study areas, and reliable WiFi to appeal to students.'
                    if (subtype === '3bhk') return 'Perfect! 3 BHK apartments are ideal for groups of students looking to share. Highlight multiple bathrooms, common areas, and nearby educational institutions to maximize interest.'
                    if (subtype === 'studio') return 'Smart choice! Studio apartments are trending among students seeking independence and modern living. Focus on compact design, modern amenities, and affordability to stand out.'
                    if (subtype === 'boys-pg') return 'Great option! Boys PG accommodations are always in demand near colleges. Emphasize security, meal facilities, WiFi, and proximity to educational institutions for better reach.'
                    if (subtype === 'girls-pg') return 'Excellent choice! Girls PG properties with strong safety features are highly valued. Highlight 24/7 security, CCTV, female staff, safe neighborhood, and proximity to colleges.'
                    if (subtype === 'unisex-pg') return 'Modern choice! Co-living PG spaces are popular among students seeking community living. Showcase shared facilities, social spaces, professional management, and inclusive environment.'
                    return 'Great choice! This property type is in high demand. Make sure to highlight safety features, nearby colleges, and amenities to attract more tenants.'
                  })()}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

// Basic Info Tab
function BasicInfoTab({ propertyData, setPropertyData, loadingAI, getAISuggestions, aiSuggestions, userProfile }: any) {
  const [showAIHelper, setShowAIHelper] = useState(false)

  const beautifyDescription = async () => {
    if (!propertyData.description || propertyData.description.trim().length < 20) {
      alert("Please write at least 20 characters about your property first, then AI will beautify it!")
      return
    }
    await getAISuggestions("beautify", { 
      ...propertyData, 
      userDescription: propertyData.description 
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-orange-500" />
          Basic Information
        </CardTitle>
        <CardDescription>Provide essential details about your property</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Property Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-base font-semibold">
            Property Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g., Spacious 2BHK Near IIT Delhi with Modern Amenities"
            value={propertyData.title}
            onChange={(e) => setPropertyData({ ...propertyData, title: e.target.value })}
            className="text-base"
          />
          <p className="text-xs text-gray-500">
            Create a catchy title that highlights key features of your property
          </p>
        </div>

        {/* Property Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-base font-semibold">
              Property Description <span className="text-red-500">*</span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={beautifyDescription}
              disabled={loadingAI || !propertyData.description || propertyData.description.trim().length < 20}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1"
            >
              <Sparkles className="w-4 h-4" />
              {loadingAI ? "Beautifying..." : "AI Beautify"}
            </Button>
          </div>
          <Textarea
            id="description"
            placeholder="Write in simple words: This property is near [college name], has [number] rooms, [amenities], good for students..."
            value={propertyData.description}
            onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })}
            rows={6}
            className="text-base resize-none"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Write in simple words, then click "AI Beautify"
            </span>
            <span className={cn(
              "font-medium",
              propertyData.description?.length >= 100 ? "text-green-600" : "text-gray-400"
            )}>
              {propertyData.description?.length || 0}/1000
            </span>
          </div>

          {/* AI Beautified Result */}
          {aiSuggestions?.context === "beautify" && aiSuggestions?.suggestions && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  AI Beautified Version
                </h4>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setPropertyData({ ...propertyData, description: aiSuggestions.suggestions })
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Use This
                </Button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded border border-purple-100">
                {aiSuggestions.suggestions}
              </p>
              <p className="text-xs text-purple-600">
                You can edit this further or use it as is!
              </p>
            </div>
          )}
        </div>

        {/* Contact Details - Auto-filled from Profile */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-start gap-3 mb-3">
            <User className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 mb-1">Contact Information</h4>
              <p className="text-sm text-green-800">
                This information is automatically taken from your profile. Students will use this to contact you.
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Contact Person Name
              </Label>
              <div className="bg-white rounded-md border border-gray-200 px-3 py-2 text-gray-700">
                {userProfile?.name || "Loading..."}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Contact Phone
              </Label>
              <div className="bg-white rounded-md border border-gray-200 px-3 py-2 text-gray-700">
                {userProfile?.phone || "Not set in profile"}
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <Label className="text-sm font-medium text-gray-700">
              Contact Email
            </Label>
            <div className="bg-white rounded-md border border-gray-200 px-3 py-2 text-gray-700">
              {userProfile?.email || "Loading..."}
            </div>
          </div>

          {(!userProfile?.phone) && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Phone number not set in profile. 
                <a href="/profile" className="underline font-medium hover:text-yellow-900">Update your profile</a> to add it.
              </p>
            </div>
          )}
        </div>

        {/* AI Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                Pro Tips for Description
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Write in simple words</strong> - AI will make it professional!</li>
                <li>• Mention: nearby colleges, metro, markets, bus stops</li>
                <li>• Include: room features, attached bathroom, balcony</li>
                <li>• Add: safety features, WiFi, parking, amenities</li>
                <li>• Be honest - AI will beautify it while keeping accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Location Tab (placeholder for now - will be expanded)
function LocationTab({ propertyData, setPropertyData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-orange-500" />
          Location Details
        </CardTitle>
        <CardDescription>Help students find your property easily</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="address">Full Address <span className="text-red-500">*</span></Label>
          <Textarea
            id="address"
            placeholder="Enter complete address with landmark"
            value={propertyData.address}
            onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
            rows={3}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
            <Input
              id="city"
              placeholder="e.g., Delhi"
              value={propertyData.city}
              onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
            <Input
              id="state"
              placeholder="e.g., Delhi"
              value={propertyData.state}
              onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pincode">Pincode <span className="text-red-500">*</span></Label>
            <Input
              id="pincode"
              placeholder="e.g., 110001"
              value={propertyData.pincode}
              onChange={(e) => setPropertyData({ ...propertyData, pincode: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locality">Locality/Area</Label>
          <Input
            id="locality"
            placeholder="e.g., Hauz Khas, South Campus"
            value={propertyData.locality}
            onChange={(e) => setPropertyData({ ...propertyData, locality: e.target.value })}
          />
        </div>

        {/* Map Coordinate Picker */}
        <div className="border-t pt-6">
          <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 flex items-start gap-2">
              <span className="text-blue-600 font-semibold">💡 Tip:</span>
              <span>Fill in your complete address, city, and state. Then click "Find on Map" - it will search for your full address first! You can drag the marker to fine-tune the exact location.</span>
            </p>
          </div>
          <MapCoordinatePicker
            coordinates={propertyData.coordinates}
            address={propertyData.address}
            city={propertyData.city}
            state={propertyData.state}
            onCoordinatesChange={(coords) => {
              // Only update coordinates, preserve all other fields including address, city, state
              setPropertyData((prev: any) => ({ ...prev, coordinates: coords }))
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Property Details Tab (placeholder)
function PropertyDetailsTab({ propertyData, setPropertyData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-6 h-6 text-orange-500" />
          Property Details
        </CardTitle>
        <CardDescription>Specify property specifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Furnishing Status</Label>
            <Select
              value={propertyData.furnishing}
              onValueChange={(value) => setPropertyData({ ...propertyData, furnishing: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select furnishing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fully-furnished">Fully Furnished</SelectItem>
                <SelectItem value="semi-furnished">Semi Furnished</SelectItem>
                <SelectItem value="unfurnished">Unfurnished</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Property Age</Label>
            <Select
              value={propertyData.propertyAge}
              onValueChange={(value) => setPropertyData({ ...propertyData, propertyAge: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select age" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Less than 1 year</SelectItem>
                <SelectItem value="1-3">1-3 years</SelectItem>
                <SelectItem value="3-5">3-5 years</SelectItem>
                <SelectItem value="5+">5+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {propertyData.propertyType === "flat" && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Carpet Area (sq ft)</Label>
              <Input
                type="number"
                placeholder="e.g., 600"
                value={propertyData.carpetArea}
                onChange={(e) => setPropertyData({ ...propertyData, carpetArea: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Floor Number</Label>
              <Input
                type="number"
                placeholder="e.g., 2"
                value={propertyData.floor}
                onChange={(e) => setPropertyData({ ...propertyData, floor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Total Floors</Label>
              <Input
                type="number"
                placeholder="e.g., 4"
                value={propertyData.totalFloors}
                onChange={(e) => setPropertyData({ ...propertyData, totalFloors: e.target.value })}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Amenities Tab
function AmenitiesTab({ propertyData, setPropertyData }: any) {
  const toggleAmenity = (amenityId: string) => {
    const current = propertyData.amenities || []
    if (current.includes(amenityId)) {
      setPropertyData({ ...propertyData, amenities: current.filter((a: string) => a !== amenityId) })
    } else {
      setPropertyData({ ...propertyData, amenities: [...current, amenityId] })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-6 h-6 text-orange-500" />
          Amenities & Facilities
        </CardTitle>
        <CardDescription>Select all amenities available at your property</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {amenitiesList.map((amenity) => {
            const Icon = amenity.icon
            const isSelected = propertyData.amenities?.includes(amenity.id)

            return (
              <button
                key={amenity.id}
                onClick={() => toggleAmenity(amenity.id)}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all hover:shadow-md",
                  isSelected
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Icon className={cn(
                  "w-6 h-6 mb-2 mx-auto",
                  isSelected ? "text-orange-600" : "text-gray-600"
                )} />
                <div className="text-sm font-medium text-gray-900">{amenity.label}</div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-orange-600 mx-auto mt-2" />
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Rooms Tab (placeholder)
function RoomsTab({ propertyData, setPropertyData }: any) {
  const [rooms, setRooms] = useState(propertyData.rooms || [])

  const roomTypes = [
    { id: "single", label: "Single Sharing", icon: "🛏️" },
    { id: "double", label: "Double Sharing", icon: "🛏️🛏️" },
    { id: "triple", label: "Triple Sharing", icon: "🛏️🛏️🛏️" },
    { id: "four", label: "Four Sharing", icon: "🛏️🛏️🛏️🛏️" },
  ]

  const addRoom = () => {
    const newRoom = {
      id: Date.now(),
      type: "",
      price: "",
      available: "",
      features: []
    }
    const updatedRooms = [...rooms, newRoom]
    setRooms(updatedRooms)
    setPropertyData({ ...propertyData, rooms: updatedRooms })
  }

  const removeRoom = (id: number) => {
    const updatedRooms = rooms.filter((room: any) => room.id !== id)
    setRooms(updatedRooms)
    setPropertyData({ ...propertyData, rooms: updatedRooms })
  }

  const updateRoom = (id: number, field: string, value: any) => {
    const updatedRooms = rooms.map((room: any) => 
      room.id === id ? { ...room, [field]: value } : room
    )
    setRooms(updatedRooms)
    setPropertyData({ ...propertyData, rooms: updatedRooms })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bed className="w-6 h-6 text-orange-500" />
          Rooms & Pricing
        </CardTitle>
        <CardDescription>Define room types and pricing for your property</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Type Info */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Add Your Room Types</h4>
              <p className="text-sm text-blue-800">
                List all room types available in your property with their monthly rent and availability
              </p>
            </div>
          </div>
        </div>

        {/* Room List */}
        {rooms.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Bed className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No rooms added yet</p>
            <Button onClick={addRoom} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Add First Room Type
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room: any, index: number) => (
              <Card key={room.id} className="border-2 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Room Type #{index + 1}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRoom(room.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Room Type */}
                    <div className="space-y-2">
                      <Label>Room Type <span className="text-red-500">*</span></Label>
                      <select
                        value={room.type}
                        onChange={(e) => updateRoom(room.id, "type", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select Type</option>
                        {roomTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Monthly Rent */}
                    <div className="space-y-2">
                      <Label>Monthly Rent <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <Input
                          type="number"
                          placeholder="e.g., 8000"
                          value={room.price}
                          onChange={(e) => updateRoom(room.id, "price", e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    {/* Available Rooms */}
                    <div className="space-y-2">
                      <Label>Available Rooms <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        placeholder="e.g., 5"
                        value={room.available}
                        onChange={(e) => updateRoom(room.id, "available", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add More Button */}
            <Button
              variant="outline"
              onClick={addRoom}
              className="w-full border-dashed border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Room Type
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Media Tab - Photo Upload
function MediaTab({ propertyData, setPropertyData }: any) {
  const [images, setImages] = useState(propertyData.images || [])
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)

    try {
      const newImages = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`)
          continue
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum size is 5MB`)
          continue
        }

        // Upload via our API route (which handles Cloudinary)
        const formData = new FormData()
        formData.append('file', file)

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Upload failed')
          }

          const data = await response.json()
          
          newImages.push({
            id: Date.now() + i,
            url: data.url,
            file: file,
            name: file.name
          })
        } catch (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError)
          alert(`Failed to upload ${file.name}. Please try again.`)
        }
      }

      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages]
        setImages(updatedImages)
        setPropertyData({ ...propertyData, images: updatedImages })
      }
      
    } catch (error) {
      alert('Error uploading images. Please try again.')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (id: number) => {
    const updatedImages = images.filter((img: any) => img.id !== id)
    setImages(updatedImages)
    setPropertyData({ ...propertyData, images: updatedImages })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-6 h-6 text-orange-500" />
          Photos & Videos
        </CardTitle>
        <CardDescription>
          Upload property photos (Minimum 3 photos required) <span className="text-red-500">*</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Banner */}
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-start gap-3">
            <Camera className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-900 mb-1">📸 Photo Guidelines</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Upload clear, well-lit photos of your property</li>
                <li>• Show rooms, bathrooms, kitchen, common areas</li>
                <li>• Include exterior and entrance photos</li>
                <li>• Maximum file size: 5MB per image</li>
                <li>• Minimum 3 photos required</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-orange-500 hover:bg-orange-50 transition-all"
          >
            {uploadingImage ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-3" />
                <p className="text-gray-600">Uploading images...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-900 font-medium mb-1">Click to upload images</p>
                <p className="text-sm text-gray-500">or drag and drop</p>
                <p className="text-xs text-gray-400 mt-2">PNG, JPG, JPEG up to 5MB</p>
              </div>
            )}
          </button>
        </div>

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                Uploaded Photos ({images.length})
              </h3>
              {images.length < 3 && (
                <p className="text-sm text-red-600">
                  {3 - images.length} more photo(s) needed
                </p>
              )}
              {images.length >= 3 && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Requirements met!
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image: any, index: number) => (
                <div key={image.id} className="relative group">
                  <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={image.url}
                      alt={`Property ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                        Cover Photo
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Policies Tab (placeholder)
function PoliciesTab({ propertyData, setPropertyData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-orange-500" />
          House Rules & Policies
        </CardTitle>
        <CardDescription>Set rules and policies for your property</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Check-in Time</Label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="checkInAnytime"
                checked={propertyData.houseRules?.checkIn === "anytime"}
                onChange={(e) => setPropertyData({
                  ...propertyData,
                  houseRules: { 
                    ...propertyData.houseRules, 
                    checkIn: e.target.checked ? "anytime" : "" 
                  }
                })}
                className="rounded border-gray-300"
              />
              <label htmlFor="checkInAnytime" className="text-sm text-gray-600">Anytime</label>
            </div>
            <Input
              type="time"
              value={propertyData.houseRules?.checkIn === "anytime" ? "" : propertyData.houseRules?.checkIn || ""}
              onChange={(e) => setPropertyData({
                ...propertyData,
                houseRules: { ...propertyData.houseRules, checkIn: e.target.value }
              })}
              disabled={propertyData.houseRules?.checkIn === "anytime"}
              className={propertyData.houseRules?.checkIn === "anytime" ? "opacity-50" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Check-out Time</Label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="checkOutAnytime"
                checked={propertyData.houseRules?.checkOut === "anytime"}
                onChange={(e) => setPropertyData({
                  ...propertyData,
                  houseRules: { 
                    ...propertyData.houseRules, 
                    checkOut: e.target.checked ? "anytime" : "" 
                  }
                })}
                className="rounded border-gray-300"
              />
              <label htmlFor="checkOutAnytime" className="text-sm text-gray-600">Anytime</label>
            </div>
            <Input
              type="time"
              value={propertyData.houseRules?.checkOut === "anytime" ? "" : propertyData.houseRules?.checkOut || ""}
              onChange={(e) => setPropertyData({
                ...propertyData,
                houseRules: { ...propertyData.houseRules, checkOut: e.target.value }
              })}
              disabled={propertyData.houseRules?.checkOut === "anytime"}
              className={propertyData.houseRules?.checkOut === "anytime" ? "opacity-50" : ""}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Stay Duration Preference (optional)</Label>
          <Input
            type="text"
            placeholder="e.g., Minimum 3 months, Semester/Academic year only"
            value={propertyData.houseRules?.stayDuration || ""}
            onChange={(e) => setPropertyData({
              ...propertyData,
              houseRules: { ...propertyData.houseRules, stayDuration: e.target.value }
            })}
          />
          <p className="text-xs text-gray-500">Specify preferred duration for tenant stays (e.g., minimum stay period, semester-based, etc.)</p>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">Allowed Policies</Label>
          {[
            { id: "smokingAllowed", label: "Smoking Allowed" },
            { id: "petsAllowed", label: "Pets Allowed" },
            { id: "guestsAllowed", label: "Guests Allowed" },
            { id: "partiesAllowed", label: "Parties Allowed" },
          ].map((policy) => (
            <div key={policy.id} className="flex items-center gap-3">
              <Checkbox
                id={policy.id}
                checked={propertyData.houseRules?.[policy.id]}
                onCheckedChange={(checked) => setPropertyData({
                  ...propertyData,
                  houseRules: { ...propertyData.houseRules, [policy.id]: checked }
                })}
              />
              <Label htmlFor={policy.id} className="cursor-pointer">{policy.label}</Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Financial Tab (placeholder)
function FinancialTab({ propertyData, setPropertyData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="w-6 h-6 text-orange-500" />
          Financial Details
        </CardTitle>
        <CardDescription>Set pricing and payment terms</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Monthly Rent <span className="text-red-500">*</span></Label>
          <Input
            type="number"
            placeholder="e.g., 15000"
            value={propertyData.monthlyRent}
            onChange={(e) => setPropertyData({ ...propertyData, monthlyRent: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Fee Structure & Payment Terms</Label>
          <textarea
            className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
            placeholder="Describe your complete fee structure here...\n\nExample:\n• Security Deposit: ₹30,000 (refundable)\n• Maintenance: ₹2,000/month\n• Electricity: Extra as per usage\n• First 6 months rent in advance required\n• Minimum stay: 11 months\n• Notice period: 1 month"
            value={propertyData.feeStructure}
            onChange={(e) => setPropertyData({ ...propertyData, feeStructure: e.target.value })}
          />
          <p className="text-xs text-gray-500">Provide detailed information about security deposit, maintenance charges, electricity, advance payments, notice period, and any other fees or payment terms.</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Preview Tab (placeholder)
function PreviewTab({ propertyData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-orange-500" />
          Review & Submit
        </CardTitle>
        <CardDescription>Review your property details before submitting</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* AI Verification Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  🤖 AI-Powered Verification
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">NEW</span>
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  Your property will be instantly analyzed by SecondHome AI for authenticity and quality.
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> High-quality listings get approved instantly
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">✓</span> AI checks pricing, details, and authenticity
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">✓</span> Manual review if needed (within 24 hours)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div>
              <span className="text-sm text-gray-600">Property Type:</span>
              <p className="font-semibold">{propertyData.propertyType} - {propertyData.propertySubtype}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Title:</span>
              <p className="font-semibold">{propertyData.title || "Not provided"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Location:</span>
              <p className="font-semibold">{propertyData.city || "Not provided"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Monthly Rent:</span>
              <p className="font-semibold">₹{propertyData.monthlyRent || "0"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
