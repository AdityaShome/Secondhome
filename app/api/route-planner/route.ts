import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const originLat = searchParams.get("originLat")
    const originLon = searchParams.get("originLon")
    const destLat = searchParams.get("destLat")
    const destLon = searchParams.get("destLon")
    const mode = searchParams.get("mode") || "driving" // driving, walking, bicycling, transit

    if (!originLat || !originLon || !destLat || !destLon) {
      return NextResponse.json(
        { error: "Origin and destination coordinates are required" },
        { status: 400 }
      )
    }

    // Check if Google Maps API key is configured
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn("⚠️ Google Maps API key not configured")
      
      // Return estimated data based on straight-line distance
      const lat1 = parseFloat(originLat)
      const lon1 = parseFloat(originLon)
      const lat2 = parseFloat(destLat)
      const lon2 = parseFloat(destLon)
      
      const distance = Math.sqrt(
        Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)
      ) * 111 // Approximate km
      
      // Estimate duration based on mode
      const speeds = {
        walking: 5, // km/h
        bicycling: 15, // km/h
        driving: 30, // km/h (city average)
        transit: 25, // km/h
      }
      
      const speed = speeds[mode as keyof typeof speeds] || speeds.driving
      const durationMinutes = Math.round((distance / speed) * 60)
      
      return NextResponse.json({
        distance: `${distance.toFixed(1)} km`,
        duration: `${durationMinutes} min`,
        distanceMeters: Math.round(distance * 1000),
        durationSeconds: durationMinutes * 60,
        mode,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${destLat},${destLon}&travelmode=${mode}`,
        isMockData: true,
      })
    }

    // Fetch route from Google Directions API
    const directionsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLon}&destination=${destLat},${destLon}&mode=${mode}&key=${apiKey}`
    )

    if (!directionsResponse.ok) {
      throw new Error(`Google Directions API error: ${directionsResponse.status}`)
    }

    const directionsData = await directionsResponse.json()

    if (directionsData.status !== "OK" || !directionsData.routes || directionsData.routes.length === 0) {
      throw new Error(`No route found: ${directionsData.status}`)
    }

    const route = directionsData.routes[0]
    const leg = route.legs[0]

    return NextResponse.json({
      distance: leg.distance.text,
      duration: leg.duration.text,
      distanceMeters: leg.distance.value,
      durationSeconds: leg.duration.value,
      mode,
      steps: leg.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
        distance: step.distance.text,
        duration: step.duration.text,
      })),
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${destLat},${destLon}&travelmode=${mode}`,
      isMockData: false,
    })
  } catch (error) {
    console.error("Error fetching route:", error)
    
    // Return estimated data as fallback
    const { searchParams } = new URL(request.url)
    const originLat = parseFloat(searchParams.get("originLat") || "0")
    const originLon = parseFloat(searchParams.get("originLon") || "0")
    const destLat = parseFloat(searchParams.get("destLat") || "0")
    const destLon = parseFloat(searchParams.get("destLon") || "0")
    const mode = searchParams.get("mode") || "driving"
    
    const distance = Math.sqrt(
      Math.pow(destLat - originLat, 2) + Math.pow(destLon - originLon, 2)
    ) * 111
    
    const speeds = { walking: 5, bicycling: 15, driving: 30, transit: 25 }
    const speed = speeds[mode as keyof typeof speeds] || speeds.driving
    const durationMinutes = Math.round((distance / speed) * 60)
    
    return NextResponse.json({
      distance: `${distance.toFixed(1)} km`,
      duration: `${durationMinutes} min`,
      distanceMeters: Math.round(distance * 1000),
      durationSeconds: durationMinutes * 60,
      mode,
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${destLat},${destLon}&travelmode=${mode}`,
      isMockData: true,
      error: "Using estimated route data",
    })
  }
}




