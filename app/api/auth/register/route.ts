import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { getUserModel } from "@/models/user"
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt"
import { findUserByEmailLoose, normalizeEmail } from "@/lib/email"

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = userSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const { name, email, password, phone } = body

    // Property-owner registration should be OTP-protected
    if (body.isPropertyOwner) {
      return NextResponse.json(
        { error: "Please use OTP registration for property owners." },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmail(email)

    try {
      // Get User model
      const User = await getUserModel()

      // Check if user already exists
      const lookup = await findUserByEmailLoose(User as any, normalizedEmail)

      if (lookup.multiple) {
        return NextResponse.json(
          {
            error:
              "Multiple accounts exist for this email. Please contact support to merge your accounts.",
          },
          { status: 409 }
        )
      }

      const existingUser = lookup.user
      
      if (existingUser) {
        // Check if existing user was created via OAuth (no password)
        if (!existingUser.password) {
          return NextResponse.json({ 
            error: "An account with this email already exists via Google/Facebook sign-in. Please use that method to sign in instead." 
          }, { status: 409 })
        }
        
        // Regular user registration with existing email
        return NextResponse.json({ 
          error: "User with this email already exists. Please sign in instead." 
        }, { status: 409 })
      }

      // Hash password
      const hashedPassword = await hash(password, 12)

      // Create new user (set role to owner if coming from property registration)
      const newUser = new User({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone || undefined,
        role: "user",
        createdAt: new Date(),
      })

      await newUser.save()

      // If returnToken is true (for mobile apps), generate and return JWT tokens
      if (body.returnToken === true) {
        const accessToken = await generateAccessToken({
          userId: newUser._id.toString(),
          email: newUser.email,
          role: newUser.role || "user",
        })

        const refreshToken = await generateRefreshToken({
          userId: newUser._id.toString(),
          email: newUser.email,
          role: newUser.role || "user",
        })

        return NextResponse.json({ 
          message: "User registered successfully",
          created: true,
          accessToken,
          refreshToken,
          user: {
            id: newUser._id.toString(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role || "user",
            image: newUser.image || null,
            phone: newUser.phone || null,
          },
        }, { status: 201 })
      }

      return NextResponse.json({ 
        message: "User registered successfully",
        created: true 
      }, { status: 201 })
    } catch (error) {
      console.error("Database operation error:", error)
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 })
    }
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "An error occurred during registration" }, { status: 500 })
  }
}
