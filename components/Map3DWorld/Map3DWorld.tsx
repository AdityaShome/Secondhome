"use client"

import React, { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { X, Maximize2, RotateCcw } from "lucide-react"

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
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        antialias: true,
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

        // Smooth continuous rotation with easing
        let bearing = map.getBearing()
        const rotate = () => {
          if (!mapRef.current) return
          bearing = (bearing + 0.05) % 360
          map.easeTo({ 
            bearing, 
            duration: 50, 
            easing: (t: number) => t 
          })
          rotationRef.current = requestAnimationFrame(rotate)
        }
        rotationRef.current = requestAnimationFrame(rotate)

        // Markers are handled in a separate effect once data arrives

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
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [mapCenter, onClose])

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const map = mapRef.current

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

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

    properties.forEach((property, index) => {
      if (!property.coordinates?.coordinates) return
      const [lng, lat] = property.coordinates.coordinates
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
      el.style.setProperty("--marker-delay", `${index * 60}ms`)

      const windowRows = Math.min(6, Math.floor(buildingHeight / 15))
      const windowsMarkup = Array.from({ length: windowRows * 2 })
        .map(() => '<span class="sh-property-marker__window"></span>')
        .join("")

      el.innerHTML = `
        <div class="sh-property-marker__shadow"></div>
        <div class="sh-property-marker__tower">
          <div class="sh-property-marker__roof"></div>
          <div class="sh-property-marker__walls">
            <div class="sh-property-marker__windows">${windowsMarkup}</div>
          </div>
          <div class="sh-property-marker__side"></div>
        </div>
        <div class="sh-property-marker__badge">🏠</div>
      `

      el.addEventListener("mouseenter", () => {
        el.classList.add("sh-property-marker--active")
      })
      el.addEventListener("mouseleave", () => {
        el.classList.remove("sh-property-marker--active")
      })
      el.addEventListener("click", () => {
        setSelectedItem({ type: "property", data: property })
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

    const amenityConfig: { [key: string]: { icon: string; color: string; bgColor: string; label: string } } = {
      restaurant: { icon: "🍽️", color: "#f59e0b", bgColor: "#fef3c7", label: "Restaurant" },
      hospital: { icon: "🏥", color: "#ef4444", bgColor: "#fee2e2", label: "Hospital" },
      transport: { icon: "🚌", color: "#8b5cf6", bgColor: "#ede9fe", label: "Bus Stop" },
      college: { icon: "🎓", color: "#eab308", bgColor: "#fef9c3", label: "College" },
      atm: { icon: "💰", color: "#10b981", bgColor: "#d1fae5", label: "ATM" },
      gym: { icon: "💪", color: "#ec4899", bgColor: "#fce7f3", label: "Gym" },
      grocery: { icon: "🛒", color: "#f97316", bgColor: "#ffedd5", label: "Grocery" },
      pharmacy: { icon: "💊", color: "#06b6d4", bgColor: "#cffafe", label: "Pharmacy" },
      police: { icon: "👮", color: "#3b82f6", bgColor: "#dbeafe", label: "Police" },
    }

    places.forEach((place, index) => {
      const config = amenityConfig[place.type] || {
        icon: "📍",
        color: "#6b7280",
        bgColor: "#f3f4f6",
        label: "Place",
      }

      const el = document.createElement("div")
      el.className = "sh-amenity-marker"
      el.style.setProperty("--amenity-color", config.color)
      el.style.setProperty("--amenity-bg", config.bgColor)
      el.style.setProperty("--amenity-delay", `${index * 50}ms`)

      el.innerHTML = `
        <div class="sh-amenity-marker__shadow"></div>
        <div class="sh-amenity-marker__platform">
          <span class="sh-amenity-marker__icon">${config.icon}</span>
          <span class="sh-amenity-marker__shine"></span>
        </div>
        <span class="sh-amenity-marker__label">${config.label}</span>
      `

      const label = el.querySelector(".sh-amenity-marker__label") as HTMLElement

      el.addEventListener("mouseenter", () => {
        el.classList.add("sh-amenity-marker--active")
        label.classList.add("sh-amenity-marker__label--active")
      })
      el.addEventListener("mouseleave", () => {
        el.classList.remove("sh-amenity-marker--active")
        label.classList.remove("sh-amenity-marker__label--active")
      })

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([place.lon, place.lat])
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [properties, places, isMapLoaded])

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
    if (rotationRef.current) {
      cancelAnimationFrame(rotationRef.current)
      rotationRef.current = null
    }
    mapRef.current.flyTo({
      center: [mapCenter[1], mapCenter[0]],
      zoom: 15.5,
      pitch: 65,
      bearing: -20,
      duration: 1500,
    })
    // Restart rotation after reset
    setTimeout(() => {
      if (!mapRef.current || !isMapLoaded) return
      let bearing = mapRef.current.getBearing()
      const rotate = () => {
        if (!mapRef.current) return
        bearing = (bearing + 0.08) % 360
        mapRef.current.easeTo({ bearing, duration: 100, easing: (t: number) => t })
        rotationRef.current = requestAnimationFrame(rotate)
      }
      rotationRef.current = requestAnimationFrame(rotate)
    }, 1600)
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

      {/* Modern Top Bar */}
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

      {/* Floating Controls */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 space-y-3">
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

      {/* Insights Panel */}
      {insights && (
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
      {selectedItem?.type === "property" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full"
          >
            <X className="w-4 h-4" />
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

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-4">
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
        </div>
      </div>

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
      `}</style>
    </div>
  )
}

export default Map3DWorld
