import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { Booking } from "@/models/booking"
// Use require for Razorpay (CommonJS module)
const Razorpay = require("razorpay")
import mongoose from "mongoose"

/**
 * Create Razorpay Payment Link for UPI payment (with trackable QR code)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { bookingId, amount } = body

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 })
    }

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID format" }, { status: 400 })
    }

    await connectToDatabase()

    // Find the booking
    const booking = await Booking.findById(bookingId)

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Check if user is the booking owner
    if (booking.user.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to pay for this booking" },
        { status: 403 }
      )
    }

    // Check if already paid
    if (booking.paymentStatus === "paid") {
      return NextResponse.json({ error: "This booking is already paid" }, { status: 400 })
    }

    // Check if Razorpay is configured
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Payment gateway is not configured. Please contact support." },
        { status: 500 }
      )
    }

    // Initialize Razorpay
    const razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    // Create Razorpay Payment Link (this generates a QR code that Razorpay can track)
    const paymentLinkOptions = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      description: `Payment for booking ${bookingId}`,
      customer: {
        name: session.user.name || "Customer",
        email: session.user.email || "",
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      notes: {
        bookingId: bookingId.toString(),
        userId: session.user.id,
        propertyId: booking.property.toString(),
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/callback`,
      callback_method: "get",
    }

    console.log("Creating Razorpay Payment Link for amount:", paymentLinkOptions.amount, "paise")
    
    const paymentLink = await razorpayInstance.paymentLink.create(paymentLinkOptions)
    console.log("Payment Link created:", paymentLink.id, "Short URL:", paymentLink.short_url)
    console.log("Payment Link full response:", JSON.stringify(paymentLink, null, 2))

    // Store payment link ID in booking
    booking.paymentId = paymentLink.id
    booking.updatedAt = new Date()
    await booking.save()

    // Razorpay payment link QR code might be in different fields or need to be generated
    // Check multiple possible fields for QR code
    const qrCodeUrl = paymentLink.qr_code || 
                     paymentLink.qr_code_url || 
                     paymentLink.qr_code_image || 
                     (paymentLink.short_url ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentLink.short_url)}` : null)

    if (!qrCodeUrl) {
      console.error("❌ No QR code found in payment link response. Available fields:", Object.keys(paymentLink))
      // Generate QR code from short URL as fallback
      const generatedQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentLink.short_url)}`
      console.log("Generated QR code from short URL:", generatedQrCode)
      
      return NextResponse.json({
        success: true,
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        qrCode: generatedQrCode, // Generate QR code from short URL
        amount: paymentLink.amount,
        currency: paymentLink.currency,
      })
    }

    return NextResponse.json({
      success: true,
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
      qrCode: qrCodeUrl,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
    })
  } catch (error: any) {
    console.error("Razorpay Payment Link creation error:", error)
    
    if (error?.statusCode === 401) {
      return NextResponse.json(
        {
          error: "Razorpay Authentication Failed",
          details: "Your Razorpay API keys are invalid. Please check your keys.",
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      {
        error: "An error occurred while creating payment link",
        details: error?.error?.description || error?.message || "Unknown error",
        statusCode: error?.statusCode,
      },
      { status: 500 }
    )
  }
}

