import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { OTP } from "@/models/otp"
import { getUserModel } from "@/models/user"
import twilio from "twilio"

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

    // Validate Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
    const isDevelopment = process.env.NODE_ENV === "development" || process.env.SKIP_SMS === "true"
    
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.error("❌ Twilio credentials not configured")
      return NextResponse.json(
        { error: "SMS service not configured. Please contact support." },
        { status: 500 }
      )
    }

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

    // Send SMS via Twilio or skip in development mode
    if (isDevelopment) {
      // Development mode: Log OTP to console instead of sending SMS
      console.log(`🔧 DEV MODE - Phone OTP for ${normalizedPhone}: ${otp}`)
      console.log(`⚠️ Twilio trial account detected or SKIP_SMS enabled. Check console for OTP.`)
      
      return NextResponse.json({
        message: "OTP generated successfully (check server console in development mode)",
        phone: normalizedPhone,
        expiresIn: 600,
        devMode: true,
        otp: isDevelopment ? otp : undefined, // Only expose OTP in dev mode
      })
    }

    try {
      const client = twilio(accountSid, authToken)
      
      await client.messages.create({
        body: `Your Second Home verification code is: ${otp}. Valid for 10 minutes. Never share this code with anyone.`,
        from: twilioPhoneNumber,
        to: normalizedPhone,
      })

      console.log(`✅ OTP sent successfully to ${normalizedPhone}`)
      
      return NextResponse.json({
        message: "OTP sent successfully",
        phone: normalizedPhone,
        expiresIn: 600, // 10 minutes in seconds
      })
    } catch (twilioError: any) {
      console.error("❌ Twilio SMS Error:", twilioError)
      
      // If it's a trial account error, switch to dev mode
      if (twilioError.code === 21608) {
        console.log(`🔧 DEV MODE FALLBACK - Phone OTP for ${normalizedPhone}: ${otp}`)
        console.log(`⚠️ Twilio trial account limitation. Use this OTP: ${otp}`)
        
        return NextResponse.json({
          message: "OTP generated (Twilio trial account - check server console for OTP)",
          phone: normalizedPhone,
          expiresIn: 600,
          devMode: true,
          otp: otp, // Expose OTP due to trial limitation
          warning: "Using development mode due to Twilio trial account"
        })
      }
      
      // Clean up OTP if SMS failed for other reasons
      await OTP.deleteOne({ phone: normalizedPhone, otp })
      
      return NextResponse.json(
        { 
          error: "Failed to send SMS. Please check your phone number and try again.",
          details: twilioError.message 
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
