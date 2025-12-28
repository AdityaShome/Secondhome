import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Notification } from "@/models/notification"
import { getUserModel } from "@/models/user"

/**
 * Create a notification for a user
 * This is a helper endpoint that can be called from other API routes
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      userId, 
      userEmail, 
      type, 
      title, 
      message, 
      link, 
      image, 
      priority = "medium",
      metadata 
    } = body

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "userId or userEmail is required" }, { status: 400 })
    }

    if (!type || !title || !message) {
      return NextResponse.json({ error: "type, title, and message are required" }, { status: 400 })
    }

    await connectToDatabase()

    // Get user by ID or email
    const User = await getUserModel()
    let user
    if (userId) {
      user = await User.findById(userId)
    } else if (userEmail) {
      user = await User.findOne({ email: userEmail })
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create notification
    const notification = await Notification.create({
      user: user._id,
      type,
      title,
      message,
      link,
      image,
      priority,
      metadata,
      read: false,
    })

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json(
      { error: "Failed to create notification", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}


