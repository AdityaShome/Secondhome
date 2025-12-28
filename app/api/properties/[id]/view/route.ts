import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserModel } from "@/models/user"
import { Notification } from "@/models/notification"
import { authOptions } from "@/lib/auth-options"

/**
 * Track property view and create notification
 * This endpoint is called when a user views a property
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    // Only track views for authenticated users
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, message: "View tracked (anonymous)" })
    }

    await connectToDatabase()
    const User = await getUserModel()

    // Get property details
    const Property = (await import("@/models/property")).default
    const property = await Property.findById(id).select("title location price images owner").lean()

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    // Check if user already viewed this property recently (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const existingNotification = await Notification.findOne({
      user: session.user.id,
      type: "property",
      "metadata.propertyId": id,
      createdAt: { $gte: oneHourAgo },
    })

    // Don't create duplicate notifications for same property within an hour
    if (existingNotification) {
      return NextResponse.json({ success: true, message: "View already tracked" })
    }

    // Create notification for property view
    const notification = await Notification.create({
      user: session.user.id,
      type: "property",
      title: "Property Viewed",
      message: `You viewed ${property.title || "a property"} in ${property.location || "an area"}. Check it out!`,
      link: `/listings/${id}`,
      image: property.images?.[0] || null,
      priority: "low",
      read: false,
      metadata: {
        propertyId: id,
        action: "view",
      },
    })

    return NextResponse.json({
      success: true,
      notification,
      message: "View tracked successfully",
    })
  } catch (error: any) {
    console.error("Error tracking property view:", error)
    // Don't fail the request if notification creation fails
    return NextResponse.json(
      { success: false, error: error.message || "Failed to track view" },
      { status: 500 }
    )
  }
}

