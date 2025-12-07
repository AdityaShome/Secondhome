import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractTokenFromHeader } from "@/lib/jwt"
import { getUserModel } from "@/models/user"
import { connectToDatabase } from "@/lib/mongodb"

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
  }
}

/**
 * Middleware to verify JWT token from Authorization header
 * Returns the authenticated user or null
 */
export async function verifyAuthToken(req: NextRequest): Promise<{
  user: { id: string; email: string; role: string } | null
  error: string | null
}> {
  try {
    const authHeader = req.headers.get("authorization")
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return {
        user: null,
        error: "No token provided. Include 'Authorization: Bearer <token>' header.",
      }
    }

    try {
      const payload = await verifyToken(token)

      return {
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
        },
        error: null,
      }
    } catch (error: any) {
      return {
        user: null,
        error: error.message || "Invalid or expired token",
      }
    }
  } catch (error: any) {
    return {
      user: null,
      error: "Failed to verify token",
    }
  }
}

/**
 * Middleware wrapper for protected API routes
 * Use this in your API routes to require authentication
 * 
 * Example:
 * export async function GET(req: NextRequest) {
 *   const authResult = await requireAuth(req)
 *   if (authResult.error) {
 *     return NextResponse.json({ error: authResult.error }, { status: 401 })
 *   }
 *   const { user } = authResult
 *   // Your protected route logic here
 * }
 */
export async function requireAuth(req: NextRequest): Promise<{
  user: { id: string; email: string; role: string } | null
  error: string | null
}> {
  return await verifyAuthToken(req)
}

/**
 * Optional: Verify token and optionally fetch user from database
 */
export async function verifyAuthWithUser(req: NextRequest): Promise<{
  user: any | null
  error: string | null
}> {
  try {
    const authResult = await verifyAuthToken(req)
    
    if (authResult.error || !authResult.user) {
      return authResult
    }

    // Fetch full user data from database
    await connectToDatabase()
    const User = await getUserModel()
    const user = await User.findById(authResult.user.id).select("-password").lean()

    if (!user) {
      return {
        user: null,
        error: "User not found",
      }
    }

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role || "user",
        image: user.image || null,
        phone: user.phone || null,
      },
      error: null,
    }
  } catch (error: any) {
    return {
      user: null,
      error: "Failed to fetch user data",
    }
  }
}

