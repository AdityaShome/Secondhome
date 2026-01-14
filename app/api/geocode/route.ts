import { NextRequest, NextResponse } from "next/server"

type GeocodeForwardInput = {
  address: string
  city?: string
  state?: string
  pincode?: string
  country?: string
}

function compactParts(parts: Array<string | undefined | null>) {
  return parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
}

function isLikelyIndiaPin(pincode?: string) {
  return typeof pincode === "string" && /^\d{6}$/.test(pincode.trim())
}

function buildQueryCandidates(input: GeocodeForwardInput) {
  const address = (input.address || "").trim()
  const city = (input.city || "").trim()
  const state = (input.state || "").trim()
  const pincode = (input.pincode || "").trim()
  const country = (input.country || "India").trim()

  // Keep the user's raw input as the first attempt.
  const base = address

  const withContext = compactParts([
    address,
    city,
    state,
    isLikelyIndiaPin(pincode) ? pincode : undefined,
    country,
  ]).join(", ")

  const contextOnly = compactParts([
    city,
    state,
    isLikelyIndiaPin(pincode) ? pincode : undefined,
    country,
  ]).join(", ")

  const candidates = [base, withContext]
  if (contextOnly) candidates.push(contextOnly)

  // If user typed a POI name only, Nominatim often needs a city/state.
  if (address && city && state && address.length < 25) {
    candidates.push(`${address}, ${city}, ${state}, ${country}`)
  }

  // Ensure “India” is present for ambiguous queries.
  if (address && !/\bindia\b/i.test(address)) {
    candidates.push(`${address}, ${country}`)
  }

  // De-dupe and keep reasonably sized queries.
  const seen = new Set<string>()
  return candidates
    .map((q) => q.replace(/\s+/g, " ").trim())
    .filter((q) => q.length >= 3)
    .filter((q) => {
      const key = q.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
}

function getNominatimHeaders() {
  const contact =
    process.env.OFFICIAL_VERIFICATION_EMAIL ||
    process.env.HOST_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "support@secondhome.site"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://secondhome.site"
  return {
    "User-Agent": `SecondHome/1.0 (${siteUrl}; contact: ${contact})`,
    "Accept-Language": "en",
    Referer: siteUrl,
  }
}

async function nominatimSearch(q: string) {
  const email =
    process.env.OFFICIAL_VERIFICATION_EMAIL ||
    process.env.HOST_EMAIL ||
    process.env.ADMIN_EMAIL ||
    ""
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}` +
    (email ? `&email=${encodeURIComponent(email)}` : "")

  const res = await fetch(url, {
    headers: getNominatimHeaders(),
    // Avoid caching stale/blocked responses.
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Nominatim ${res.status}: ${body.slice(0, 120)}`)
  }
  return (await res.json()) as any[]
}

async function photonSearch(q: string) {
  const url = `https://photon.komoot.io/api/?limit=5&lang=en&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Photon ${res.status}: ${body.slice(0, 120)}`)
  }
  const data = await res.json().catch(() => null)
  const features: any[] = Array.isArray(data?.features) ? data.features : []
  return features
}

function pickBestLatLngFromNominatim(results: any[], input: GeocodeForwardInput) {
  if (!Array.isArray(results) || results.length === 0) return null

  const city = (input.city || "").trim().toLowerCase()
  const state = (input.state || "").trim().toLowerCase()
  const pincode = (input.pincode || "").trim()

  const scored = results
    .map((r) => {
      const addr = r?.address || {}
      const resCity = String(addr.city || addr.town || addr.village || addr.county || "").toLowerCase()
      const resState = String(addr.state || "").toLowerCase()
      const resPost = String(addr.postcode || "")
      let score = 0
      if (city && resCity.includes(city)) score += 3
      if (state && resState.includes(state)) score += 2
      if (pincode && resPost === pincode) score += 3
      // Prefer higher importance when tie.
      const importance = typeof r?.importance === "number" ? r.importance : 0
      return { r, score, importance }
    })
    .sort((a, b) => b.score - a.score || b.importance - a.importance)

  const best = scored[0]?.r
  if (!best) return null
  const lat = parseFloat(best.lat)
  const lng = parseFloat(best.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng, display: best.display_name }
}

function pickBestLatLngFromPhoton(features: any[]) {
  if (!Array.isArray(features) || features.length === 0) return null
  const best = features[0]
  const coords = best?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const lng = Number(coords[0])
  const lat = Number(coords[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const props = best?.properties || {}
  const label = props?.name
    ? `${props.name}${props.city ? ", " + props.city : ""}${props.state ? ", " + props.state : ""}`
    : props?.label
  return { lat, lng, display: label || "" }
}

async function geocodeForward(input: GeocodeForwardInput) {
  const candidates = buildQueryCandidates(input)

  // First try Nominatim with good headers + context scoring.
  for (const q of candidates) {
    try {
      const res = await nominatimSearch(q)
      const picked = pickBestLatLngFromNominatim(res, input)
      if (picked) {
        return {
          lat: picked.lat,
          lng: picked.lng,
          address: picked.display,
          formatted_address: picked.display,
          provider: "nominatim",
          query: q,
        }
      }
    } catch (e) {
      // Continue to next candidate.
      console.warn("Nominatim search failed:", q, e)
    }
  }

  // Fallback to Photon.
  for (const q of candidates) {
    try {
      const features = await photonSearch(q)
      const picked = pickBestLatLngFromPhoton(features)
      if (picked) {
        return {
          lat: picked.lat,
          lng: picked.lng,
          address: picked.display,
          formatted_address: picked.display,
          provider: "photon",
          query: q,
        }
      }
    } catch (e) {
      console.warn("Photon search failed:", q, e)
    }
  }

  return null
}

async function geocodeReverse(lat: string, lng: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      { headers: getNominatimHeaders(), cache: "no-store" }
    )
    const data = await response.json().catch(() => null)

    if (data && data.address) {
      const addressParts: string[] = []
      if (data.address.house_number) addressParts.push(data.address.house_number)
      if (data.address.road) addressParts.push(data.address.road)
      if (data.address.suburb) addressParts.push(data.address.suburb)
      if (data.address.city || data.address.town) addressParts.push(data.address.city || data.address.town)
      if (data.address.state) addressParts.push(data.address.state)
      if (data.address.postcode) addressParts.push(data.address.postcode)

      return {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: data.display_name,
        formatted_address: addressParts.join(", ") || data.display_name,
        city: data.address.city || data.address.town || "",
        state: data.address.state || "",
        pincode: data.address.postcode || "",
        locality: data.address.suburb || data.address.neighbourhood || "",
        provider: "nominatim",
      }
    }

    return null
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&key=${apiKey}`
  )
  const data = await response.json().catch(() => null)

  if (data?.status === "OK" && Array.isArray(data?.results) && data.results.length > 0) {
    const result = data.results[0]
    const addressComponents: any = {}
    result.address_components?.forEach((component: any) => {
      if (component.types?.includes("locality")) addressComponents.city = component.long_name
      if (component.types?.includes("administrative_area_level_1")) addressComponents.state = component.long_name
      if (component.types?.includes("postal_code")) addressComponents.pincode = component.long_name
      if (component.types?.includes("sublocality") || component.types?.includes("neighborhood")) {
        addressComponents.locality = component.long_name
      }
    })

    return {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      address: result.formatted_address,
      formatted_address: result.formatted_address,
      city: addressComponents.city || "",
      state: addressComponents.state || "",
      pincode: addressComponents.pincode || "",
      locality: addressComponents.locality || "",
      place_id: result.place_id,
      provider: "google",
    }
  }

  return null
}

async function handleGeocode(params: {
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  lat?: string | null
  lng?: string | null
}) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  // Forward
  if (params.address) {
    if (apiKey) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(params.address)}&key=${apiKey}`
      )
      const data = await response.json().catch(() => null)
      if (data?.status === "OK" && Array.isArray(data?.results) && data.results.length > 0) {
        const result = data.results[0]
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address,
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          provider: "google",
        }
      }
    }

    const picked = await geocodeForward({
      address: params.address,
      city: params.city || undefined,
      state: params.state || undefined,
      pincode: params.pincode || undefined,
      country: "India",
    })
    return picked
  }

  // Reverse
  if (params.lat && params.lng) {
    return await geocodeReverse(params.lat, params.lng)
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")
    const city = searchParams.get("city")
    const state = searchParams.get("state")
    const pincode = searchParams.get("pincode")
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")

    const result = await handleGeocode({ address, city, state, pincode, lat, lng })
    if (!result) {
      return NextResponse.json({ error: address ? "Address not found" : "Location not found" }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("Geocoding error:", error)
    return NextResponse.json({ error: "An error occurred during geocoding" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { address, city, state, pincode, lat, lng } = body || {}
    const result = await handleGeocode({ address, city, state, pincode, lat, lng })
    if (!result) {
      return NextResponse.json({ error: address ? "Address not found" : "Location not found" }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("Geocoding POST error:", error)
    return NextResponse.json({ error: "An error occurred during geocoding" }, { status: 500 })
  }
}


