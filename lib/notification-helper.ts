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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://secondhome-eight.vercel.app'
    const response = await fetch(`${baseUrl}/api/notifications/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Failed to create notification:", error)
      return { success: false, error }
    }

    const result = await response.json()
    return { success: true, notification: result.notification }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error }
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


