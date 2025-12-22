import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"
import mongoose from "mongoose"

// Admin/Executive endpoint to complete verification after physical visit
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin or has executive role
    if (session.user.role !== "admin" && session.user.role !== "executive") {
      return NextResponse.json(
        { error: "Only admins and executives can complete verification" },
        { status: 403 }
      )
    }

    const { id: propertyId } = await params
    const body = await req.json()

    // Executive visit details
    const {
      wifiTested,
      wifiSpeed = "Ultra Fast",
      rawVideoCheck,
      videoUrl,
      physicalInspection,
      notes,
      approve = true, // false to reject
    } = body

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return NextResponse.json({ error: "Invalid property ID" }, { status: 400 })
    }

    await connectToDatabase()

    const property = await Property.findById(propertyId)

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    // Check if payment is done (verification status should be "pending")
    if (property.verificationStatus !== "pending") {
      return NextResponse.json(
        { 
          error: property.verificationStatus === "verified" 
            ? "Property is already verified" 
            : "Property verification payment not completed" 
        },
        { status: 400 }
      )
    }

    // Update executive visit details
    property.executiveVisit = {
      visitedAt: new Date(),
      visitedBy: new mongoose.Types.ObjectId(session.user.id),
      checks: {
        wifiTested: wifiTested || false,
        wifiSpeed: wifiSpeed,
        rawVideoCheck: rawVideoCheck || false,
        videoUrl: videoUrl || "",
        physicalInspection: physicalInspection || false,
        notes: notes || "",
      },
      approvedAt: approve ? new Date() : undefined,
      approvedBy: approve ? new mongoose.Types.ObjectId(session.user.id) : undefined,
    }

    // If approved, mark as verified
    if (approve) {
      property.verificationStatus = "verified"
      property.verifiedAt = new Date()
      property.verifiedBy = new mongoose.Types.ObjectId(session.user.id)
    } else {
      property.verificationStatus = "rejected"
    }

    property.updatedAt = new Date()

    await property.save()

    return NextResponse.json({
      success: true,
      message: approve 
        ? "Property verified successfully! Badge has been applied." 
        : "Verification rejected.",
      property: {
        _id: property._id,
        title: property.title,
        verificationStatus: property.verificationStatus,
        executiveVisit: property.executiveVisit,
        verifiedAt: property.verifiedAt,
      },
    })
  } catch (error: any) {
    console.error("Verification completion error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to complete verification",
      },
      { status: 500 }
    )
  }
}

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



