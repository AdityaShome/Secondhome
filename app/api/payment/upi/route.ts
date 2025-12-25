import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { Booking } from "@/models/booking"
import mongoose from "mongoose"

/**
 * Check UPI payment status
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get("bookingId")

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
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
        { error: "You don't have permission to check this booking" },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      paymentStatus: booking.paymentStatus,
      status: booking.status,
      isPaid: booking.paymentStatus === "paid",
    })
  } catch (error) {
    console.error("UPI payment status check error:", error)
    return NextResponse.json(
      {
        error: "An error occurred while checking payment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * Handle UPI payment confirmation
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { bookingId, amount, upiId, paymentMethod = "upi" } = body

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID format" }, { status: 400 })
    }

    await connectToDatabase()

    // Find the booking
    const booking = await Booking.findById(bookingId).populate("property")

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
    if (amount && Math.abs(booking.totalAmount - amount) > 0.01) {
      return NextResponse.json(
        { error: "Payment amount doesn't match booking amount" },
        { status: 400 }
      )
    }

    // Update booking with payment information
    booking.paymentStatus = "paid"
    booking.status = "confirmed"
    booking.paymentId = `upi_${Date.now()}_${bookingId}`
    booking.paymentMethod = paymentMethod
    booking.paymentDetails = {
      upiId: upiId || "qr_scan",
      paidAt: new Date(),
    }
    booking.updatedAt = new Date()

    await booking.save()

    return NextResponse.json({
      success: true,
      message: "UPI payment confirmed successfully",
      booking,
      paymentId: booking.paymentId,
    })
  } catch (error) {
    console.error("UPI payment error:", error)
    return NextResponse.json(
      {
        error: "An error occurred during UPI payment processing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

