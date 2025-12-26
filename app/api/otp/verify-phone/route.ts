import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { OTP } from "@/models/otp"
import { getUserModel } from "@/models/user"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

// Normalize phone number (same as send-phone)
function normalizePhoneNumber(phone: string): string {
  let normalized = phone.replace(/[^\d+]/g, "")
  
  if (!normalized.startsWith("+")) {
    if (normalized.startsWith("91") && normalized.length === 12) {
      normalized = "+" + normalized
    } else if (normalized.length === 10) {
      normalized = "+91" + normalized
    } else if (normalized.length > 10) {
      normalized = "+" + normalized
    }
  }
  
  return normalized
}

export async function POST(req: Request) {
  try {
    const { phone, otp, type = "phone-verification" } = await req.json()

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP are required" },
        { status: 400 }
      )
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone)

    await connectToDatabase()

    // Find the OTP
    const otpRecord = await OTP.findOne({
      phone: normalizedPhone,
      otp,
      type,
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      )
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id })
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // If this is phone verification, update user's phone verification status
    if (type === "phone-verification") {
      const session = await getServerSession(authOptions)
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "You must be logged in to verify your phone number" },
          { status: 401 }
        )
      }

      const User = await getUserModel()
      
      // Check if phone is already verified by another user
      const existingUser = await User.findOne({ 
        phone: normalizedPhone, 
        phoneVerified: true,
        _id: { $ne: session.user.id }
      })
      
      if (existingUser) {
        await OTP.deleteOne({ _id: otpRecord._id })
        return NextResponse.json(
          { error: "This phone number is already verified by another account." },
          { status: 409 }
        )
      }

      // Update user's phone and mark as verified
      await User.updateOne(
        { _id: session.user.id },
        { 
          $set: { 
            phone: normalizedPhone, 
            phoneVerified: true,
            updatedAt: new Date()
          } 
        }
      )
    }

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id })

    return NextResponse.json({
      message: "Phone number verified successfully",
      phone: normalizedPhone,
    })
  } catch (error: any) {
    console.error("❌ Verify Phone OTP Error:", error)
    return NextResponse.json(
      { error: "An error occurred while verifying OTP", details: error.message },
      { status: 500 }
    )
  }
}
