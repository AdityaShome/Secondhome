import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { OTP } from "@/models/otp"
import { getUserModel } from "@/models/user"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isValidE164, normalizePhoneNumber } from "@/lib/phone"

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

    if (!isValidE164(normalizedPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Please include country code (e.g., +91 for India)" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Find the OTP (log for debugging)
    console.log(`🔍 Looking for OTP - Phone: ${normalizedPhone}, OTP: ${otp}, Type: ${type}`)
    
    const otpRecord = await OTP.findOne({
      phone: normalizedPhone,
      otp,
      type,
    })

    if (!otpRecord) {
      // Debug: Check if OTP exists with different type
      const anyOtpForPhone = await OTP.findOne({ phone: normalizedPhone, otp })
      if (anyOtpForPhone) {
        console.log(`⚠️ OTP exists but with different type: ${anyOtpForPhone.type}`)
      }
      
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

    // Handle different verification types
    if (type === "phone-verification") {
      // For logged-in user phone verification
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
    } else if (type === "registration") {
      // For registration, just verify the OTP - don't update user yet
      // The user will be created after this verification step
      console.log(`✅ Phone OTP verified for registration: ${normalizedPhone}`)
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
