import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"

export async function GET() {
  try {
    await connectToDatabase()

    // Fetch only verified properties
    const properties = await Property.find({
      verificationStatus: "verified",
      isApproved: true,
      isRejected: false,
    })
      .populate("owner", "name email phone")
      .sort({ verifiedAt: -1, createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      properties,
      count: properties.length,
    })
  } catch (error: any) {
    console.error("Error fetching verified properties:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch verified properties",
        properties: [],
      },
      { status: 500 }
    )
  }
}

