import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { Booking } from "@/models/booking"
import mongoose from "mongoose"
// Use require for Razorpay (CommonJS module)
const Razorpay = require("razorpay")

/**
 * Create Razorpay order for UPI payment
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

    // Verify amount matches
    if (Math.abs(booking.totalAmount - amount) > 0.01) {
      return NextResponse.json(
        { error: "Payment amount doesn't match booking amount" },
        { status: 400 }
      )
    }

    // Check if Razorpay is configured
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    
    if (!keyId || !keySecret) {
      console.error("Razorpay keys missing:", { 
        keyId: keyId ? "Set" : "Missing", 
        keySecret: keySecret ? "Set" : "Missing" 
      })
      return NextResponse.json(
        { error: "Payment gateway is not configured. Please contact support." },
        { status: 500 }
      )
    }

    // Log key info (without exposing full secret)
    console.log("Razorpay Key ID:", keyId)
    console.log("Razorpay Key Secret:", keySecret ? `${keySecret.substring(0, 4)}...` : "Missing")

    // Reinitialize Razorpay with fresh env vars (in case they changed)
    const razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    // Create Razorpay order
    // Receipt must be max 40 characters, so we'll use a shorter format
    const shortReceipt = `bk_${bookingId.toString().substring(0, 12)}_${Date.now().toString().slice(-8)}`
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: shortReceipt.length > 40 ? shortReceipt.substring(0, 40) : shortReceipt,
      notes: {
        bookingId: bookingId.toString(),
        userId: session.user.id,
        propertyId: booking.property.toString(),
      },
      payment_capture: 1, // Auto capture
    }

    console.log("Creating Razorpay order with amount:", options.amount, "paise (₹" + amount + ")")
    
    const order = await razorpayInstance.orders.create(options)
    console.log("Razorpay order created successfully:", order.id)

    // Store order ID in booking for reference
    booking.paymentId = order.id
    booking.updatedAt = new Date()
    await booking.save()

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      name: "SecondHome Official",
      description: `Payment for booking ${bookingId}`,
      prefill: {
        email: session.user.email || "",
        name: session.user.name || "",
      },
    })
  } catch (error: any) {
    console.error("Razorpay order creation error:", error)
    
    // Provide more specific error messages
    if (error?.statusCode === 401) {
      return NextResponse.json(
        {
          error: "Razorpay Authentication Failed",
          details: "Your Razorpay API keys are invalid, expired, or don't match. Please check your keys in the Razorpay Dashboard and regenerate them if needed.",
          hint: "Go to Razorpay Dashboard → Settings → API Keys → Regenerate Test Keys",
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      {
        error: "An error occurred while creating payment order",
        details: error?.error?.description || error?.message || "Unknown error",
        statusCode: error?.statusCode,
      },
      { status: 500 }
    )
  }
}

