import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { getUserModel } from "@/models/user"
import { connectToDatabase } from "@/lib/mongodb"
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt"
import { z } from "zod"
import { findUserByEmailLoose, normalizeEmail } from "@/lib/email"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password } = body

    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = normalizeEmail(email)

    try {
      // Connect to database
      await connectToDatabase()

      // Get User model
      const User = await getUserModel()

      // Find user (robust to legacy mixed-case email rows)
      const lookup = await findUserByEmailLoose(User as any, normalizedEmail)

      if (lookup.multiple) {
        return NextResponse.json(
          { error: "Multiple accounts detected for this email. Please contact support." },
          { status: 409 }
        )
      }

      const user = lookup.user

      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        )
      }

      // Check if user has a password (OAuth users might not have one)
      if (!user.password) {
        return NextResponse.json(
          { error: "This account was created with social login. Please use Google or Facebook to sign in." },
          { status: 401 }
        )
      }

      // Verify password
      const isPasswordValid = await compare(password, user.password)

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        )
      }

      // Generate tokens
      const accessToken = await generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role || "user",
      })

      const refreshToken = await generateRefreshToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role || "user",
      })

      // Return tokens and user info (excluding password)
      return NextResponse.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || "user",
          image: user.image || null,
          phone: user.phone || null,
        },
      }, { status: 200 })
    } catch (error: any) {
      console.error("Login error:", error)
      return NextResponse.json(
        { error: "Authentication failed. Please try again." },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Login request error:", error)
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    )
  }
}

