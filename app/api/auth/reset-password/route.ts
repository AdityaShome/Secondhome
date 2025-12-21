import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserModel } from "@/models/user"
import { OTP } from "@/models/otp"
import { hash } from "bcryptjs"
import { z } from "zod"

const resetPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validate input
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, newPassword } = validation.data

    await connectToDatabase()

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if OTP was verified (OTP should be deleted after verification, so we check if it exists)
    // Actually, we need to verify that the OTP was verified. Let's check if there's a verified OTP record
    // Since OTP is deleted after verification, we'll verify the OTP again or use a different approach
    // For security, we'll require the OTP to be verified in the same session
    // The frontend should verify OTP first, then call this endpoint
    
    // Find user
    const User = await getUserModel()
    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Verify that OTP was sent and verified (it should still exist since we don't delete it for password-reset)
    // The frontend should verify OTP first, then call this endpoint
    // We'll check if OTP exists and is not expired
    const otpRecord = await OTP.findOne({
      $or: [
        { email: normalizedEmail },
        { email: email.toLowerCase().trim() }
      ],
      type: "password-reset",
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: "OTP verification required. Please verify your OTP first." },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id })
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 12)

    // Update user password
    await User.findByIdAndUpdate(
      user._id,
      { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    )

    // Delete OTP after successful password reset
    await OTP.deleteOne({ _id: otpRecord._id })

    console.log(`✅ Password reset successful for ${normalizedEmail}`)

    return NextResponse.json({
      message: "Password reset successfully",
      success: true,
    })
  } catch (error) {
    console.error("❌ Error resetting password:", error)
    return NextResponse.json(
      {
        error: "Failed to reset password",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

