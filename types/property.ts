export interface PropertyListing {
  _id: string
  title: string
  location: string
  rating: number
  reviews: number
  price: number
  image: string
  amenities: string[]
  type: string
  distance: {
    college: number
    hospital: number
    busStop: number
    metro: number
  }
}

export interface Property {
  _id: string
  title: string
  location: string | { address?: string; type?: string; coordinates?: any }
  price: number
  type: string
  coordinates: [number, number]  // Sanitized to simple array [lng, lat]
  _rawGeoJSON?: any  // Optional: stores original GeoJSON if needed
}
