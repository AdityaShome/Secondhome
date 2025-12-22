"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Shield, CheckCircle2, X, Loader2, Wifi, Video, MapPin, Phone, Mail, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Property {
  _id: string
  title: string
  location: string
  address: string
  verificationStatus: "pending" | "verified" | "rejected"
  verificationPaidAt: string
  owner: {
    _id: string
    name: string
    email: string
    phone?: string
  }
  executiveVisit?: {
    visitedAt?: string
    visitedBy?: string
    checks?: {
      wifiTested?: boolean
      wifiSpeed?: string
      rawVideoCheck?: boolean
      videoUrl?: string
      physicalInspection?: boolean
      notes?: string
    }
  }
}

export default function AdminVerificationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    wifiTested: false,
    wifiSpeed: "Ultra Fast",
    rawVideoCheck: false,
    videoUrl: "",
    physicalInspection: false,
    notes: "",
    approve: true,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (session?.user?.role !== "admin" && session?.user?.role !== "executive") {
      router.push("/")
      return
    }
    fetchPendingVerifications()
  }, [session, router])

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/properties/complete-verification?status=pending")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setProperties(data.properties || [])
    } catch (error) {
      console.error("Error fetching verifications:", error)
      toast({
        title: "Error",
        description: "Failed to load pending verifications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteVerification = (property: Property) => {
    setSelectedProperty(property)
    // Pre-fill if already visited
    if (property.executiveVisit?.checks) {
      setFormData({
        wifiTested: property.executiveVisit.checks.wifiTested || false,
        wifiSpeed: property.executiveVisit.checks.wifiSpeed || "Ultra Fast",
        rawVideoCheck: property.executiveVisit.checks.rawVideoCheck || false,
        videoUrl: property.executiveVisit.checks.videoUrl || "",
        physicalInspection: property.executiveVisit.checks.physicalInspection || false,
        notes: property.executiveVisit.checks.notes || "",
        approve: true,
      })
    }
    setIsDialogOpen(true)
  }

  const submitVerification = async () => {
    if (!selectedProperty) return

    setSubmitting(true)
    try {
      const response = await fetch(
        `/api/admin/properties/${selectedProperty._id}/complete-verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to complete verification")
      }

      toast({
        title: "Success! ✅",
        description: formData.approve
          ? "Property verified successfully!"
          : "Verification rejected.",
      })

      setIsDialogOpen(false)
      fetchPendingVerifications()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete verification",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Property Verifications
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and complete property verifications after executive visits
        </p>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No pending verifications</p>
            <p className="text-muted-foreground">All verifications are up to date!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {properties.map((property) => (
            <Card key={property._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{property.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      {typeof property.location === 'string' ? property.location : property.location?.address || property.address || "Location not specified"}
                    </CardDescription>
                  </div>
                  <Badge className="bg-yellow-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Owner Details</p>
                    <p className="text-sm text-muted-foreground">{property.owner.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {property.owner.email}
                    </p>
                    {property.owner.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {property.owner.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Payment Details</p>
                    <p className="text-sm text-muted-foreground">
                      Paid: {new Date(property.verificationPaidAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Amount: ₹500</p>
                  </div>
                </div>
                <Button onClick={() => handleCompleteVerification(property)} className="w-full md:w-auto">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Verification
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Verification Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Property Verification</DialogTitle>
            <DialogDescription>
              Enter verification details after executive visit
            </DialogDescription>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4 py-4">
              <div>
                <p className="font-semibold">{selectedProperty.title}</p>
                <p className="text-sm text-muted-foreground">{selectedProperty.address}</p>
              </div>

              {/* WiFi Test */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wifiTested"
                    checked={formData.wifiTested}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, wifiTested: checked as boolean })
                    }
                  />
                  <Label htmlFor="wifiTested" className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    WiFi Tested
                  </Label>
                </div>
                {formData.wifiTested && (
                  <Input
                    placeholder="WiFi Speed (e.g., Ultra Fast)"
                    value={formData.wifiSpeed}
                    onChange={(e) => setFormData({ ...formData, wifiSpeed: e.target.value })}
                  />
                )}
              </div>

              {/* Raw Video Check */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rawVideoCheck"
                    checked={formData.rawVideoCheck}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, rawVideoCheck: checked as boolean })
                    }
                  />
                  <Label htmlFor="rawVideoCheck" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Raw Video Check Completed
                  </Label>
                </div>
                {formData.rawVideoCheck && (
                  <Input
                    placeholder="Video URL (optional)"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  />
                )}
              </div>

              {/* Physical Inspection */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="physicalInspection"
                  checked={formData.physicalInspection}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, physicalInspection: checked as boolean })
                  }
                />
                <Label htmlFor="physicalInspection">Physical Inspection Completed</Label>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional verification notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Approve/Reject */}
              <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                <Checkbox
                  id="approve"
                  checked={formData.approve}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, approve: checked as boolean })
                  }
                />
                <Label htmlFor="approve" className="font-semibold">
                  Approve and Verify Property
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitVerification} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {formData.approve ? "Verify Property" : "Reject Verification"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

