"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { X, Maximize2, RotateCcw, Navigation, Globe, Eye, EyeOff } from "lucide-react"

interface Property {
  _id: string
  title: string
  location: string
  price: number
  type: string
  coordinates: { coordinates: [number, number] }
}

interface Place {
  id: string
  name: string
  type: string
  lat: number
  lon: number
}

interface LocationInsights {
  restaurants?: number
  hospitals?: number
  transport?: number
  colleges?: number
  scores: {
    food: number
    health: number
    connectivity: number
    safety: number
    overall: number
  }
}

export interface Map3DWorldProps {
  properties: Property[]
  places: Place[]
  insights: LocationInsights | null
  mapCenter: [number, number]
  onClose: () => void
}

function Map3DWorld({ properties, places, insights, mapCenter, onClose }: Map3DWorldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const rotationRef = useRef<number | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mapViewType, setMapViewType] = useState<"standard" | "satellite">("standard")
  const [isImmersiveMode, setIsImmersiveMode] = useState(false)
  
  // Extract primitive values for stable dependencies
  const propertiesLength = properties.length
  const placesLength = places.length
  const mapCenterLat = mapCenter[0]
  const mapCenterLng = mapCenter[1]

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const resizeHandler = () => {
      if (!mapRef.current) return
      mapRef.current.resize()
    }

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            "osm-tiles": {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: "osm-layer",
              type: "raster",
              source: "osm-tiles",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [mapCenter[1], mapCenter[0]],
        zoom: 15.5,
        pitch: 65,
        bearing: -20,
        touchZoomRotate: true,
        touchPitch: true,
        dragRotate: true,
        dragPan: true,
      })

      mapRef.current = map

      loadTimeoutRef.current = setTimeout(() => setIsMapLoaded(true), 1200)

      map.on("load", () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current)
          loadTimeoutRef.current = null
        }
        setIsMapLoaded(true)
        map.resize()

        // NO AUTO-ROTATION - Map stays static
        // User can manually rotate using controls

        // Enable touch interactions (pinch zoom, pan, rotate)
        map.touchZoomRotate.enable()
        map.dragRotate.enable()
        map.touchPitch.enable()

        // Add navigation control
        map.addControl(new maplibregl.NavigationControl(), "top-right")
      })

      map.on("error", (e) => {
        console.error("Map error:", e)
      })

    } catch (error) {
      console.error("Failed to initialize map:", error)
      setError("Failed to initialize 3D map. Please try again.")
    }

    // Handle ESC key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEsc)
    window.addEventListener("resize", resizeHandler)

    return () => {
      window.removeEventListener("keydown", handleEsc)
      window.removeEventListener("resize", resizeHandler)
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current)
        rotationRef.current = null
      }
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove()
        userLocationMarkerRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [mapCenter, onClose])

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const map = mapRef.current

    // Small delay to ensure map is fully rendered
    const addMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      
      // Clear user location marker
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove()
        userLocationMarkerRef.current = null
      }

      // Add user location marker FIRST with highest z-index
      const userLocationEl = document.createElement("div")
      userLocationEl.className = "sh-user-location-marker"
      userLocationEl.style.zIndex = "10000"
      userLocationEl.innerHTML = `
        <div class="sh-user-location-pulse"></div>
        <div class="sh-user-location-dot"></div>
        <div class="sh-user-location-ring"></div>
      `
      
      userLocationMarkerRef.current = new maplibregl.Marker({ 
        element: userLocationEl, 
        anchor: "center"
      })
        .setLngLat([mapCenter[1], mapCenter[0]])
        .addTo(map)

      const propertyColors = {
      PG: {
        base: "#3b82f6",
        top: "#60a5fa",
        side: "#2563eb",
        glow: "59, 130, 246",
      },
      Flat: {
        base: "#ef4444",
        top: "#f87171",
        side: "#dc2626",
        glow: "239, 68, 68",
      },
      Hostel: {
        base: "#a855f7",
        top: "#c084fc",
        side: "#9333ea",
        glow: "168, 85, 247",
      },
    } as const

    // Helper function to check if markers are too close (clustering)
    const areMarkersClose = (lat1: number, lng1: number, lat2: number, lng2: number, threshold: number = 0.0001) => {
      const latDiff = Math.abs(lat1 - lat2)
      const lngDiff = Math.abs(lng1 - lng2)
      return latDiff < threshold && lngDiff < threshold
    }

    // Group nearby properties for clustering
    const propertyGroups: Array<{ properties: typeof properties; center: [number, number] }> = []
    const processedIndices = new Set<number>()

    properties.forEach((property, index) => {
      if (!property.coordinates?.coordinates || processedIndices.has(index)) return
      const [lng, lat] = property.coordinates.coordinates
      
      // Find nearby properties
      const group = [property]
      processedIndices.add(index)
      
      properties.forEach((p, idx) => {
        if (idx === index || processedIndices.has(idx) || !p.coordinates?.coordinates) return
        const [plng, plat] = p.coordinates.coordinates
        if (areMarkersClose(lat, lng, plat, plng, 0.00015)) {
          group.push(p)
          processedIndices.add(idx)
        }
      })
      
      // Calculate center of group
      const avgLng = group.reduce((sum, p) => sum + p.coordinates!.coordinates[0], 0) / group.length
      const avgLat = group.reduce((sum, p) => sum + p.coordinates!.coordinates[1], 0) / group.length
      
      propertyGroups.push({ properties: group, center: [avgLng, avgLat] })
    })

    // Add property markers with clustering
    propertyGroups.forEach((group, groupIndex) => {
      const [lng, lat] = group.center
      const property = group.properties[0] // Use first property for styling
      const buildingHeight = Math.min(80, property.price / 150)
      const colorScheme =
        propertyColors[property.type as keyof typeof propertyColors] || propertyColors.PG

      const el = document.createElement("div")
      el.className = "sh-property-marker"
      el.style.setProperty("--marker-color-base", colorScheme.base)
      el.style.setProperty("--marker-color-top", colorScheme.top)
      el.style.setProperty("--marker-color-side", colorScheme.side)
      el.style.setProperty("--marker-color-glow", colorScheme.glow)
      el.style.setProperty("--marker-height", `${buildingHeight}px`)
      el.style.setProperty("--marker-delay", `${groupIndex * 80}ms`)
      el.style.zIndex = `${1000 + groupIndex}` // Stagger z-index

      const windowRows = Math.min(6, Math.floor(buildingHeight / 15))
      const windowsMarkup = Array.from({ length: windowRows * 2 })
        .map(() => '<span class="sh-property-marker__window"></span>')
        .join("")

      const clusterCount = group.properties.length > 1 ? group.properties.length : 0
      const badgeContent = clusterCount > 0 ? `<span class="sh-property-marker__cluster-badge">${clusterCount}</span>` : "🏠"

      el.innerHTML = `
        <div class="sh-property-marker__shadow"></div>
        <div class="sh-property-marker__tower">
          <div class="sh-property-marker__roof"></div>
          <div class="sh-property-marker__walls">
            <div class="sh-property-marker__windows">${windowsMarkup}</div>
          </div>
          <div class="sh-property-marker__side"></div>
        </div>
        <div class="sh-property-marker__badge">${badgeContent}</div>
      `

      el.addEventListener("mouseenter", () => {
        el.classList.add("sh-property-marker--active")
      })
      el.addEventListener("mouseleave", () => {
        el.classList.remove("sh-property-marker--active")
      })
      el.addEventListener("click", () => {
        if (group.properties.length === 1) {
          setSelectedItem({ type: "property", data: property })
        } else {
          setSelectedItem({ type: "cluster", data: { properties: group.properties, center: group.center } })
        }
        map.flyTo({
          center: [lng, lat],
          zoom: 17.5,
          pitch: 60,
          bearing: map.getBearing(),
          duration: 1800,
          essential: true,
        })
      })

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map)

      markersRef.current.push(marker)
    })
    }
    
    // Add markers after a small delay to ensure map is fully ready
    setTimeout(addMarkers, 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertiesLength, placesLength, mapCenterLat, mapCenterLng, isMapLoaded])

  const toggleRotation = () => {
    if (!mapRef.current || !isMapLoaded) return
    if (rotationRef.current) {
      cancelAnimationFrame(rotationRef.current)
      rotationRef.current = null
    } else {
      let bearing = mapRef.current.getBearing()
      const rotate = () => {
        if (!mapRef.current) return
        bearing = (bearing + 0.08) % 360
        mapRef.current.easeTo({ bearing, duration: 100, easing: (t: number) => t })
        rotationRef.current = requestAnimationFrame(rotate)
      }
      rotationRef.current = requestAnimationFrame(rotate)
    }
  }

  const resetView = () => {
    if (!mapRef.current || !isMapLoaded) return
    // Stop any rotation
    if (rotationRef.current) {
      cancelAnimationFrame(rotationRef.current)
      rotationRef.current = null
    }
    // Reset to center without auto-rotation
    mapRef.current.flyTo({
      center: [mapCenter[1], mapCenter[0]],
      zoom: 15.5,
      pitch: 65,
      bearing: -20,
      duration: 1500,
    })
  }

  const toggleMapView = () => {
    if (!mapRef.current || !isMapLoaded) return
    
    const map = mapRef.current
    
    if (mapViewType === "standard") {
      // Switch to satellite
      // Remove old layer and source
      if (map.getLayer("osm-layer")) {
        map.removeLayer("osm-layer")
      }
      if (map.getSource("osm-tiles")) {
        map.removeSource("osm-tiles")
      }
      
      // Add satellite source
      map.addSource("satellite-tiles", {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: '© Esri',
      })
      
      // Add satellite layer
      map.addLayer({
        id: "satellite-layer",
        type: "raster",
        source: "satellite-tiles",
        minzoom: 0,
        maxzoom: 19,
      })
      
      setMapViewType("satellite")
    } else {
      // Switch to standard
      // Remove old layer and source
      if (map.getLayer("satellite-layer")) {
        map.removeLayer("satellite-layer")
      }
      if (map.getSource("satellite-tiles")) {
        map.removeSource("satellite-tiles")
      }
      
      // Add OSM source
      map.addSource("osm-tiles", {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      })
      
      // Add OSM layer
      map.addLayer({
        id: "osm-layer",
        type: "raster",
        source: "osm-tiles",
        minzoom: 0,
        maxzoom: 19,
      })
      
      setMapViewType("standard")
    }
  }

  const toggleImmersiveMode = () => {
    setIsImmersiveMode(!isImmersiveMode)
  }

  const centerOnUserLocation = () => {
    if (!mapRef.current || !isMapLoaded) return
    // Stop any rotation
    if (rotationRef.current) {
      cancelAnimationFrame(rotationRef.current)
      rotationRef.current = null
    }
    // Fly to user location (mapCenter)
    mapRef.current.flyTo({
      center: [mapCenter[1], mapCenter[0]],
      zoom: 17,
      pitch: 65,
      bearing: mapRef.current.getBearing(),
      duration: 1200,
      essential: true,
    })
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-white text-xl font-bold mb-2">Oops! Something went wrong</div>
          <div className="text-gray-400 text-sm mb-6">{error}</div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-bold transition-all"
          >
            Back to 2D Map
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />

      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🗺️</div>
            <div className="text-white text-xl font-bold">Loading 3D Map...</div>
            <div className="text-gray-400 text-sm mt-2">Crafting the immersive cityscape</div>
          </div>
        </div>
      )}

      {/* Immersive Mode Toggle - Always visible at top center */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100000]">
        <button
          onClick={toggleImmersiveMode}
          className="p-4 bg-white/90 hover:bg-white rounded-xl shadow-xl transition-all backdrop-blur-sm"
          title={isImmersiveMode ? "Show Controls" : "Hide Controls (Immersive Mode)"}
        >
          {isImmersiveMode ? (
            <Eye className="w-5 h-5 text-blue-600" />
          ) : (
            <EyeOff className="w-5 h-5 text-slate-800" />
          )}
        </button>
      </div>

      {/* Modern Top Bar */}
      {!isImmersiveMode && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">🗺️</span>
                3D Immersive Map
              </h1>
              <p className="text-sm text-gray-300 mt-1">Explore properties & amenities in 3D</p>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Controls */}
      {!isImmersiveMode && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 space-y-3">
          <button
            onClick={toggleMapView}
            className="p-4 bg-white/90 hover:bg-white rounded-xl shadow-xl transition-all backdrop-blur-sm"
            title={mapViewType === "standard" ? "Switch to Satellite View" : "Switch to Standard View"}
          >
            <Globe className="w-5 h-5 text-green-600" />
          </button>
          <button
            onClick={toggleRotation}
            className="p-4 bg-white/90 hover:bg-white rounded-xl shadow-xl transition-all backdrop-blur-sm"
            title="Toggle rotation"
          >
            <RotateCcw className="w-5 h-5 text-slate-800" />
          </button>
          <button
            onClick={resetView}
            className="p-4 bg-white/90 hover:bg-white rounded-xl shadow-xl transition-all backdrop-blur-sm"
            title="Reset view"
          >
            <Maximize2 className="w-5 h-5 text-slate-800" />
          </button>
        </div>
      )}

      {/* Insights Panel */}
      {!isImmersiveMode && insights && (
        <div className="absolute right-6 top-24 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 max-w-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Area Insights</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">🍔 Food</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${insights.scores.food}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-900">{insights.scores.food}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">🏥 Health</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${insights.scores.health}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-900">{insights.scores.health}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">🚌 Transport</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${insights.scores.connectivity}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-900">{insights.scores.connectivity}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">🛡️ Safety</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${insights.scores.safety}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-900">{insights.scores.safety}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">⭐ Overall</span>
                <span className="text-2xl font-bold text-blue-600">{insights.scores.overall}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>📍 {properties.length} properties</div>
            <div>🏫 {insights.colleges || 0} colleges</div>
            <div>🍽️ {insights.restaurants || 0} restaurants</div>
            <div>🏥 {insights.hospitals || 0} hospitals</div>
          </div>
        </div>
      )}

      {/* Selected Property Card */}
      {!isImmersiveMode && selectedItem?.type === "property" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 z-[99998]">
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full text-gray-700"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{selectedItem.data.title}</h3>
          <p className="text-sm text-slate-600 mb-3">{selectedItem.data.location}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">₹{selectedItem.data.price}/mo</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {selectedItem.data.type}
            </span>
          </div>
        </div>
      )}

      {/* Selected Cluster Card */}
      {!isImmersiveMode && selectedItem?.type === "cluster" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 z-[99998]">
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full text-gray-700"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {selectedItem.data.properties.length} Properties
          </h3>
          <p className="text-sm text-slate-600 mb-4">Multiple properties in this area</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedItem.data.properties.slice(0, 5).map((prop: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 text-sm">{prop.title}</h4>
                    <p className="text-xs text-slate-600">{prop.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-600">₹{prop.price}/mo</span>
                    <span className="block text-xs text-slate-500">{prop.type}</span>
                  </div>
                </div>
              </div>
            ))}
            {selectedItem.data.properties.length > 5 && (
              <p className="text-xs text-slate-500 text-center pt-2">
                +{selectedItem.data.properties.length - 5} more properties
              </p>
            )}
          </div>
        </div>
      )}

      {/* GPS Location Button */}
      {!isImmersiveMode && (
        <div className={`absolute ${selectedItem ? 'bottom-32' : 'bottom-6'} left-6 flex flex-col gap-3 z-[10000]`}>
          <button
            onClick={centerOnUserLocation}
            className="p-4 bg-white hover:bg-gray-50 rounded-xl shadow-xl transition-all backdrop-blur-sm border border-gray-200"
            title="Center on your location"
          >
            <Navigation className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      )}

      {/* Legend */}
      {!isImmersiveMode && (
        <div className={`absolute ${selectedItem ? 'bottom-32' : 'bottom-6'} left-20 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-4 transition-all duration-300 z-[10000]`}>
          <h4 className="text-xs font-bold text-slate-900 mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-slate-700">PG</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-700">Flat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-slate-700">Hostel</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
              <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>
              <span className="text-slate-700">Your Location</span>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes marker-rise {
          from {
            transform: translateY(14px) scale(0.85);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes marker-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes marker-ping {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          70% {
            transform: scale(1.9);
            opacity: 0;
          }
          100% {
            transform: scale(1.9);
            opacity: 0;
          }
        }

        .sh-property-marker {
          position: relative;
          width: 54px;
          min-height: calc(var(--marker-height, 60px) + 44px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          transform-origin: bottom center;
          transform: translateY(10px) scale(0.92);
          opacity: 0;
          animation: marker-rise 0.6s ease-out forwards;
          animation-delay: var(--marker-delay, 0ms);
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          will-change: transform;
        }

        .sh-property-marker--active {
          transform: translateY(-8px) scale(1.08);
        }

        .sh-property-marker::after {
          content: "";
          position: absolute;
          bottom: 4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--marker-color-base);
          box-shadow: 0 0 16px rgba(var(--marker-color-glow), 0.75);
          animation: marker-ping 2.2s ease-out infinite;
        }

        .sh-property-marker__shadow {
          width: 40px;
          height: 10px;
          background: radial-gradient(circle at center, rgba(var(--marker-color-glow), 0.35), transparent 70%);
          filter: blur(3px);
          margin-bottom: 6px;
        }

        .sh-property-marker__tower {
          position: relative;
          width: 44px;
          height: var(--marker-height, 60px);
          background: linear-gradient(135deg, var(--marker-color-base), var(--marker-color-top));
          border-radius: 8px 8px 6px 6px;
          box-shadow:
            0 14px 30px rgba(var(--marker-color-glow), 0.35),
            inset 0 -6px 12px rgba(0, 0, 0, 0.18),
            inset 0 6px 12px rgba(255, 255, 255, 0.28);
          border: 2px solid rgba(255, 255, 255, 0.42);
          overflow: hidden;
        }

        .sh-property-marker__walls {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .sh-property-marker__windows {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          padding: 10px 8px;
          height: 100%;
          align-content: center;
        }

        .sh-property-marker__window {
          display: block;
          height: 12px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.18);
        }

        .sh-property-marker__roof {
          position: absolute;
          top: -9px;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 12px;
          background: linear-gradient(to bottom, var(--marker-color-top), var(--marker-color-base));
          border-radius: 6px;
          box-shadow: 0 8px 20px rgba(var(--marker-color-glow), 0.45);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .sh-property-marker__side {
          position: absolute;
          top: 10px;
          right: -6px;
          width: 8px;
          height: calc(var(--marker-height, 60px) - 12px);
          background: var(--marker-color-side);
          opacity: 0.7;
          transform: skewY(-14deg);
          transform-origin: top left;
          border-radius: 0 4px 4px 0;
          filter: brightness(0.9);
        }

        .sh-property-marker__badge {
          position: absolute;
          top: calc(50% - 14px);
          left: 50%;
          transform: translate(-50%, -50%);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: 4px solid var(--marker-color-base);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
          z-index: 2;
        }

        .sh-amenity-marker {
          position: relative;
          width: 58px;
          height: 74px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          transform-origin: bottom center;
          transform: translateY(10px) scale(0.94);
          opacity: 0;
          animation: marker-rise 0.55s ease-out forwards;
          animation-delay: var(--amenity-delay, 0ms);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          will-change: transform;
        }

        .sh-amenity-marker--active {
          transform: translateY(-6px) scale(1.08);
        }

        .sh-amenity-marker__shadow {
          width: 38px;
          height: 10px;
          background: radial-gradient(circle at center, rgba(0, 0, 0, 0.28), transparent 70%);
          filter: blur(2px);
          margin-bottom: 6px;
        }

        .sh-amenity-marker__platform {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--amenity-bg), #ffffff);
          border: 3px solid var(--amenity-color);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 12px 24px rgba(0, 0, 0, 0.2),
            inset 0 -5px 12px rgba(0, 0, 0, 0.08),
            inset 0 5px 12px rgba(255, 255, 255, 0.9);
          overflow: hidden;
        }

        .sh-amenity-marker__icon {
          font-size: 26px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          animation: marker-float 3s ease-in-out infinite;
        }

        .sh-amenity-marker__shine {
          position: absolute;
          top: 6px;
          left: 6px;
          right: 6px;
          height: 35%;
          border-radius: 12px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.55), transparent);
        }

        .sh-amenity-marker__label {
          margin-top: 6px;
          background: var(--amenity-color);
          color: white;
          padding: 4px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          transform: scale(0.7);
          opacity: 0;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
          pointer-events: none;
        }

        .sh-amenity-marker__label--active {
          transform: scale(1);
          opacity: 1;
        }

        .sh-amenity-marker::after {
          content: "";
          position: absolute;
          bottom: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--amenity-color);
          box-shadow: 0 0 14px var(--amenity-color);
          animation: marker-ping 2.4s ease-out infinite;
          opacity: 0.8;
        }

        .maplibregl-canvas {
          outline: none;
        }

        .sh-user-location-marker {
          position: relative;
          width: 48px;
          height: 48px;
          z-index: 10000 !important;
        }

        .sh-user-location-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6), 0 0 0 4px rgba(59, 130, 246, 0.2);
          z-index: 3;
        }

        .sh-user-location-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 48px;
          height: 48px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: user-location-pulse 2s ease-out infinite;
          z-index: 1;
        }

        .sh-user-location-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          border: 2px solid rgba(59, 130, 246, 0.5);
          border-radius: 50%;
          animation: user-location-ring 2s ease-out infinite;
          z-index: 2;
        }

        @keyframes user-location-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        @keyframes user-location-ring {
          0% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0;
          }
        }

        .sh-property-marker__cluster-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          z-index: 10;
        }

        .sh-amenity-marker__cluster-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          z-index: 10;
        }
      `}</style>
    </div>
  )
}

export default Map3DWorld
