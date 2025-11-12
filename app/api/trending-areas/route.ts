import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get("lat") || "0")
    const lon = parseFloat(searchParams.get("lon") || "0")
    const limit = parseInt(searchParams.get("limit") || "5")

    await connectToDatabase()

    // Get trending areas based on:
    // 1. Number of properties
    // 2. Recent bookings
    // 3. Views (if we track them)
    
    // For now, we'll aggregate by location and count properties
    const trendingAreas = await Property.aggregate([
      {
        $match: {
          isApproved: true,
        },
      },
      {
        $group: {
          _id: "$location",
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          coordinates: { $first: "$coordinates" },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          propertyCount: "$count",
          avgPrice: { $round: ["$avgPrice", 0] },
          minPrice: "$minPrice",
          coordinates: 1,
        },
      },
    ])

    // Calculate distance from current location
    const areasWithDistance = trendingAreas.map((area: any) => {
      if (area.coordinates?.coordinates) {
        const [areaLon, areaLat] = area.coordinates.coordinates
        const distance = Math.sqrt(
          Math.pow(areaLat - lat, 2) + Math.pow(areaLon - lon, 2)
        ) * 111 // Approximate km
        
        return {
          ...area,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        }
      }
      return { ...area, distance: null }
    })

    return NextResponse.json({
      areas: areasWithDistance,
      total: areasWithDistance.length,
    })
  } catch (error) {
    console.error("Error fetching trending areas:", error)
    return NextResponse.json(
      {
        areas: [],
        total: 0,
        error: "Failed to fetch trending areas",
      },
      { status: 200 }
    )
  }
}




