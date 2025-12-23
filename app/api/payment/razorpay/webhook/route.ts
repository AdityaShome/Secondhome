import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Booking } from "@/models/booking"
import Razorpay from "razorpay"
import crypto from "crypto"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
})

/**
 * Razorpay webhook handler for automatic payment status updates
 */
export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = req.headers.get("x-razorpay-signature")

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || ""
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex")

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const event = JSON.parse(body)

    await connectToDatabase()

    // Handle payment.captured event
    if (event.event === "payment.captured" || event.event === "payment.authorized") {
      const payment = event.payload.payment.entity
      const orderId = payment.order_id

      // Find booking by order ID (stored in paymentId)
      const booking = await Booking.findOne({ paymentId: orderId })

      if (booking && booking.paymentStatus !== "paid") {
        // Update booking
        booking.paymentStatus = "paid"
        booking.status = "confirmed"
        booking.paymentId = payment.id
        booking.paymentMethod = "upi"
        booking.paymentDetails = {
          razorpayOrderId: orderId,
          razorpayPaymentId: payment.id,
          paidAt: new Date(payment.created_at * 1000),
        }
        booking.updatedAt = new Date()
        await booking.save()

        console.log(`Booking ${booking._id} marked as paid via webhook`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      {
        error: "An error occurred while processing webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

