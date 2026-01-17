import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { OTP } from "@/models/otp"
import { getUserModel } from "@/models/user"
import { sendSms, shouldExposeOtpToClient } from "@/lib/sms-provider"

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Normalize phone number (remove spaces, dashes, and ensure it has country code)
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, "")
  
  // If it doesn't start with +, assume it's an Indian number and add +91
  if (!normalized.startsWith("+")) {
    // If it starts with 91 (without +), keep it
    if (normalized.startsWith("91") && normalized.length === 12) {
      normalized = "+" + normalized
    } 
    // If it's 10 digits, assume Indian number
    else if (normalized.length === 10) {
      normalized = "+91" + normalized
    }
    // Otherwise add + if it looks like an international number
    else if (normalized.length > 10) {
      normalized = "+" + normalized
    }
  }
  
  return normalized
}

export async function POST(req: Request) {
  try {
    const { phone, type = "phone-verification" } = await req.json()

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone)
    
    // Validate phone number format (should be +countrycode followed by digits)
    if (!normalizedPhone.match(/^\+\d{10,15}$/)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Please include country code (e.g., +91 for India)" },
        { status: 400 }
      )
    }

    const isDevelopment = process.env.NODE_ENV !== "production" || process.env.SKIP_SMS === "true"

    await connectToDatabase()

    // Check if phone is already verified by another user (if this is verification)
    if (type === "phone-verification") {
      const User = await getUserModel()
      const existingUser = await User.findOne({ 
        phone: normalizedPhone, 
        phoneVerified: true 
      })
      
      if (existingUser) {
        return NextResponse.json(
          { error: "This phone number is already verified by another account." },
          { status: 409 }
        )
      }
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Delete any existing OTP for this phone
    await OTP.deleteMany({ phone: normalizedPhone, type })

    // Save OTP to database
    await OTP.create({
      phone: normalizedPhone,
      otp,
      type,
      expiresAt,
    })

    const message = `Your SecondHome verification code is: ${otp}. Valid for 10 minutes. Never share this code with anyone.`

    if (isDevelopment) {
      console.log(`🔧 DEV MODE - Phone OTP for ${normalizedPhone}: ${otp}`)
    }

    try {
      await sendSms({ to: normalizedPhone, message })
      console.log(`✅ OTP dispatched to ${normalizedPhone}`)

      return NextResponse.json({
        message: "OTP sent successfully",
        phone: normalizedPhone,
        expiresIn: 600,
        devMode: isDevelopment,
        otp: isDevelopment && shouldExposeOtpToClient() ? otp : undefined,
      })
    } catch (smsError: any) {
      console.error("❌ SMS send error:", smsError)
      await OTP.deleteOne({ phone: normalizedPhone, otp })

      return NextResponse.json(
        {
          error: "Failed to send SMS. Please try again later.",
          details: smsError?.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("❌ Send Phone OTP Error:", error)
    return NextResponse.json(
      { error: "An error occurred while sending OTP", details: error.message },
      { status: 500 }
    )
  }
}
