"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { MapPin, Star, Bed, Bath, Users, Wifi, Car, UtensilsCrossed, X } from "lucide-react"
import { LikeButton } from "@/components/like-button"

interface QuickViewModalProps {
  isOpen: boolean
  onClose: () => void
  property: any
}

export function QuickViewModal({ isOpen, onClose, property }: QuickViewModalProps) {
  if (!property) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Quick View: {property.title}</DialogTitle>
        </DialogHeader>

        {/* Image Section */}
        <div className="relative h-64 w-full overflow-hidden">
          <Image
            src={property.images?.[0] || "/placeholder.jpg"}
            alt={property.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute top-4 left-4 z-10">
            <Badge className="bg-purple-600 text-white border-none">
              {property.type}
            </Badge>
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <LikeButton
              itemType="property"
              itemId={property._id}
              size="md"
              className="bg-white/90 backdrop-blur-sm shadow-lg rounded-full"
            />
            <Button
              variant="secondary"
              size="icon"
              onClick={onClose}
              className="bg-white/90 backdrop-blur-sm hover:bg-white rounded-full text-gray-700"
            >
              <X className="w-4 h-4 text-gray-700" />
            </Button>
          </div>

          <div className="absolute bottom-4 left-4 z-10 text-white">
            <h2 className="text-2xl font-bold mb-1">{property.title}</h2>
            <div className="flex items-center gap-2 text-white/90">
              <MapPin className="w-4 h-4" />
              <span>{property.location}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-6">
          {/* Price & Rating */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                ₹{property.price?.toLocaleString()}
                <span className="text-lg font-normal text-gray-500">/month</span>
              </div>
              {property.deposit && (
                <p className="text-sm text-gray-500 mt-1">
                  + ₹{property.deposit.toLocaleString()} security deposit
                </p>
              )}
            </div>
            {property.rating > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 mb-1">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span className="text-lg font-bold">{property.rating?.toFixed(1)}</span>
                </div>
                <p className="text-sm text-gray-500">{property.reviews || 0} reviews</p>
              </div>
            )}
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {property.bedrooms && (
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-semibold">{property.bedrooms}</div>
                  <div className="text-xs text-gray-500">Bedrooms</div>
                </div>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-2">
                <Bath className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-semibold">{property.bathrooms}</div>
                  <div className="text-xs text-gray-500">Bathrooms</div>
                </div>
              </div>
            )}
            {property.capacity && (
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-semibold">{property.capacity}</div>
                  <div className="text-xs text-gray-500">Capacity</div>
                </div>
              </div>
            )}
          </div>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {property.amenities.includes("wifi") && (
                  <Badge variant="outline" className="gap-1">
                    <Wifi className="w-3 h-3" />
                    WiFi
                  </Badge>
                )}
                {property.parking && (
                  <Badge variant="outline" className="gap-1">
                    <Car className="w-3 h-3" />
                    Parking
                  </Badge>
                )}
                {property.foodAvailable && (
                  <Badge variant="outline" className="gap-1">
                    <UtensilsCrossed className="w-3 h-3" />
                    Food Available
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {property.description && (
            <div>
              <h3 className="font-semibold mb-2">About this property</h3>
              <p className="text-gray-600 line-clamp-3">{property.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Link href={`/listings/${property._id}`} className="flex-1">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                View Full Details
              </Button>
            </Link>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

