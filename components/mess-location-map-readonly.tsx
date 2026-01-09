"use client"

import { useEffect, useRef, useState } from "react"
// @ts-ignore
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface MessLocationMapReadonlyProps {
  address: string
  coordinates?: { coordinates?: [number, number] } | { coordinates?: number[] } | null
  className?: string
  heightClassName?: string
}

export function MessLocationMapReadonly({
  address,
  coordinates,
  className = "",
  heightClassName = "h-[360px]",
}: MessLocationMapReadonlyProps) {
  const [leaflet, setLeaflet] = useState<any>(null)
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const destMarkerRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const routeLayerRef = useRef<any>(null)

  const [position, setPosition] = useState<[number, number] | null>(null)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [navActive, setNavActive] = useState(false)
  const [headingDeg, setHeadingDeg] = useState<number | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const lastRerouteRef = useRef<{ at: number; lat: number; lng: number } | null>(null)
  const deviceOrientationCleanupRef = useRef<(() => void) | null>(null)
  const lastPositionRef = useRef<[number, number] | null>(null)
  const headingTargetRef = useRef<number | null>(null)
  const headingAnimFrameRef = useRef<number | null>(null)
  const headingDisplayRef = useRef<number>(0)

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
        setError("Failed to load map.")
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const coords = (coordinates as any)?.coordinates
    if (Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords
      if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        setPosition([lat, lng])
        return
      }
    }

    const addressText = (address || "").trim()
    if (!addressText) {
      setPosition(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/geocode?address=${encodeURIComponent(addressText)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Geocoding failed: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const lat = typeof data?.lat === "string" ? parseFloat(data.lat) : data?.lat
        const lng = typeof data?.lng === "string" ? parseFloat(data.lng) : data?.lng
        if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
          throw new Error("Invalid geocode response")
        }
        setPosition([lat, lng])
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to geocode address:", err)
        setError("Could not locate this address on the map.")
        setPosition(null)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [address, coordinates])

  useEffect(() => {
    if (!leaflet) return
    if (!containerRef.current) return

    if (!mapRef.current) {
      try {
        mapRef.current = leaflet.map(containerRef.current, {
          attributionControl: true,
          zoomControl: true,
        }).setView([20.5937, 78.9629], 4)

        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current)
      } catch (e) {
        console.error("Map initialization error:", e)
      }
    }
  }, [leaflet])

  const degreesToCompass = (deg: number) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    const index = Math.round(((deg % 360) / 45)) % 8
    return directions[index]
  }

  const makeUserArrowIcon = (deg: number | null) => {
    const label = typeof deg === "number" && Number.isFinite(deg) ? degreesToCompass(deg) : ""

    return leaflet.divIcon({
      html: `<div class="flex items-center justify-center">
        <div class="relative w-10 h-10">
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-4 border-white shadow-lg"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="nav-arrow" style="transform: rotate(0deg); transform-origin: 50% 50%; transition: transform 120ms linear;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L20 22L12 18L4 22L12 2Z" fill="white"/>
              </svg>
            </div>
          </div>
          ${label ? `<div class="nav-compass absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-blue-700 bg-white/90 border border-blue-200 rounded px-1 shadow-sm">${label}</div>` : `<div class="nav-compass" style="display:none"></div>`}
        </div>
      </div>`,
      className: "",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    })
  }

  const normalizeDeg = (deg: number) => {
    let d = deg % 360
    if (d < 0) d += 360
    return d
  }

  const shortestAngleDelta = (from: number, to: number) => {
    const a = normalizeDeg(from)
    const b = normalizeDeg(to)
    let delta = b - a
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    return delta
  }

  const setHeadingTarget = (deg: number | null) => {
    headingTargetRef.current = typeof deg === "number" && Number.isFinite(deg) ? normalizeDeg(deg) : null
    setHeadingDeg(deg)
  }

  const updateUserMarkerHeadingDom = () => {
    const marker = userMarkerRef.current
    if (!marker) return
    const el: HTMLElement | null = marker.getElement?.() ?? null
    if (!el) return

    const arrowEl = el.querySelector<HTMLElement>(".nav-arrow")
    const compassEl = el.querySelector<HTMLElement>(".nav-compass")
    if (!arrowEl) return

    const target = headingTargetRef.current
    if (typeof target !== "number") return

    arrowEl.style.transform = `rotate(${target}deg)`
    if (compassEl) {
      compassEl.style.display = "block"
      compassEl.textContent = degreesToCompass(target)
    }
  }

  const startHeadingAnimationLoop = () => {
    if (headingAnimFrameRef.current !== null) return

    const tick = () => {
      const target = headingTargetRef.current
      if (typeof target === "number") {
        const current = headingDisplayRef.current
        const delta = shortestAngleDelta(current, target)
        // Smooth approach (fast but stable)
        headingDisplayRef.current = normalizeDeg(current + delta * 0.25)

        const marker = userMarkerRef.current
        const el: HTMLElement | null = marker?.getElement?.() ?? null
        const arrowEl = el?.querySelector<HTMLElement>(".nav-arrow")
        const compassEl = el?.querySelector<HTMLElement>(".nav-compass")
        if (arrowEl) {
          arrowEl.style.transform = `rotate(${headingDisplayRef.current}deg)`
        }
        if (compassEl) {
          compassEl.style.display = "block"
          compassEl.textContent = degreesToCompass(headingDisplayRef.current)
        }
      }

      headingAnimFrameRef.current = window.requestAnimationFrame(tick)
    }

    headingAnimFrameRef.current = window.requestAnimationFrame(tick)
  }

  const stopHeadingAnimationLoop = () => {
    if (headingAnimFrameRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(headingAnimFrameRef.current)
      headingAnimFrameRef.current = null
    }
  }

  useEffect(() => {
    if (!leaflet) return
    if (!mapRef.current) return
    if (!position) return

    const map = mapRef.current

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current)
      destMarkerRef.current = null
    }

    const pinIcon = leaflet.divIcon({
      html: `<div class="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full border-4 border-white shadow-lg">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
        </svg>
      </div>`,
      className: "",
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    })

    destMarkerRef.current = leaflet
      .marker(position, { icon: pinIcon })
      .bindPopup(`<div class="font-semibold">${address}</div>`, { maxWidth: 260 })
      .addTo(map)

    map.setView(position, 15)
  }, [leaflet, position, address])

  const clearRoute = () => {
    const map = mapRef.current
    if (!leaflet || !map) return

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }
    setUserPosition(null)
    setRouteInfo(null)
  }

  const stopNavigation = () => {
    setNavActive(false)
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (deviceOrientationCleanupRef.current) {
      deviceOrientationCleanupRef.current()
      deviceOrientationCleanupRef.current = null
    }
    stopHeadingAnimationLoop()
  }

  // Ensure we stop navigation if component unmounts
  useEffect(() => {
    return () => {
      stopNavigation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ensureUserLocation = async (): Promise<[number, number] | null> => {
    if (userPosition) return userPosition
    if (typeof window === "undefined") return null
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.")
      return null
    }

    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const ll: [number, number] = [lat, lng]
          setUserPosition(ll)
          resolve(ll)
        },
        (err) => {
          console.error("Geolocation error:", err)
          setError("Location permission denied. Please allow location to show the route.")
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      )
    })
  }

  const startDeviceHeading = async () => {
    if (typeof window === "undefined") return
    if (typeof DeviceOrientationEvent === "undefined") return

    const handler = (event: DeviceOrientationEvent) => {
      const alpha = (event as any).webkitCompassHeading ?? event.alpha
      if (typeof alpha === "number" && Number.isFinite(alpha)) {
        // 0..360, where 0 is North
        setHeadingTarget(alpha)
      }
    }

    // iOS requires explicit permission
    const anyDOE: any = DeviceOrientationEvent as any
    if (typeof anyDOE.requestPermission === "function") {
      try {
        const result = await anyDOE.requestPermission()
        if (result !== "granted") return
      } catch {
        return
      }
    }

    // Prefer absolute if available
    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation"
    window.addEventListener(eventName as any, handler as any, true)
    deviceOrientationCleanupRef.current = () => window.removeEventListener(eventName as any, handler as any, true)
  }

  const bearingDeg = (from: [number, number], to: [number, number]) => {
    const toRad = (x: number) => (x * Math.PI) / 180
    const toDeg = (x: number) => (x * 180) / Math.PI
    const [lat1, lon1] = from
    const [lat2, lon2] = to
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
    return normalizeDeg(toDeg(Math.atan2(y, x)))
  }

  const metersBetween = (a: [number, number], b: [number, number]) => {
    const R = 6371000
    const toRad = (x: number) => (x * Math.PI) / 180
    const dLat = toRad(b[0] - a[0])
    const dLon = toRad(b[1] - a[1])
    const lat1 = toRad(a[0])
    const lat2 = toRad(b[0])
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
  }

  const showRoute = async () => {
    if (!leaflet || !mapRef.current) return
    setError(null)

    if (!position) {
      setError("Destination location is not available.")
      return
    }

    setRouteLoading(true)
    try {
      const userLL = await ensureUserLocation()
      if (!userLL) return

      const [fromLat, fromLng] = userLL
      const [toLat, toLng] = position

      // OSRM expects lon,lat
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`Routing failed: ${res.status}`)
      }
      const data = await res.json()
      const coords: any[] = data?.routes?.[0]?.geometry?.coordinates
      if (!Array.isArray(coords) || coords.length < 2) {
        throw new Error("Invalid route data")
      }

      const distanceM = Number(data?.routes?.[0]?.distance)
      const durationS = Number(data?.routes?.[0]?.duration)
      if (Number.isFinite(distanceM) && Number.isFinite(durationS)) {
        setRouteInfo({ distanceKm: Math.round((distanceM / 1000) * 10) / 10, durationMin: Math.max(1, Math.round(durationS / 60)) })
      } else {
        setRouteInfo(null)
      }

      const latLngs: [number, number][] = coords.map((c) => [c[1], c[0]])

      const map = mapRef.current

      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current)
        routeLayerRef.current = null
      }
      routeLayerRef.current = leaflet.polyline(latLngs, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.9,
      }).addTo(map)

      // Start marker
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current)
        userMarkerRef.current = null
      }
      const startIcon = makeUserArrowIcon(headingTargetRef.current)
      userMarkerRef.current = leaflet
        .marker([fromLat, fromLng], { icon: startIcon })
        .bindPopup(`<div class="font-semibold">Your Location</div>`, { maxWidth: 200 })
        .addTo(map)

      // Ensure the DOM updates even if Leaflet delays element creation
      setTimeout(() => {
        updateUserMarkerHeadingDom()
      }, 50)

      const bounds = leaflet.latLngBounds([userLL, position])
      bounds.extend(latLngs)
      map.fitBounds(bounds, { padding: [40, 40] })
    } catch (err) {
      console.error("Failed to build route:", err)
      setError("Could not build route right now. Please try again.")
    } finally {
      setRouteLoading(false)
    }
  }

  const updateUserMarker = (lat: number, lng: number) => {
    if (!leaflet || !mapRef.current) return
    const map = mapRef.current

    if (!userMarkerRef.current) {
      const icon = makeUserArrowIcon(headingTargetRef.current)
      userMarkerRef.current = leaflet.marker([lat, lng], { icon }).addTo(map)
      setTimeout(() => {
        updateUserMarkerHeadingDom()
      }, 50)
      return
    }

    userMarkerRef.current.setLatLng([lat, lng])
    // Update heading without recreating icon (smooth)
    updateUserMarkerHeadingDom()
  }

  // Update arrow rotation even if we are not moving
  useEffect(() => {
    if (!navActive) return
    if (!userPosition) return
    updateUserMarker(userPosition[0], userPosition[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headingDeg])

  const startNavigation = async () => {
    if (navActive) return
    if (typeof window === "undefined") return

    setError(null)
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.")
      return
    }
    if (!position) {
      setError("Destination location is not available.")
      return
    }

    setNavActive(true)
    await startDeviceHeading()

    // Smooth heading animation loop
    startHeadingAnimationLoop()

    // Initial route
    await showRoute()

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const next: [number, number] = [lat, lng]
        setUserPosition(next)

        // Prefer GPS heading when available
        if (typeof pos.coords.heading === "number" && Number.isFinite(pos.coords.heading)) {
          setHeadingTarget(pos.coords.heading)
        } else {
          // Fallback: infer bearing from movement if device heading is not available
          const prev = lastPositionRef.current
          if (prev) {
            const moved = metersBetween(prev, next)
            if (moved > 6) {
              setHeadingTarget(bearingDeg(prev, next))
            }
          }
        }

        lastPositionRef.current = next

        updateUserMarker(lat, lng)

        // Follow user
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom?.() ?? 15, 15), { animate: true })
        }

        // Reroute occasionally or when moved enough
        const now = Date.now()
        const last = lastRerouteRef.current
        const movedEnough = last ? metersBetween([last.lat, last.lng], [lat, lng]) > 40 : true
        const timeEnough = last ? now - last.at > 20000 : true

        if (movedEnough || timeEnough) {
          lastRerouteRef.current = { at: now, lat, lng }
          await showRoute()
        }
      },
      (err) => {
        console.error("watchPosition error:", err)
        setError("Could not track your location. Please allow location access.")
        stopNavigation()
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div ref={containerRef} className={`w-full ${heightClassName} rounded-lg border overflow-hidden`} />
      {loading && <p className="text-xs text-muted-foreground">Locating on map…</p>}
      {routeInfo && (
        <div className="text-sm text-muted-foreground">
          ETA <span className="font-semibold text-foreground">{routeInfo.durationMin} min</span> • {routeInfo.distanceKm} km
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {!navActive ? (
          <Button type="button" className="bg-orange-500 hover:bg-orange-600" onClick={startNavigation} disabled={routeLoading || loading || !position}>
            {routeLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting…
              </>
            ) : (
              "Start navigation"
            )}
          </Button>
        ) : (
          <Button type="button" className="bg-red-500 hover:bg-red-600" onClick={stopNavigation}>
            Stop navigation
          </Button>
        )}

        <Button type="button" variant="outline" onClick={showRoute} disabled={routeLoading || loading || !position}>
          Preview route
        </Button>
        <Button type="button" variant="outline" onClick={clearRoute} disabled={routeLoading}>
          Clear route
        </Button>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    </div>
  )
}
