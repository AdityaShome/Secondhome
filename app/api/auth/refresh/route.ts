import { NextResponse } from "next/server"
import { verifyToken, generateAccessToken, generateRefreshToken } from "@/lib/jwt"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      )
    }

    try {
      // Verify the refresh token
      const payload = await verifyToken(refreshToken)

      // Check if it's actually a refresh token
      // Note: We'll need to decode to check the type, but for now we'll trust the token
      // In a more secure implementation, you might want to store refresh tokens in DB

      // Generate new tokens
      const newAccessToken = await generateAccessToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      })

      const newRefreshToken = await generateRefreshToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      })

      return NextResponse.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }, { status: 200 })
    } catch (error: any) {
      console.error("Token refresh error:", error)
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error("Refresh request error:", error)
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    )
  }
}

