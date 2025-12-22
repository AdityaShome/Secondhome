"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation } from "lucide-react"

interface MapCoordinatePickerProps {
  coordinates: [number, number] // [lng, lat]
  onCoordinatesChange: (coords: [number, number]) => void
  address?: string
  city?: string
  state?: string
}

export default function MapCoordinatePicker({
  coordinates,
  onCoordinatesChange,
  address,
  city,
  state
}: MapCoordinatePickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [L, setL] = useState<any>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Load Leaflet library
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadLeaflet = async () => {
      if ((window as any).L) {
        setL((window as any).L)
        return
      }

      // Load Leaflet CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      // Load Leaflet JS
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.onload = () => {
        setL((window as any).L)
      }
      document.head.appendChild(script)
    }

    loadLeaflet()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!L || !mapContainer.current || map) return

    // Determine initial map center
    let initialCoords: [number, number] = [28.6139, 77.2090] // Default to Delhi
    
    if (coordinates && coordinates.length >= 2 && coordinates[0] !== 0 && coordinates[1] !== 0) {
      // Use existing coordinates if valid (Leaflet uses [lat, lng])
      initialCoords = [coordinates[1], coordinates[0]]
    }
    // If city and state are provided but no coordinates, we'll center after geocoding

    const newMap = L.map(mapContainer.current).setView(initialCoords, 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(newMap)

    // Create custom icon
    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    const newMarker = L.marker(initialCoords, {
      icon: customIcon,
      draggable: true
    }).addTo(newMap)

    newMarker.on('dragend', (e: any) => {
      const latlng = e.target.getLatLng()
      // Only update coordinates, don't trigger address reset
      onCoordinatesChange([latlng.lng, latlng.lat])
    })

    // Click on map to place marker
    newMap.on('click', (e: any) => {
      const latlng = e.latlng
      newMarker.setLatLng(latlng)
      // Only update coordinates, don't trigger address reset
      onCoordinatesChange([latlng.lng, latlng.lat])
    })

    setMap(newMap)
    setMarker(newMarker)

    return () => {
      newMap.remove()
    }
  }, [L, mapContainer.current])

  // Geocode address/city/state to get approximate coordinates
  const geocodeLocation = async () => {
    if (!city || !state) {
      alert("Please enter city and state first")
      return
    }

    setIsGeocoding(true)
    try {
      let query = ''
      let zoom = 14
      
      // Try full address first if available
      if (address && address.trim().length > 10) {
        query = `${address}, ${city}, ${state}, India`
        zoom = 16 // More zoomed in for specific address
      } else {
        query = `${city}, ${state}, India`
        zoom = 13
      }
      
      console.log('Geocoding query:', query)
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        const latNum = parseFloat(lat)
        const lngNum = parseFloat(lon)

        if (map && marker) {
          map.setView([latNum, lngNum], zoom)
          marker.setLatLng([latNum, lngNum])
          onCoordinatesChange([lngNum, latNum])
        }
      } else {
        // If full address search failed, try just city/state
        if (address && address.trim().length > 10) {
          console.log('Full address not found, trying city/state only')
          const fallbackQuery = `${city}, ${state}, India`
          const fallbackResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1`
          )
          const fallbackData = await fallbackResponse.json()
          
          if (fallbackData && fallbackData.length > 0) {
            const { lat, lon } = fallbackData[0]
            const latNum = parseFloat(lat)
            const lngNum = parseFloat(lon)

            if (map && marker) {
              map.setView([latNum, lngNum], 13)
              marker.setLatLng([latNum, lngNum])
              onCoordinatesChange([lngNum, latNum])
            }
            alert("Exact address not found. Map centered at city. Please drag marker to your exact location.")
          } else {
            alert("Location not found. Please try a different city/state or place the marker manually.")
          }
        } else {
          alert("Location not found. Please try a different city/state or place the marker manually.")
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error)
      alert("Failed to find location. Please place the marker manually on the map.")
    } finally {
      setIsGeocoding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">
            📍 Pin Exact Location on Map
          </p>
          <p className="text-xs text-gray-500">
            Enter your full address above, then click &quot;Find on Map&quot;. The map will search for your address. Drag the marker to fine-tune the exact location.
          </p>
        </div>
        <Button 
          type="button"
          onClick={geocodeLocation}
          disabled={isGeocoding || !city || !state}
          variant="outline"
          size="sm"
        >
          <Navigation className="w-4 h-4 mr-2" />
          {isGeocoding ? "Finding..." : "Find on Map"}
        </Button>
      </div>

      <div 
        ref={mapContainer} 
        className="w-full h-[400px] rounded-lg border border-gray-300 overflow-hidden"
      />

      <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <MapPin className="w-4 h-4 text-blue-600" />
        <span>
          Current coordinates: <span className="font-mono font-semibold">
            {coordinates && coordinates.length >= 2 
              ? `[${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}]`
              : '[Not set]'
            }
          </span>
        </span>
      </div>
    </div>
  )
}
