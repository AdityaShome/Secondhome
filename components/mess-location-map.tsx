"use client"

import { useEffect, useRef, useState } from "react"
// @ts-ignore
import "leaflet/dist/leaflet.css"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MessLocationMapProps {
  address: string
  city: string
  state: string
  pincode: string
  onCoordinatesChange?: (coordinates: [number, number]) => void
}

export function MessLocationMap({
  address,
  city,
  state,
  pincode,
  onCoordinatesChange,
}: MessLocationMapProps) {
  const [leaflet, setLeaflet] = useState<any>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pickMode, setPickMode] = useState(false)
  const pickModeRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    // Leaflet touches `window` at import-time; load it only on the client.
    if (typeof window === "undefined") return

    import("leaflet")
      .then((mod: any) => {
        if (cancelled) return
        setLeaflet(mod?.default || mod)
      })
      .catch((err) => {
        console.error("Failed to load Leaflet:", err)
        setError("Failed to load map library.")
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    pickModeRef.current = pickMode
  }, [pickMode])

  const applyLocationToMap = (
    lat: number,
    lng: number,
    popupHtml: string
  ) => {
    setCoordinates([lat, lng])
    onCoordinatesChange?.([lat, lng])

    setTimeout(() => {
      if (!mapRef.current) return

      mapRef.current.setView([lat, lng], 15)

      if (!markerRef.current) {
        markerRef.current = leaflet.marker([lat, lng], { draggable: true }).addTo(
          mapRef.current
        )

        markerRef.current.on("dragend", () => {
          const ll = markerRef.current?.getLatLng()
          if (!ll) return
          setCoordinates([ll.lat, ll.lng])
          onCoordinatesChange?.([ll.lat, ll.lng])
        })
      } else {
        markerRef.current.setLatLng([lat, lng])
      }

      markerRef.current.bindPopup(popupHtml).openPopup()
    }, 100)
  }

  const handleLocate = async () => {
    const fullAddress = `${address}, ${city}, ${state}, ${pincode}, India`
      .replace(/\s+/g, " ")
      .replace(/,\s*,/g, ",")
      .trim()

    setError(null)

    if (!fullAddress || fullAddress.length < 10) {
      setCoordinates(null)
      setError("Please enter a complete address (address, city, state, pincode).")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: (address || "").trim(),
          city: (city || "").trim(),
          state: (state || "").trim(),
          pincode: (pincode || "").trim(),
          country: "India",
          // Backward compat: keep the full string available for providers that
          // do best with a single combined query.
          fullAddress,
        }),
      })

      if (!response.ok) {
        const responseText = await response.text()
        console.error("❌ Geocoding failed with status:", response.status)
        console.error("❌ Response:", responseText)
        setError(
          "Could not locate this address. Try adding street/area name, or turn ON 'Pick on Map' and pin the exact location manually."
        )
        return
      }

      const data = await response.json()

      const latRaw = Array.isArray(data?.coordinates) ? data.coordinates[0] : data?.lat
      const lngRaw = Array.isArray(data?.coordinates) ? data.coordinates[1] : data?.lng

      const lat = typeof latRaw === "string" ? parseFloat(latRaw) : latRaw
      const lng = typeof lngRaw === "string" ? parseFloat(lngRaw) : lngRaw

      if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
        console.warn("⚠️ Unexpected geocode response:", data)
        setError("Geocoding returned an invalid location. Please try a more specific address.")
        return
      }

      applyLocationToMap(lat, lng, `<strong>${city}</strong><br/>${address}`)
    } catch (error) {
      console.error("❌ Geocoding fetch error:", error)
      setError("Something went wrong while locating the address.")
    } finally {
      setLoading(false)
    }
  }

  // Initialize map
  useEffect(() => {
    if (!leaflet) return
    if (!containerRef.current) return

    // Only initialize once
    if (mapRef.current) return

    try {
      // Clear any existing map instance
      const existingMap = (containerRef.current as any)._leaflet_map
      if (existingMap) {
        existingMap.remove()
      }

      mapRef.current = leaflet.map(containerRef.current, {
        attributionControl: true,
        zoomControl: true,
      }).setView([20.5937, 78.9629], 4) // Center of India

      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 2,
      }).addTo(mapRef.current)

      mapRef.current.on("click", (e: any) => {
        if (!pickModeRef.current) return
        setError(null)
        applyLocationToMap(
          e.latlng.lat,
          e.latlng.lng,
          `Pinned manually<br/>${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`
        )
      })

      console.log("Map initialized successfully")
    } catch (error) {
      console.error("Map initialization error:", error)
    }
  }, [leaflet])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={handleLocate} disabled={loading} type="button">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Locating...
            </>
          ) : (
            "Locate Address"
          )}
        </Button>

        <Button
          onClick={() => setPickMode((v) => !v)}
          disabled={loading}
          type="button"
          variant="outline"
        >
          {pickMode ? "Picking on Map: ON" : "Pick on Map"}
        </Button>

        <p className="text-sm text-muted-foreground">
          {pickMode
            ? "Click the map (or drag the marker) to set location."
            : "Click to pin your entered address."}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[400px] rounded-lg border-2 border-orange-200 overflow-hidden shadow-md"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <p className="text-white text-sm font-medium">Locating address...</p>
            </div>
          </div>
        )}
      </div>

      {coordinates && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">Exact Location</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-blue-700 font-medium">Latitude</p>
              <p className="text-lg font-mono font-bold text-blue-900">
                {coordinates[0].toFixed(6)}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">Longitude</p>
              <p className="text-lg font-mono font-bold text-blue-900">
                {coordinates[1].toFixed(6)}
              </p>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">
            📍 These coordinates will be saved with your mess listing
          </p>
        </div>
      )}
    </div>
  )
}
