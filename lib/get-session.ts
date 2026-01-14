import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserModel } from "@/models/user"

/**
 * Get the current session in App Router API routes
 * This properly handles cookies in Next.js 13+ App Router
 * 
 * Note: getServerSession automatically reads cookies from the request
 * when called in API routes, so we don't need to pass headers explicitly
 */
export async function getSession() {
  try {
    // In App Router, getServerSession reads cookies automatically
    const session = await getServerSession(authOptions)
    
    if (!session) {
      console.log("⚠️ No session found - user not authenticated")
      return null
    }
    
    if (!session.user) {
      console.log("⚠️ Session found but missing user object")
      return null
    }
    
    if (!session.user.id) {
      const email = session.user.email?.toLowerCase().trim()
      console.log("⚠️ Session found but missing user.id", {
        user: session.user,
        email,
      })

      if (!email) {
        return null
      }

      try {
        await connectToDatabase()
        const User = await getUserModel()
        const dbUser = await User.findOne({ email }).select("_id role").lean()
        if (dbUser?._id) {
          session.user.id = dbUser._id.toString()
          ;(session.user as any).role = (dbUser as any).role || (session.user as any).role || "user"
        } else {
          return null
        }
      } catch (error) {
        console.error("❌ Failed to backfill session.user.id:", error)
        return null
      }
    }
    
    console.log("✅ Session found:", {
      userId: session.user.id,
      email: session.user.email,
      role: (session.user as any).role,
    })
    
    return session
  } catch (error: any) {
    console.error("❌ Error getting session:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return null
  }
}

