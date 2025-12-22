"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Star, ArrowRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface FeaturedProperty {
  _id: string
  title: string
  location: string
  rating: number
  reviews: number
  price: number
  image: string
  type: string
}

export default function FeaturedListings() {
  const [properties, setProperties] = useState<FeaturedProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchFeaturedProperties = async () => {
      try {
        const response = await fetch("/api/properties/featured")

        if (!response.ok) {
          throw new Error("Failed to fetch featured properties")
        }

        const data = await response.json()
        setProperties(Array.isArray(data.properties) ? data.properties : [])
      } catch (error) {
        console.error("Error fetching featured properties:", error)
        toast({
          title: "Error",
          description: "Failed to load featured properties. Please try again later.",
          variant: "destructive",
        })
        setProperties([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedProperties()
  }, [toast])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  if (isLoading) {
    return (
      <div className="py-16 bg-gray-50 dark:bg-slate-900">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Featured Accommodations</h2>
              <p className="mt-2 text-lg text-muted-foreground">Discover our top-rated PGs, hostels, and flats</p>
            </div>
            <Button variant="ghost" className="mt-4 md:mt-0" asChild>
              <Link href="/listings" className="flex items-center">
                View all listings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-48 bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                <CardContent className="p-5">
                  <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-1/2"></div>
                </CardContent>
                <CardFooter className="p-5 pt-0 flex justify-between items-center">
                  <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-1/3"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-1/4"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-16 bg-gray-50 dark:bg-slate-900">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Featured Accommodations</h2>
            <p className="mt-2 text-lg text-muted-foreground">Discover our top-rated PGs, hostels, and flats</p>
          </div>
          <Button variant="ghost" className="mt-4 md:mt-0" asChild>
            <Link href="/listings" className="flex items-center">
              View all listings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {properties && properties.length > 0 ? (
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {properties.map((property) => (
              <motion.div key={property._id} variants={item}>
                <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
                  <div className="relative">
                    <Badge className="absolute top-3 left-3 z-10">{property.type}</Badge>
                    <Image
                      src={property.image || "/placeholder.svg"}
                      alt={property.title}
                      width={400}
                      height={300}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-bold text-lg">{property.title}</h3>
                    <div className="flex items-center mt-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="text-sm">{typeof property.location === 'string' ? property.location : (property.location as any)?.address || "Location not specified"}</span>
                    </div>
                    <div className="flex items-center mt-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="text-sm font-medium">{property.rating}</span>
                      <span className="text-xs text-muted-foreground ml-1">({property.reviews} reviews)</span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-5 pt-0 flex justify-between items-center">
                    <div>
                      <span className="text-xl font-bold">₹{property.price}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                    <Link href={`/listings/${property._id}`}>
                      <Button>View Details</Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No featured properties available at the moment.</p>
            <Button asChild className="mt-6" variant="outline">
              <Link href="/listings">Browse All Properties</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
