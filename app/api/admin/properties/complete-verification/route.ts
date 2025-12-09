import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"

// GET endpoint to view pending verifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin" && session.user.role !== "executive") {
      return NextResponse.json(
        { error: "Only admins and executives can view pending verifications" },
        { status: 403 }
      )
    }

    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "pending"

    const query: any = {
      isApproved: true,
      isRejected: false,
    }

    if (status === "pending") {
      query.verificationStatus = "pending"
    } else if (status === "verified") {
      query.verificationStatus = "verified"
    }

    const properties = await Property.find(query)
      .populate("owner", "name email phone")
      .sort({ verificationPaidAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      properties,
      count: properties.length,
    })
  } catch (error: any) {
    console.error("Error fetching pending verifications:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch verifications",
      },
      { status: 500 }
    )
  }
}



