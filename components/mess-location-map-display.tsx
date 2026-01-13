"use client"

import { useEffect, useRef, useState } from "react"
// @ts-ignore
import "leaflet/dist/leaflet.css"
import { MapPin } from "lucide-react"

interface MessLocationMapDisplayProps {
  messes: any[]
  className?: string
}

export function MessLocationMapDisplay({ messes, className = "" }: MessLocationMapDisplayProps) {
  const [leaflet, setLeaflet] = useState<any>(null)
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    if (typeof window === "undefined") return

    import("leaflet")
      .then((mod: any) => {
        if (cancelled) return
        setLeaflet(mod?.default || mod)
      })
      .catch((err) => {
        console.error("Failed to load Leaflet:", err)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!leaflet) return
    if (!containerRef.current || !messes.length) return

    // Initialize map if not already done
    if (!mapRef.current) {
      try {
        mapRef.current = leaflet.map(containerRef.current).setView([20.5937, 78.9629], 4)

        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current)
      } catch (error) {
        console.error("Map initialization error:", error)
        return
      }
    }

    const map = mapRef.current

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer instanceof leaflet.Marker) {
        map.removeLayer(layer)
      }
    })

    // Add markers for each mess
    const bounds = leaflet.latLngBounds([])

    messes.forEach((mess) => {
      if (
        mess.coordinates &&
        mess.coordinates.coordinates &&
        mess.coordinates.coordinates.length === 2
      ) {
        // GeoJSON format is [lng, lat], but Leaflet uses [lat, lng]
        const [lng, lat] = mess.coordinates.coordinates
        const position: [number, number] = [lat, lng]

        const marker = leaflet.marker(position)
          .bindPopup(
            `<div class="font-semibold text-orange-600">${mess.name}</div><div class="text-sm text-gray-600">${mess.address}</div><div class="text-sm font-medium mt-2">₹${mess.monthlyPrice}/month</div>`,
            { maxWidth: 250 }
          )
          .addTo(map)

        bounds.extend(position)
      }
    })

    // Fit bounds if we have valid markers
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    return () => {
      // Cleanup is handled by Leaflet
    }
  }, [leaflet, messes])

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Messes Map View</h3>
      </div>
      <div
        ref={containerRef}
        className="w-full h-[500px] rounded-lg border-2 border-orange-200 overflow-hidden shadow-lg"
      />
    </div>
  )
}
