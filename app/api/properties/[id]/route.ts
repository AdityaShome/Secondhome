import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase()

    const { id } = await params
    const property = await Property.findById(id).populate("owner", "name email phone")

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      )
    }

    // Calculate distances from nearby places if not already set
    if (!property.distance || (property.distance.college === 0 && property.distance.hospital === 0)) {
      const distance = {
        college: 0,
        hospital: 0,
        busStop: 0,
        metro: 0,
      }

      // Extract nearest distances from nearbyPlaces and nearbyColleges
      if (property.nearbyColleges && property.nearbyColleges.length > 0) {
        // Find closest college
        const closestCollege = property.nearbyColleges.reduce((prev, curr) => 
          (curr.distance < prev.distance ? curr : prev)
        )
        distance.college = Math.round(closestCollege.distance * 10) / 10 // Round to 1 decimal
      }

      if (property.nearbyPlaces?.hospitals && property.nearbyPlaces.hospitals.length > 0) {
        const closestHospital = property.nearbyPlaces.hospitals.reduce((prev, curr) => 
          (curr.distance < prev.distance ? curr : prev)
        )
        distance.hospital = Math.round(closestHospital.distance * 10) / 10
      }

      if (property.nearbyPlaces?.transport && property.nearbyPlaces.transport.length > 0) {
        // Find closest bus stop
        const busStops = property.nearbyPlaces.transport.filter((t: any) => t.type === 'bus_stop')
        if (busStops.length > 0) {
          const closestBusStop = busStops.reduce((prev: any, curr: any) => 
            (curr.distance < prev.distance ? curr : prev)
          )
          distance.busStop = Math.round(closestBusStop.distance * 10) / 10
        }

        // Find closest metro station
        const metroStations = property.nearbyPlaces.transport.filter((t: any) => t.type === 'metro_station')
        if (metroStations.length > 0) {
          const closestMetro = metroStations.reduce((prev: any, curr: any) => 
            (curr.distance < prev.distance ? curr : prev)
          )
          distance.metro = Math.round(closestMetro.distance * 10) / 10
        }
      }

      // Update property with calculated distances
      property.distance = distance
    }

    return NextResponse.json({
      success: true,
      property,
    })
  } catch (error) {
    console.error("❌ Error fetching property:", error)
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    )
  }
}
