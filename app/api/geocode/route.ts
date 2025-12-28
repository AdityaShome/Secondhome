import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")

    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    // Forward geocoding: address to coordinates
    if (address) {
      if (!apiKey) {
        // Fallback: Use OpenStreetMap Nominatim (free, no API key needed)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        )
        const data = await response.json()
        
        if (data && data.length > 0) {
          return NextResponse.json({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            address: data[0].display_name,
            formatted_address: data[0].display_name,
          })
        }
        
        return NextResponse.json({ error: "Address not found" }, { status: 404 })
      }

      // Use Google Geocoding API if key is available
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      )
      const data = await response.json()

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0]
        return NextResponse.json({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address,
          formatted_address: result.formatted_address,
          place_id: result.place_id,
        })
      }

      return NextResponse.json({ error: "Address not found" }, { status: 404 })
    }

    // Reverse geocoding: coordinates to address
    if (lat && lng) {
      if (!apiKey) {
        // Fallback: Use OpenStreetMap Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        )
        const data = await response.json()
        
        if (data && data.address) {
          const addressParts = []
          if (data.address.house_number) addressParts.push(data.address.house_number)
          if (data.address.road) addressParts.push(data.address.road)
          if (data.address.suburb) addressParts.push(data.address.suburb)
          if (data.address.city || data.address.town) addressParts.push(data.address.city || data.address.town)
          if (data.address.state) addressParts.push(data.address.state)
          if (data.address.postcode) addressParts.push(data.address.postcode)
          
          return NextResponse.json({
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            address: data.display_name,
            formatted_address: addressParts.join(", ") || data.display_name,
            city: data.address.city || data.address.town || "",
            state: data.address.state || "",
            pincode: data.address.postcode || "",
            locality: data.address.suburb || data.address.neighbourhood || "",
          })
        }
        
        return NextResponse.json({ error: "Location not found" }, { status: 404 })
      }

      // Use Google Reverse Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      )
      const data = await response.json()

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0]
        
        // Extract address components
        const addressComponents: any = {}
        result.address_components.forEach((component: any) => {
          if (component.types.includes("locality")) addressComponents.city = component.long_name
          if (component.types.includes("administrative_area_level_1")) addressComponents.state = component.long_name
          if (component.types.includes("postal_code")) addressComponents.pincode = component.long_name
          if (component.types.includes("sublocality") || component.types.includes("neighborhood")) {
            addressComponents.locality = component.long_name
          }
        })

        return NextResponse.json({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          address: result.formatted_address,
          formatted_address: result.formatted_address,
          city: addressComponents.city || "",
          state: addressComponents.state || "",
          pincode: addressComponents.pincode || "",
          locality: addressComponents.locality || "",
          place_id: result.place_id,
        })
      }

      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    return NextResponse.json({ error: "Address or coordinates required" }, { status: 400 })
  } catch (error) {
    console.error("Geocoding error:", error)
    return NextResponse.json(
      { error: "An error occurred during geocoding" },
      { status: 500 }
    )
  }
}


