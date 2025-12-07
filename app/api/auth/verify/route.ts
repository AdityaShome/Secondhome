import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractTokenFromHeader } from "@/lib/jwt"
import { getUserModel } from "@/models/user"
import { connectToDatabase } from "@/lib/mongodb"

/**
 * Verify JWT token and return user information
 * GET /api/auth/verify - Verify token from Authorization header
 * POST /api/auth/verify - Verify token from request body
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: "No token provided. Include 'Authorization: Bearer <token>' header." },
        { status: 401 }
      )
    }

    try {
      const payload = await verifyToken(token)

      // Optionally fetch fresh user data from database
      await connectToDatabase()
      const User = await getUserModel()
      const user = await User.findById(payload.userId).select("-password").lean()

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        valid: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || "user",
          image: user.image || null,
          phone: user.phone || null,
        },
        token: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          issuedAt: payload.iat,
          expiresAt: payload.exp,
        },
      }, { status: 200 })
    } catch (error: any) {
      return NextResponse.json(
        { 
          valid: false,
          error: error.message || "Invalid or expired token" 
        },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error("Token verification error:", error)
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "Token is required in request body" },
        { status: 400 }
      )
    }

    try {
      const payload = await verifyToken(token)

      // Optionally fetch fresh user data from database
      await connectToDatabase()
      const User = await getUserModel()
      const user = await User.findById(payload.userId).select("-password").lean()

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        valid: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || "user",
          image: user.image || null,
          phone: user.phone || null,
        },
        token: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          issuedAt: payload.iat,
          expiresAt: payload.exp,
        },
      }, { status: 200 })
    } catch (error: any) {
      return NextResponse.json(
        { 
          valid: false,
          error: error.message || "Invalid or expired token" 
        },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error("Token verification error:", error)
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    )
  }
}

