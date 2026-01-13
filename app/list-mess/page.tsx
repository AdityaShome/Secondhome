"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { MessLocationMap } from "@/components/mess-location-map"
import {
  Building2, FileText, MapPin, UtensilsCrossed, IndianRupee, Camera, CheckCircle2, 
  Clock, Truck, Users, Phone, Mail, Plus, X, Loader2, ArrowLeft, ArrowRight
} from "lucide-react"

const tabs = [
  { id: "basic", label: "Basic Info", icon: Building2, required: true },
  { id: "location", label: "Location", icon: MapPin, required: true },
  { id: "pricing", label: "Pricing & Delivery", icon: IndianRupee, required: true },
  { id: "meals", label: "Meals & Menu", icon: UtensilsCrossed, required: true },
  { id: "media", label: "Photos", icon: Camera, required: true },
  { id: "contact", label: "Contact Details", icon: Phone, required: true },
  { id: "preview", label: "Preview & Submit", icon: CheckCircle2, required: true },
]

const dietOptions = ["Pure Veg", "Veg & Non-Veg", "Jain", "Vegan"]
const mealTypeOptions = ["Breakfast", "Lunch", "Dinner", "Snacks"]
const cuisineOptions = ["North Indian", "South Indian", "Chinese", "Continental", "Mix"]
const amenitiesOptions = ["AC", "WiFi", "Sitting Area", "Clean Washroom", "Parking", "Water Purifier"]

export default function ListMessPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentTab, setCurrentTab] = useState(0)
  const [completedTabs, setCompletedTabs] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [messData, setMessData] = useState<any>({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    coordinates: [0, 0],
    monthlyPrice: "",
    dailyPrice: "",
    trialDays: "0",
    homeDeliveryAvailable: false,
    deliveryRadius: "0",
    deliveryCharges: "0",
    packagingAvailable: false,
    packagingPrice: "0",
    dietTypes: [],
    mealTypes: [],
    cuisineTypes: [],
    breakfastTime: "",
    lunchTime: "",
    dinnerTime: "",
    amenities: [],
    capacity: "",
    images: [],
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const handleNext = () => {
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
      case "basic":
        if (!messData.name || messData.name.length < 3) {
          toast({ title: "Error", description: "Please enter a valid mess name (min 3 characters)", variant: "destructive" })
          return false
        }
        if (!messData.description || messData.description.length < 20) {
          toast({ title: "Error", description: "Please provide a detailed description (min 20 characters)", variant: "destructive" })
          return false
        }
        return true

      case "location":
        if (!messData.address || !messData.city || !messData.state || !messData.pincode) {
          toast({ title: "Error", description: "Please fill in all location fields", variant: "destructive" })
          return false
        }
        if (messData.pincode.length !== 6) {
          toast({ title: "Error", description: "Please enter a valid 6-digit pincode", variant: "destructive" })
          return false
        }
        return true

      case "pricing":
        if (!messData.monthlyPrice || parseFloat(messData.monthlyPrice) < 1000) {
          toast({ title: "Error", description: "Monthly price must be at least ₹1000", variant: "destructive" })
          return false
        }
        if (messData.homeDeliveryAvailable && parseFloat(messData.deliveryRadius) === 0) {
          toast({ title: "Error", description: "Please specify delivery radius if home delivery is available", variant: "destructive" })
          return false
        }
        if (messData.homeDeliveryAvailable && messData.packagingAvailable && parseFloat(messData.packagingPrice || "0") <= 0) {
          toast({ title: "Error", description: "Please enter a valid packaging price", variant: "destructive" })
          return false
        }
        return true

      case "meals":
        if (messData.dietTypes.length === 0) {
          toast({ title: "Error", description: "Please select at least one diet type", variant: "destructive" })
          return false
        }
        if (messData.mealTypes.length === 0) {
          toast({ title: "Error", description: "Please select at least one meal type", variant: "destructive" })
          return false
        }
        if (!messData.breakfastTime && !messData.lunchTime && !messData.dinnerTime) {
          toast({ title: "Error", description: "Please provide at least one meal timing", variant: "destructive" })
          return false
        }
        return true

      case "media":
        if (messData.images.length < 2) {
          toast({ title: "Error", description: "Please upload at least 2 photos of your mess", variant: "destructive" })
          return false
        }
        return true

      case "contact":
        if (!messData.contactName || !messData.contactPhone || !messData.contactEmail) {
          toast({ title: "Error", description: "Please fill in all contact details", variant: "destructive" })
          return false
        }
        if (!/^[0-9]{10}$/.test(messData.contactPhone)) {
          toast({ title: "Error", description: "Please enter a valid 10-digit phone number", variant: "destructive" })
          return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(messData.contactEmail)) {
          toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" })
          return false
        }
        return true

      default:
        return true
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    if (messData.images.length + files.length > 10) {
      toast({ title: "Error", description: "Maximum 10 images allowed", variant: "destructive" })
      return
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (!file.type.startsWith("image/")) {
        toast({ title: "Error", description: `${file.name} is not an image`, variant: "destructive" })
        continue
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: `${file.name} is too large (max 5MB)`, variant: "destructive" })
        continue
      }

      const previewUrl = URL.createObjectURL(file)
      setMessData((prev: any) => ({
        ...prev,
        images: [...prev.images, { file, preview: previewUrl }]
      }))
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeImage = (index: number) => {
    setMessData((prev: any) => ({
      ...prev,
      images: prev.images.filter((_: any, i: number) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    if (!validateCurrentTab()) return

    setIsLoading(true)

    try {
      // Upload images first (to Cloudinary via /api/upload)
      const files: File[] = (messData.images || [])
        .map((img: any) => img?.file)
        .filter(Boolean)

      if (files.length < 2) {
        throw new Error("Please upload at least 2 photos of your mess")
      }

      const uploadFormData = new FormData()
      uploadFormData.append("type", "mess")
      for (const file of files) {
        uploadFormData.append("images", file)
      }

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => null)
        throw new Error(errorData?.error || "Failed to upload images")
      }

      const uploadData = await uploadRes.json()
      const imageUrls: string[] = Array.isArray(uploadData?.imageUrls)
        ? uploadData.imageUrls
        : uploadData?.url
          ? [uploadData.url]
          : []

      if (imageUrls.length !== files.length) {
        throw new Error("Some images failed to upload. Please try again.")
      }

      // Prepare mess data for submission
      const submitData = {
        name: messData.name,
        description: messData.description,
        address: messData.address,
        location: `${messData.city}, ${messData.state}`,
        city: messData.city,
        state: messData.state,
        pincode: messData.pincode,
        coordinates: {
          type: "Point",
          coordinates: messData.coordinates && messData.coordinates.length === 2 
            ? [messData.coordinates[1], messData.coordinates[0]]  // GeoJSON format: [lng, lat]
            : [0, 0],
        },
        monthlyPrice: parseFloat(messData.monthlyPrice),
        dailyPrice: messData.dailyPrice ? parseFloat(messData.dailyPrice) : undefined,
        trialDays: parseInt(messData.trialDays) || 0,
        homeDeliveryAvailable: messData.homeDeliveryAvailable,
        deliveryRadius: parseFloat(messData.deliveryRadius) || 0,
        deliveryCharges: parseFloat(messData.deliveryCharges) || 0,
        packagingAvailable: !!messData.packagingAvailable,
        packagingPrice: messData.packagingAvailable ? (parseFloat(messData.packagingPrice) || 0) : 0,
        images: imageUrls,
        mealTypes: messData.mealTypes,
        cuisineTypes: messData.cuisineTypes,
        dietTypes: messData.dietTypes,
        openingHours: {
          breakfast: messData.breakfastTime || undefined,
          lunch: messData.lunchTime || undefined,
          dinner: messData.dinnerTime || undefined,
        },
        amenities: messData.amenities,
        capacity: messData.capacity ? parseInt(messData.capacity) : undefined,
        contactName: messData.contactName,
        contactPhone: messData.contactPhone,
        contactEmail: messData.contactEmail,
      }

      const response = await fetch("/api/messes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit mess")
      }

      toast({
        title: "Success! 🎉",
        description: "Your mess has been submitted for review. You'll be notified once approved!",
      })

      router.push("/messes")
    } catch (error) {
      console.error("❌ Error submitting mess:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit mess. Please try again.",
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">List Your Mess Service</h1>
          <p className="text-gray-600">Fill in the details to list your mess on our platform</p>
        </motion.div>

        {/* Progress Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              const isActive = currentTab === index
              const isCompleted = completedTabs.includes(index)

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (completedTabs.includes(index) || index <= currentTab) {
                      setCurrentTab(index)
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive
                      ? "bg-orange-500 text-white shadow-lg"
                      : isCompleted
                      ? "bg-green-100 text-green-700"
                      : "bg-white text-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-xl">
              <CardContent className="p-8">
                {/* Basic Info Tab */}
                {tabs[currentTab].id === "basic" && (
                  <BasicInfoTab messData={messData} setMessData={setMessData} />
                )}

                {/* Location Tab */}
                {tabs[currentTab].id === "location" && (
                  <LocationTab messData={messData} setMessData={setMessData} />
                )}

                {/* Pricing & Delivery Tab */}
                {tabs[currentTab].id === "pricing" && (
                  <PricingTab messData={messData} setMessData={setMessData} />
                )}

                {/* Meals & Menu Tab */}
                {tabs[currentTab].id === "meals" && (
                  <MealsTab messData={messData} setMessData={setMessData} />
                )}

                {/* Media Tab */}
                {tabs[currentTab].id === "media" && (
                  <MediaTab 
                    messData={messData} 
                    setMessData={setMessData}
                    fileInputRef={fileInputRef}
                    handleImageUpload={handleImageUpload}
                    removeImage={removeImage}
                  />
                )}

                {/* Contact Tab */}
                {tabs[currentTab].id === "contact" && (
                  <ContactTab messData={messData} setMessData={setMessData} />
                )}

                {/* Preview & Submit Tab */}
                {tabs[currentTab].id === "preview" && (
                  <PreviewTab messData={messData} />
                )}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentTab === 0 || isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {currentTab < tabs.length - 1 ? (
                <Button onClick={handleNext} disabled={isLoading}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit for Review
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// Tab Components
function BasicInfoTab({ messData, setMessData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
      
      <div>
        <Label htmlFor="name">Mess Name *</Label>
        <Input
          id="name"
          placeholder="E.g., Healthy Bites Mess"
          value={messData.name}
          onChange={(e) => setMessData({ ...messData, name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe your mess service, specialties, and what makes it unique..."
          rows={6}
          value={messData.description}
          onChange={(e) => setMessData({ ...messData, description: e.target.value })}
        />
        <p className="text-sm text-gray-500 mt-1">{messData.description.length} characters (min 20)</p>
      </div>

      <div>
        <Label htmlFor="capacity">Maximum Capacity (Students)</Label>
        <Input
          id="capacity"
          type="number"
          placeholder="E.g., 50"
          value={messData.capacity}
          onChange={(e) => setMessData({ ...messData, capacity: e.target.value })}
        />
      </div>
    </div>
  )
}

function LocationTab({ messData, setMessData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Location Details</h2>
      
      <div>
        <Label htmlFor="address">Complete Address *</Label>
        <Textarea
          id="address"
          placeholder="Building number, street name, landmark..."
          rows={3}
          value={messData.address}
          onChange={(e) => setMessData({ ...messData, address: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            placeholder="E.g., Bangalore"
            value={messData.city}
            onChange={(e) => setMessData({ ...messData, city: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            placeholder="E.g., Karnataka"
            value={messData.state}
            onChange={(e) => setMessData({ ...messData, state: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="pincode">Pincode *</Label>
        <Input
          id="pincode"
          placeholder="E.g., 560001"
          maxLength={6}
          value={messData.pincode}
          onChange={(e) => setMessData({ ...messData, pincode: e.target.value.replace(/\D/g, "") })}
        />
      </div>

      {/* Location Map Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Verify Location on Map</h3>
        <p className="text-sm text-gray-600 mb-4">
          As you enter the address details, the map will automatically locate your mess service. You can verify the exact location coordinates below.
        </p>
        <MessLocationMap
          address={messData.address}
          city={messData.city}
          state={messData.state}
          pincode={messData.pincode}
          onCoordinatesChange={(coords) => {
            setMessData({ ...messData, coordinates: coords })
          }}
        />
      </div>
    </div>
  )
}

function PricingTab({ messData, setMessData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pricing & Delivery</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="monthlyPrice">Monthly Price (₹) *</Label>
          <Input
            id="monthlyPrice"
            type="number"
            placeholder="E.g., 3500"
            value={messData.monthlyPrice}
            onChange={(e) => setMessData({ ...messData, monthlyPrice: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="dailyPrice">Daily Price (₹)</Label>
          <Input
            id="dailyPrice"
            type="number"
            placeholder="E.g., 150"
            value={messData.dailyPrice}
            onChange={(e) => setMessData({ ...messData, dailyPrice: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="trialDays">Free Trial Days</Label>
        <Input
          id="trialDays"
          type="number"
          placeholder="E.g., 3"
          value={messData.trialDays}
          onChange={(e) => setMessData({ ...messData, trialDays: e.target.value })}
        />
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="homeDelivery"
            checked={messData.homeDeliveryAvailable}
            onCheckedChange={(checked) => {
              const enabled = !!checked
              setMessData({
                ...messData,
                homeDeliveryAvailable: enabled,
                ...(enabled
                  ? {}
                  : {
                      deliveryRadius: "0",
                      deliveryCharges: "0",
                      packagingAvailable: false,
                      packagingPrice: "0",
                    }),
              })
            }}
          />
          <Label htmlFor="homeDelivery" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Home Delivery Available
          </Label>
        </div>

        {messData.homeDeliveryAvailable && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryRadius">Delivery Radius (km)</Label>
                <Input
                  id="deliveryRadius"
                  type="number"
                  placeholder="E.g., 5"
                  value={messData.deliveryRadius}
                  onChange={(e) => setMessData({ ...messData, deliveryRadius: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="deliveryCharges">Delivery Charges (₹)</Label>
                <Input
                  id="deliveryCharges"
                  type="number"
                  placeholder="E.g., 20"
                  value={messData.deliveryCharges}
                  onChange={(e) => setMessData({ ...messData, deliveryCharges: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox
                  id="packagingAvailable"
                  checked={messData.packagingAvailable}
                  onCheckedChange={(checked) =>
                    setMessData({
                      ...messData,
                      packagingAvailable: checked,
                      packagingPrice: checked ? messData.packagingPrice : "0",
                    })
                  }
                />
                <Label htmlFor="packagingAvailable">Packaging available (extra)</Label>
              </div>

              {messData.packagingAvailable && (
                <div className="max-w-sm">
                  <Label htmlFor="packagingPrice">Packaging Charges (₹)</Label>
                  <Input
                    id="packagingPrice"
                    type="number"
                    placeholder="E.g., 10"
                    value={messData.packagingPrice}
                    onChange={(e) => setMessData({ ...messData, packagingPrice: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MealsTab({ messData, setMessData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Meals & Menu</h2>
      
      <div>
        <Label className="mb-3 block">Diet Type *</Label>
        <div className="grid grid-cols-2 gap-3">
          {dietOptions.map((diet) => (
            <div key={diet} className="flex items-center space-x-2">
              <Checkbox
                id={`diet-${diet}`}
                checked={messData.dietTypes.includes(diet)}
                onCheckedChange={(checked) => {
                  setMessData({
                    ...messData,
                    dietTypes: checked
                      ? [...messData.dietTypes, diet]
                      : messData.dietTypes.filter((d: string) => d !== diet),
                  })
                }}
              />
              <Label htmlFor={`diet-${diet}`}>{diet}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Meal Types *</Label>
        <div className="grid grid-cols-2 gap-3">
          {mealTypeOptions.map((meal) => (
            <div key={meal} className="flex items-center space-x-2">
              <Checkbox
                id={`meal-${meal}`}
                checked={messData.mealTypes.includes(meal)}
                onCheckedChange={(checked) => {
                  setMessData({
                    ...messData,
                    mealTypes: checked
                      ? [...messData.mealTypes, meal]
                      : messData.mealTypes.filter((m: string) => m !== meal),
                  })
                }}
              />
              <Label htmlFor={`meal-${meal}`}>{meal}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Cuisine Types</Label>
        <div className="grid grid-cols-2 gap-3">
          {cuisineOptions.map((cuisine) => (
            <div key={cuisine} className="flex items-center space-x-2">
              <Checkbox
                id={`cuisine-${cuisine}`}
                checked={messData.cuisineTypes.includes(cuisine)}
                onCheckedChange={(checked) => {
                  setMessData({
                    ...messData,
                    cuisineTypes: checked
                      ? [...messData.cuisineTypes, cuisine]
                      : messData.cuisineTypes.filter((c: string) => c !== cuisine),
                  })
                }}
              />
              <Label htmlFor={`cuisine-${cuisine}`}>{cuisine}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <Label className="mb-3 block">Meal Timings</Label>
        <div className="space-y-4">
          <div>
            <Label htmlFor="breakfast">Breakfast</Label>
            <Input
              id="breakfast"
              placeholder="E.g., 7:00 AM - 9:00 AM"
              value={messData.breakfastTime}
              onChange={(e) => setMessData({ ...messData, breakfastTime: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="lunch">Lunch</Label>
            <Input
              id="lunch"
              placeholder="E.g., 12:00 PM - 2:00 PM"
              value={messData.lunchTime}
              onChange={(e) => setMessData({ ...messData, lunchTime: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="dinner">Dinner</Label>
            <Input
              id="dinner"
              placeholder="E.g., 7:00 PM - 9:00 PM"
              value={messData.dinnerTime}
              onChange={(e) => setMessData({ ...messData, dinnerTime: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <Label className="mb-3 block">Amenities</Label>
        <div className="grid grid-cols-2 gap-3">
          {amenitiesOptions.map((amenity) => (
            <div key={amenity} className="flex items-center space-x-2">
              <Checkbox
                id={`amenity-${amenity}`}
                checked={messData.amenities.includes(amenity)}
                onCheckedChange={(checked) => {
                  setMessData({
                    ...messData,
                    amenities: checked
                      ? [...messData.amenities, amenity]
                      : messData.amenities.filter((a: string) => a !== amenity),
                  })
                }}
              />
              <Label htmlFor={`amenity-${amenity}`}>{amenity}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MediaTab({ messData, fileInputRef, handleImageUpload, removeImage }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Photos</h2>
      <p className="text-gray-600">Upload photos of your mess, food, and dining area (Min 2, Max 10)</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full h-32 border-2 border-dashed"
      >
        <div className="text-center">
          <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="font-medium">Click to upload photos</p>
          <p className="text-sm text-gray-500">PNG, JPG (max 5MB each)</p>
        </div>
      </Button>

      {messData.images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-medium">Uploaded Photos ({messData.images.length}/10)</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {messData.images.map((img: any, index: number) => (
              <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border-2">
                <Image
                  src={img.preview}
                  alt={`Upload ${index + 1}`}
                  fill
                  className="object-cover"
                />
                {index === 0 && (
                  <Badge className="absolute top-2 left-2 bg-orange-500">Cover Photo</Badge>
                )}
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ContactTab({ messData, setMessData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Contact Details</h2>
      
      <div>
        <Label htmlFor="contactName">Contact Person Name *</Label>
        <Input
          id="contactName"
          placeholder="Your name"
          value={messData.contactName}
          onChange={(e) => setMessData({ ...messData, contactName: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="contactPhone">Phone Number *</Label>
        <Input
          id="contactPhone"
          placeholder="10-digit mobile number"
          maxLength={10}
          value={messData.contactPhone}
          onChange={(e) => setMessData({ ...messData, contactPhone: e.target.value.replace(/\D/g, "") })}
        />
      </div>

      <div>
        <Label htmlFor="contactEmail">Email Address *</Label>
        <Input
          id="contactEmail"
          type="email"
          placeholder="your@email.com"
          value={messData.contactEmail}
          onChange={(e) => setMessData({ ...messData, contactEmail: e.target.value })}
        />
      </div>
    </div>
  )
}

function PreviewTab({ messData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Preview & Submit</h2>
      <p className="text-gray-600">Review your mess details before submitting</p>

      <div className="space-y-4 bg-gray-50 rounded-lg p-6">
        <div>
          <p className="font-semibold text-gray-700">Mess Name:</p>
          <p className="text-lg">{messData.name}</p>
        </div>

        <div>
          <p className="font-semibold text-gray-700">Location:</p>
          <p>{messData.city}, {messData.state} - {messData.pincode}</p>
        </div>

        <div>
          <p className="font-semibold text-gray-700">Monthly Price:</p>
          <p className="text-2xl font-bold text-orange-600">₹{messData.monthlyPrice}</p>
        </div>

        {messData.homeDeliveryAvailable && (
          <div>
            <Badge className="bg-green-500">Home Delivery Available</Badge>
            <p className="text-sm mt-1">Up to {messData.deliveryRadius}km • ₹{messData.deliveryCharges} charges</p>
          </div>
        )}

        <div>
          <p className="font-semibold text-gray-700">Diet Types:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {messData.dietTypes.map((diet: string) => (
              <Badge key={diet} variant="outline">{diet}</Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-700">Meal Types:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {messData.mealTypes.map((meal: string) => (
              <Badge key={meal} variant="outline">{meal}</Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-700">Photos:</p>
          <p>{messData.images.length} images uploaded</p>
        </div>

        <div>
          <p className="font-semibold text-gray-700">Contact:</p>
          <p>{messData.contactName} • {messData.contactPhone}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          ℹ️ Your mess will be reviewed by our team before being published. This usually takes 24-48 hours.
        </p>
      </div>
    </div>
  )
}

