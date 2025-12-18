"use client"

import React, { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

interface Map3DProps {
  center?: [number, number]
  onClose?: () => void
  quality?: "low" | "medium" | "high"
}

export default function Map3D({ center = [77.5946, 12.9716], onClose, quality = "medium" }: Map3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose && onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap Contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [center[1], center[0]],
      zoom: quality === "low" ? 14 : quality === "medium" ? 15 : 16,
      pitch: quality === "low" ? 45 : quality === "medium" ? 55 : 60,
      bearing: -17,
    })

    mapRef.current = map

    map.on("load", () => {
      // Add navigation controls
      map.addControl(new maplibregl.NavigationControl(), "top-left")

      // Slow rotating animation for immersive feel
      let bearing = map.getBearing()
      const speed = quality === "low" ? 0.015 : quality === "medium" ? 0.025 : 0.035

      const animate = () => {
        bearing = (bearing + speed) % 360
        map.easeTo({ bearing, duration: 1000, easing: (t: number) => t })
        animRef.current = requestAnimationFrame(animate)
      }
      animRef.current = requestAnimationFrame(animate)
    })

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      try {
        map.remove()
      } catch (e) {
        // ignore
      }
    }
  }, [center, quality])

  return (
    <div className="fixed left-0 right-0 top-16 bottom-0 z-[99999] flex items-start justify-center pointer-events-auto">
      <div className="absolute left-0 right-0 bottom-0 top-16 bg-black/40" onClick={onClose} />
      <div className="relative w-[88vw] max-w-5xl h-[72vh] mt-4 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-white">
        <div ref={containerRef} className="w-full h-full" />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-800 rounded-full px-3 py-2 shadow-lg z-10 font-medium"
          aria-label="Close 3D view"
        >
          ✕ Close
        </button>
        <div className="absolute left-4 bottom-4 text-sm text-white bg-black/60 px-3 py-2 rounded-md z-10 backdrop-blur-sm">
          🗺️ Interactive 3D Map View
        </div>
      </div>
    </div>
  )
}
