import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { getUserModel } from "@/models/user"
import { connectToDatabase } from "@/lib/mongodb"
import { OTP } from "@/models/otp"
import { findUserByEmailLoose } from "@/lib/email"

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  otp: z.string().length(6, "OTP must be 6 digits"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = userSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const { name, email, password, phone, otp } = body

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim()

    await connectToDatabase()

    // Verify OTP first (use normalized email)
    const otpRecord = await OTP.findOne({ 
      email: normalizedEmail,
      otp,
      type: "registration",
      expiresAt: { $gt: new Date() }
    })

    if (!otpRecord) {
      return NextResponse.json({ 
        error: "Invalid or expired OTP. Please request a new one." 
      }, { status: 400 })
    }

    try {
      // Get User model
      const User = await getUserModel()

      // Check if user already exists (robust to legacy mixed-case email rows)
      const existingLookup = await findUserByEmailLoose(User as any, normalizedEmail)
      const existingUser = existingLookup.multiple ? null : existingLookup.user
      
      if (existingLookup.multiple) {
        // Delete used OTP
        await OTP.deleteOne({ _id: otpRecord._id })
        return NextResponse.json(
          {
            error:
              "Multiple accounts exist for this email. Please contact support to merge your accounts.",
          },
          { status: 409 }
        )
      }

      if (existingUser) {
        // Delete used OTP
        await OTP.deleteOne({ _id: otpRecord._id })

        // Hash password (used for linking OAuth accounts / setting password)
        const hashedPassword = await hash(password, 12)
        
        // If registering as property owner and user exists
        if (body.isPropertyOwner) {
          // Check if already an owner
          if (existingUser.role === "owner" || existingUser.role === "admin") {
            return NextResponse.json({ 
              error: "You are already registered as a property owner" 
            }, { status: 409 })
          }
          
          // Upgrade regular user to property owner
          const update: Record<string, any> = {
            role: "owner",
            phone: phone || existingUser.phone,
            emailVerified: existingUser.emailVerified || new Date(),
            updatedAt: new Date(),
          }

          // If the account was created via OAuth, allow setting a password after OTP verification
          if (!existingUser.password) {
            update.password = hashedPassword
          }

          if (!existingUser.name && name) {
            update.name = name
          }

          await User.updateOne({ _id: existingUser._id }, { $set: update })
          
          return NextResponse.json({ 
            message: "Your account has been upgraded to property owner!",
            upgraded: true 
          }, { status: 200 })
        }

        // Regular registration: if this is an OAuth-created account, link it by setting a password
        if (!existingUser.password) {
          const update: Record<string, any> = {
            password: hashedPassword,
            emailVerified: existingUser.emailVerified || new Date(),
            updatedAt: new Date(),
          }

          if (!existingUser.name && name) {
            update.name = name
          }
          if (!existingUser.phone && phone) {
            update.phone = phone
          }

          await User.updateOne({ _id: existingUser._id }, { $set: update })

          return NextResponse.json(
            {
              message:
                "Account already exists via social login. Password has been set successfully — you can now sign in with email and password.",
              linked: true,
            },
            { status: 200 }
          )
        }
        
        // Regular user registration with existing email
        return NextResponse.json({ 
          error: "User with this email already exists" 
        }, { status: 409 })
      }

      // Hash password
      const hashedPassword = await hash(password, 12)

      // Create new user (set role to owner if coming from property registration)
      const newUser = new User({
        name,
        email: normalizedEmail, // Store normalized email
        password: hashedPassword,
        phone: phone || undefined,
        role: body.isPropertyOwner ? "owner" : "user",
        emailVerified: new Date(), // Email verified via OTP - store verification date
        createdAt: new Date(),
      })

      await newUser.save()

      // Delete used OTP
      await OTP.deleteOne({ _id: otpRecord._id })

      console.log(`✅ User registered successfully: ${normalizedEmail}`)

      return NextResponse.json({ 
        message: "Registration successful! You can now login.",
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

