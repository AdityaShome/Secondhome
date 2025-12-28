/**
 * Helper function to create notifications
 * Can be imported and used in any API route
 */

export async function createNotification(data: {
  userId?: string
  userEmail?: string
  type: "booking" | "property" | "offer" | "review" | "system" | "payment" | "message" | "profile" | "article" | "listing"
  title: string
  message: string
  link?: string
  image?: string
  priority?: "low" | "medium" | "high"
  metadata?: any
}) {
  try {
    // Use server-side import for better reliability
    const { connectToDatabase } = await import("@/lib/mongodb")
    const { Notification } = await import("@/models/notification")
    const { getUserModel } = await import("@/models/user")
    
    await connectToDatabase()
    const User = await getUserModel()
    
    // Get user by ID or email
    let user
    if (data.userId) {
      user = await User.findById(data.userId)
    } else if (data.userEmail) {
      user = await User.findOne({ email: data.userEmail })
    }
    
    if (!user) {
      console.error("User not found for notification:", data.userId || data.userEmail)
      return { success: false, error: "User not found" }
    }
    
    // Create notification directly in database
    const notification = await Notification.create({
      user: user._id,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      image: data.image,
      priority: data.priority || "medium",
      metadata: data.metadata,
      read: false,
    })
    
    return { success: true, notification }
  } catch (error: any) {
    console.error("Error creating notification:", error)
    return { success: false, error: error.message || "Unknown error" }
  }
}

/**
 * Create notification for all users (for system-wide announcements)
 * This can be used for new articles, system updates, etc.
 */
export async function createNotificationForAllUsers(data: {
  type: "article" | "system"
  title: string
  message: string
  link?: string
  image?: string
  priority?: "low" | "medium" | "high"
  metadata?: any
}) {
  try {
    const { connectToDatabase } = await import("@/lib/mongodb")
    const { getUserModel } = await import("@/models/user")
    
    await connectToDatabase()
    const User = await getUserModel()
    
    // Get all active users
    const users = await User.find({}).select("_id email").lean()
    
    // Create notifications for all users
    const notifications = await Promise.allSettled(
      users.map((user: any) =>
        createNotification({
          userId: user._id.toString(),
          ...data,
        })
      )
    )

    const successful = notifications.filter((r) => r.status === "fulfilled").length
    const failed = notifications.filter((r) => r.status === "rejected").length

    return {
      success: true,
      totalUsers: users.length,
      successful,
      failed,
    }
  } catch (error) {
    console.error("Error creating notifications for all users:", error)
    return { success: false, error }
  }
}


