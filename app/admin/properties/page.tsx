"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Sparkles, 
  Eye, 
  MapPin, 
  Home,
  UtensilsCrossed,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Shield,
  DollarSign,
  Truck,
  FileCheck,
  Star
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Property {
  _id: string
  title: string
  description: string
  type: string
  gender: string
  address: string
  location: string
  price: number
  deposit: number
  images: string[]
  amenities: string[]
  owner: {
    name: string
    email: string
  }
  isApproved: boolean
  isRejected: boolean
  createdAt: string
  aiReview?: {
    reviewed: boolean
    confidence: number
    score: number
    recommendation: string
    reason: string
    analysis?: {
      legitimacy?: string
      pricing?: string
      safety?: string
      completeness?: string
      quality?: string
    }
    redFlags?: string[]
  }
}

interface MessItem {
  _id: string
  name: string
  description: string
  address: string
  location: string
  city: string
  state: string
  pincode: string
  monthlyPrice: number
  dailyPrice?: number
  trialDays?: number
  homeDeliveryAvailable: boolean
  deliveryRadius?: number
  deliveryCharges?: number
  packagingAvailable?: boolean
  packagingPrice?: number
  images: string[]
  mealTypes: string[]
  cuisineTypes: string[]
  dietTypes: string[]
  amenities: string[]
  owner: {
    name: string
    email: string
  }
  isApproved: boolean
  isRejected: boolean
  createdAt: string
  aiReview?: {
    reviewed: boolean
    confidence?: number
    score?: number
    recommendation?: string
    summary?: string
    analysis?: {
      legitimacy?: string
      pricing?: string
      completeness?: string
      safety?: string
      deliveryPackaging?: string
    }
    redFlags?: string[]
    reason?: string
  }
}

export default function AdminPropertiesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [listingType, setListingType] = useState<"properties" | "messes">("properties")
  const [properties, setProperties] = useState<Property[]>([])
  const [messes, setMesses] = useState<MessItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/admin/properties")
      return
    }
    if (user.role !== "admin") {
      console.log("❌ User is not admin. Role:", user.role)
      router.push("/")
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      })
      return
    }
    console.log("✅ Admin access granted. User:", user)
    fetchListings()
  }, [user, listingType, activeTab, router, toast])

  const fetchListings = async () => {
    setLoading(true)
    try {
      const endpoint = listingType === "properties" ? "/api/admin/properties" : "/api/admin/messes"
      const res = await fetch(`${endpoint}?status=${activeTab}`)
      const data = await res.json()

      if (listingType === "properties") {
        setProperties(data.properties || [])
      } else {
        setMesses(data.messes || [])
      }
    } catch (error) {
      console.error("Error fetching listings:", error)
      toast({
        title: "Error",
        description: "Failed to fetch listings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      const base = listingType === "properties" ? "/api/admin/properties" : "/api/admin/messes"
      const res = await fetch(`${base}/${id}/approve`, {
        method: "POST",
      })
      if (res.ok) {
        toast({
          title: "✅ Approved",
          description: listingType === "properties" ? "The property is now live on the platform" : "The mess is now live on the platform",
        })
        fetchListings()
      } else {
        throw new Error("Failed to approve")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: listingType === "properties" ? "Failed to approve property" : "Failed to approve mess",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:")
    if (!reason) return

    setActionLoading(id)
    try {
      const base = listingType === "properties" ? "/api/admin/properties" : "/api/admin/messes"
      const res = await fetch(`${base}/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        toast({
          title: "❌ Rejected",
          description: listingType === "properties" ? "The property owner will be notified" : "The mess owner will be notified",
        })
        fetchListings()
      } else {
        throw new Error("Failed to reject")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: listingType === "properties" ? "Failed to reject property" : "Failed to reject mess",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleAIReview = async (id: string) => {
    setActionLoading(`ai-${id}`)
    try {
      const base = listingType === "properties" ? "/api/admin/properties" : "/api/admin/messes"
      const res = await fetch(`${base}/${id}/ai-review`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok) {
        const recommendation = data.result.recommendation
        const emoji = recommendation === "APPROVE" ? "✅" : recommendation === "REJECT" ? "❌" : "⚠️"
        toast({
          title: `${emoji} AI Review Complete`,
          description: `Recommendation: ${recommendation === "APPROVE" ? "APPROVE" : recommendation === "REJECT" ? "REJECT" : "MANUAL REVIEW"} (${data.result.confidence}% confidence)`,
          variant: recommendation === "REJECT" ? "destructive" : "default"
        })
        fetchListings()
      } else {
        throw new Error(data.details || "Failed to perform AI review")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to perform AI review",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage PG/Flat and Mess listings and approvals</p>
        </div>

        <Tabs value={listingType} onValueChange={(v) => setListingType(v as any)} className="w-full mb-6">
          <TabsList className="grid w-full md:w-auto grid-cols-2 bg-slate-800 border border-slate-700">
            <TabsTrigger value="properties" className="data-[state=active]:bg-primary">
              <Home className="w-4 h-4 mr-2" />
              PG / Flat
            </TabsTrigger>
            <TabsTrigger value="messes" className="data-[state=active]:bg-primary">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Messes
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary">
              <Clock className="w-4 h-4 mr-2" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-green-600">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-red-600">
              <XCircle className="w-4 h-4 mr-2" />
              Rejected
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (listingType === "properties" ? properties.length : messes.length) === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No listings in this category</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {listingType === "properties" && properties.map((property) => (
                  <Card key={property._id} className="bg-slate-800 border-slate-700 overflow-hidden">
                    <div className="relative h-48 bg-slate-700">
                      <Image
                        src={property.images[0] || "/placeholder.jpg"}
                        alt={property.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <Badge className="absolute top-3 left-3">{property.type}</Badge>
                      <Badge variant="secondary" className="absolute top-3 right-3">
                        {property.gender}
                      </Badge>
                    </div>

                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">
                        {property.title}
                      </h3>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">
                          {typeof property.location === 'string' 
                            ? property.location 
                            : ((property.location as any)?.address || (property as any).address || "Location not specified")
                          }
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Home className="w-4 h-4" />
                        <span>Owner: {property.owner?.name || 'Unknown'}</span>
                      </div>

                      <div className="text-2xl font-bold text-secondary mb-4">
                        ₹{property.price.toLocaleString()}/month
                      </div>

                      {property.aiReview?.reviewed && (
                        <div className="mb-4 p-3 bg-slate-700 rounded-lg">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedReviews)
                              if (newExpanded.has(property._id)) {
                                newExpanded.delete(property._id)
                              } else {
                                newExpanded.add(property._id)
                              }
                              setExpandedReviews(newExpanded)
                            }}
                            className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-400" />
                              <span className="text-sm font-semibold text-purple-400">AI Review</span>
                              <Badge variant="outline" className="text-xs border-purple-400 text-white font-semibold">
                                {property.aiReview.score}/100
                              </Badge>
                            </div>
                            {expandedReviews.has(property._id) ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-300">Recommendation:</span>
                              <Badge 
                                variant={property.aiReview.recommendation === 'APPROVE' ? 'default' : property.aiReview.recommendation === 'REJECT' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {property.aiReview.recommendation}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-300">Confidence:</span>
                              <span className="font-bold text-white">{property.aiReview.confidence}%</span>
                            </div>
                            
                            {expandedReviews.has(property._id) && (
                              <div className="mt-3 pt-3 border-t border-slate-600 space-y-3">
                                {/* Analysis Section */}
                                {property.aiReview.analysis && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-purple-300 mb-2">Detailed Analysis:</p>
                                    
                                    {property.aiReview.analysis.legitimacy && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <Shield className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-blue-400">Legitimacy</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{property.aiReview.analysis.legitimacy}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {property.aiReview.analysis.pricing && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <DollarSign className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-green-400">Pricing</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{property.aiReview.analysis.pricing}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {property.aiReview.analysis.safety && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-yellow-400">Safety</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{property.aiReview.analysis.safety}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {property.aiReview.analysis.completeness && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <FileCheck className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-cyan-400">Completeness</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{property.aiReview.analysis.completeness}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {property.aiReview.analysis.quality && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <Star className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-purple-400">Quality</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{property.aiReview.analysis.quality}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Red Flags Section */}
                                {property.aiReview.redFlags && property.aiReview.redFlags.length > 0 && (
                                  <div className="bg-red-950/30 border border-red-900/50 rounded p-2">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-semibold text-red-400 mb-1">Red Flags:</p>
                                        <ul className="space-y-0.5">
                                          {property.aiReview.redFlags.map((flag, idx) => (
                                            <li key={idx} className="text-xs text-red-300 flex items-start gap-1">
                                              <span className="text-red-500 mt-0.5">•</span>
                                              <span>{flag}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Reason */}
                                <div className="bg-slate-800/50 rounded p-2">
                                  <p className="text-xs font-medium text-purple-300 mb-1">Recommendation Reason:</p>
                                  <p className="text-xs text-muted-foreground">{property.aiReview.reason}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === "pending" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleAIReview(property._id)}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === `ai-${property._id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-1" />
                                AI Review
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(property._id)}
                            disabled={!!actionLoading}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading === property._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(property._id)}
                            disabled={!!actionLoading}
                            className="col-span-2"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        asChild
                      >
                        <Link href={`/listings/${property._id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {listingType === "messes" && messes.map((mess) => (
                  <Card key={mess._id} className="bg-slate-800 border-slate-700 overflow-hidden">
                    <div className="relative h-48 bg-slate-700">
                      <Image
                        src={mess.images?.[0] || "/placeholder.jpg"}
                        alt={mess.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <Badge className="absolute top-3 left-3">Mess</Badge>
                      {mess.homeDeliveryAvailable && (
                        <Badge variant="secondary" className="absolute top-3 right-3">
                          Delivery
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">{mess.name}</h3>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">{mess.location || `${mess.city}, ${mess.state}`}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Home className="w-4 h-4" />
                        <span>Owner: {mess.owner?.name || "Unknown"}</span>
                      </div>

                      <div className="text-2xl font-bold text-secondary mb-2">₹{(mess.monthlyPrice || 0).toLocaleString()}/month</div>

                      {(mess.homeDeliveryAvailable || mess.packagingAvailable) && (
                        <div className="text-xs text-muted-foreground mb-4 space-y-1">
                          {mess.homeDeliveryAvailable && (
                            <div>
                              Delivery: up to {mess.deliveryRadius || 0}km • ₹{mess.deliveryCharges || 0}
                            </div>
                          )}
                          {mess.packagingAvailable && (
                            <div>Packaging: ₹{mess.packagingPrice || 0}</div>
                          )}
                        </div>
                      )}

                      {mess.aiReview?.reviewed && (
                        <div className="mb-4 p-3 bg-slate-700 rounded-lg">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedReviews)
                              if (newExpanded.has(mess._id)) newExpanded.delete(mess._id)
                              else newExpanded.add(mess._id)
                              setExpandedReviews(newExpanded)
                            }}
                            className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-400" />
                              <span className="text-sm font-semibold text-purple-400">AI Review</span>
                              <Badge variant="outline" className="text-xs border-purple-400 text-white font-semibold">
                                {mess.aiReview.score ?? 0}/100
                              </Badge>
                            </div>
                            {expandedReviews.has(mess._id) ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-300">Recommendation:</span>
                              <Badge
                                variant={
                                  mess.aiReview.recommendation === "APPROVE"
                                    ? "default"
                                    : mess.aiReview.recommendation === "REJECT"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {mess.aiReview.recommendation}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-300">Confidence:</span>
                              <span className="font-bold text-white">{mess.aiReview.confidence ?? 0}%</span>
                            </div>

                            {mess.aiReview.summary && !expandedReviews.has(mess._id) && (
                              <p className="text-xs text-muted-foreground">{mess.aiReview.summary}</p>
                            )}

                            {expandedReviews.has(mess._id) && (
                              <div className="mt-3 pt-3 border-t border-slate-600 space-y-3">
                                {mess.aiReview.summary && (
                                  <div className="bg-slate-800/50 rounded p-2">
                                    <p className="text-xs font-medium text-purple-300 mb-1">Summary</p>
                                    <p className="text-xs text-muted-foreground">{mess.aiReview.summary}</p>
                                  </div>
                                )}

                                {mess.aiReview.analysis && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-purple-300 mb-2">Detailed Analysis:</p>

                                    {mess.aiReview.analysis.legitimacy && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <Shield className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-blue-400">Legitimacy</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{mess.aiReview.analysis.legitimacy}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {mess.aiReview.analysis.pricing && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <DollarSign className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-green-400">Pricing</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{mess.aiReview.analysis.pricing}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {mess.aiReview.analysis.safety && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-yellow-400">Safety</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{mess.aiReview.analysis.safety}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {mess.aiReview.analysis.completeness && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <FileCheck className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-cyan-400">Completeness</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{mess.aiReview.analysis.completeness}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {mess.aiReview.analysis.deliveryPackaging && (
                                      <div className="bg-slate-800/50 rounded p-2">
                                        <div className="flex items-start gap-2">
                                          <Truck className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-medium text-orange-400">Delivery & Packaging</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{mess.aiReview.analysis.deliveryPackaging}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {mess.aiReview.redFlags && mess.aiReview.redFlags.length > 0 && (
                                  <div className="bg-red-950/30 border border-red-900/50 rounded p-2">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-semibold text-red-400 mb-1">Red Flags:</p>
                                        <ul className="space-y-0.5">
                                          {mess.aiReview.redFlags.map((flag, idx) => (
                                            <li key={idx} className="text-xs text-red-300 flex items-start gap-1">
                                              <span className="text-red-500 mt-0.5">•</span>
                                              <span>{flag}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {mess.aiReview.reason && (
                                  <div className="bg-slate-800/50 rounded p-2">
                                    <p className="text-xs font-medium text-purple-300 mb-1">Recommendation Reason:</p>
                                    <p className="text-xs text-muted-foreground">{mess.aiReview.reason}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === "pending" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleAIReview(mess._id)}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === `ai-${mess._id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-1" />
                                AI Review
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(mess._id)}
                            disabled={!!actionLoading}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading === mess._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(mess._id)}
                            disabled={!!actionLoading}
                            className="col-span-2"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      <Button size="sm" variant="outline" className="w-full mt-2" asChild>
                        <Link href={`/messes/${encodeURIComponent(String(mess._id))}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  )
}

