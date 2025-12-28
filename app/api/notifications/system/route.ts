import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { connectToDatabase } from "@/lib/mongodb"
import { Notification } from "@/models/notification"
import { getUserModel } from "@/models/user"
import { authOptions } from "@/lib/auth-options"

/**
 * Create system notifications for all users or specific users
 * Admin only endpoint
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    await connectToDatabase()
    const User = await getUserModel()
    const user = await User.findById(session.user.id).select("role").lean()

    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      message,
      link,
      image,
      priority = "medium",
      targetUsers = "all", // "all" | "specific" (requires userIds array)
      userIds = [],
      notificationType = "system", // "system" | "offer" | "announcement"
    } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      )
    }

    let usersToNotify: any[] = []

    if (targetUsers === "all") {
      // Get all active users
      const allUsers = await User.find({}).select("_id email").lean()
      usersToNotify = allUsers
    } else if (targetUsers === "specific" && userIds.length > 0) {
      // Get specific users
      const specificUsers = await User.find({
        _id: { $in: userIds },
      }).select("_id email").lean()
      usersToNotify = specificUsers
    } else {
      return NextResponse.json(
        { error: "Invalid targetUsers or missing userIds" },
        { status: 400 }
      )
    }

    // Create notifications for all target users
    const notifications = await Promise.allSettled(
      usersToNotify.map((user: any) =>
        Notification.create({
          user: user._id,
          type: notificationType as any,
          title: title,
          message: message,
          link: link || null,
          image: image || null,
          priority: priority,
          read: false,
          metadata: {
            createdBy: session.user.id,
            createdAt: new Date(),
            notificationType: notificationType,
          },
        })
      )
    )

    const successful = notifications.filter((r) => r.status === "fulfilled").length
    const failed = notifications.filter((r) => r.status === "rejected").length

    return NextResponse.json({
      success: true,
      message: `System notifications created for ${successful} users`,
      totalUsers: usersToNotify.length,
      successful,
      failed,
    })
  } catch (error: any) {
    console.error("Error creating system notifications:", error)
    return NextResponse.json(
      { error: "Failed to create notifications", details: error.message },
      { status: 500 }
    )
  }
}

