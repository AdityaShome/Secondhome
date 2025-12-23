import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { Booking } from "@/models/booking"
import Razorpay from "razorpay"
import crypto from "crypto"
import mongoose from "mongoose"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
})

/**
 * Verify Razorpay payment
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Payment verification data is required" }, { status: 400 })
    }

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID format" }, { status: 400 })
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(text)
      .digest("hex")

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 })
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
        { error: "You don't have permission to verify this payment" },
        { status: 403 }
      )
    }

    // Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id)

    if (payment.status !== "captured" && payment.status !== "authorized") {
      return NextResponse.json(
        { error: "Payment not completed", paymentStatus: payment.status },
        { status: 400 }
      )
    }

    // Update booking with payment information
    booking.paymentStatus = "paid"
    booking.status = "confirmed"
    booking.paymentId = razorpay_payment_id
    booking.paymentMethod = "upi"
    booking.paymentDetails = {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paidAt: new Date(),
    }
    booking.updatedAt = new Date()

    await booking.save()

    return NextResponse.json({
      success: true,
      message: "Payment verified and confirmed successfully",
      booking,
      paymentId: razorpay_payment_id,
    })
  } catch (error) {
    console.error("Razorpay payment verification error:", error)
    return NextResponse.json(
      {
        error: "An error occurred while verifying payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * Check payment status by order ID
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get("bookingId")
    const orderId = searchParams.get("orderId")

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

    // If booking is already paid, return success
    if (booking.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        isPaid: true,
        paymentStatus: booking.paymentStatus,
        status: booking.status,
      })
    }

    // If order ID is provided, check payment status with Razorpay
    if (orderId && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        // Reinitialize Razorpay with fresh env vars
        const razorpayInstance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        })

        // Check if it's a payment link (starts with "plink_")
        if (orderId.startsWith('plink_')) {
          try {
            const paymentLink = await razorpayInstance.paymentLink.fetch(orderId)
            console.log("=== Payment Link Check ===")
            console.log("Payment Link ID:", orderId)
            console.log("Payment Link Status:", paymentLink.status)
            console.log("Payment Link Amount:", paymentLink.amount)
            console.log("Payment Link Amount Paid:", paymentLink.amount_paid)
            console.log("Payment Link Payments Array:", JSON.stringify(paymentLink.payments, null, 2))
            
            // Check if payment link has payments array with actual payments
            if (paymentLink.payments && Array.isArray(paymentLink.payments) && paymentLink.payments.length > 0) {
              const payment = paymentLink.payments[0]
              console.log("Found payment in payment link:", payment.id, "Status:", payment.status)
              
              // Check if payment is successful
              if (payment.status === "captured" || payment.status === "authorized" || payment.status === "created") {
                booking.paymentStatus = "paid"
                booking.status = "confirmed"
                booking.paymentId = payment.id || orderId
                booking.paymentMethod = "upi"
                booking.paymentDetails = {
                  razorpayPaymentLinkId: orderId,
                  razorpayPaymentId: payment.id,
                  paidAt: new Date(payment.created_at * 1000),
                }
                booking.updatedAt = new Date()
                await booking.save()

                console.log("✅ Booking marked as paid via Payment Link payment:", payment.id)

                return NextResponse.json({
                  success: true,
                  isPaid: true,
                  paymentStatus: "paid",
                  status: "confirmed",
                })
              }
            }
            
            // Also check payment link status and amount_paid
            if (paymentLink.status === "paid" || paymentLink.status === "partially_paid") {
              console.log("Payment Link status indicates paid:", paymentLink.status)
              booking.paymentStatus = "paid"
              booking.status = "confirmed"
              booking.paymentId = orderId
              booking.paymentMethod = "upi"
              booking.paymentDetails = {
                razorpayPaymentLinkId: orderId,
                paidAt: new Date(),
              }
              booking.updatedAt = new Date()
              await booking.save()

              return NextResponse.json({
                success: true,
                isPaid: true,
                paymentStatus: "paid",
                status: "confirmed",
              })
            }
            
            // Check if amount_paid > 0 (means payment was made)
            if (paymentLink.amount_paid && paymentLink.amount_paid > 0) {
              console.log("Payment Link has amount_paid:", paymentLink.amount_paid)
              booking.paymentStatus = "paid"
              booking.status = "confirmed"
              booking.paymentId = orderId
              booking.paymentMethod = "upi"
              booking.paymentDetails = {
                razorpayPaymentLinkId: orderId,
                amountPaid: paymentLink.amount_paid,
                paidAt: new Date(),
              }
              booking.updatedAt = new Date()
              await booking.save()

              return NextResponse.json({
                success: true,
                isPaid: true,
                paymentStatus: "paid",
                status: "confirmed",
              })
            }
            
            console.log("Payment Link not paid yet. Status:", paymentLink.status, "Amount Paid:", paymentLink.amount_paid)
          } catch (linkError: any) {
            console.error("Payment Link fetch error:", {
              message: linkError.message,
              statusCode: linkError.statusCode,
              error: linkError.error,
            })
          }
        }

        // Try as order
        try {
          const order = await razorpayInstance.orders.fetch(orderId)
          console.log("Razorpay order status:", order.status, "for order:", orderId)
          
          // Fetch payments for this order (check even if status isn't "paid" yet)
          const payments = await razorpayInstance.orders.fetchPayments(orderId)
          console.log("Payments found:", payments.items?.length || 0)
          
          if (payments.items && payments.items.length > 0) {
            const payment = payments.items[0]
            console.log("Payment status:", payment.status, "Payment ID:", payment.id)
            
            // Check if payment is successful
            if (payment.status === "captured" || payment.status === "authorized" || payment.status === "created") {
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

              console.log("Booking marked as paid via Razorpay payment:", payment.id)

              return NextResponse.json({
                success: true,
                isPaid: true,
                paymentStatus: "paid",
                status: "confirmed",
              })
            }
          }
          
          // Also check order status directly
          if (order.status === "paid" || order.status === "attempted") {
            console.log("Order status indicates payment:", order.status)
            booking.paymentStatus = "paid"
            booking.status = "confirmed"
            booking.paymentId = orderId
            booking.paymentMethod = "upi"
            booking.paymentDetails = {
              razorpayOrderId: orderId,
              paidAt: new Date(),
            }
            booking.updatedAt = new Date()
            await booking.save()

            return NextResponse.json({
              success: true,
              isPaid: true,
              paymentStatus: "paid",
              status: "confirmed",
            })
          }
        } catch (orderError: any) {
          console.log("Not an order or error fetching:", orderError.message)
        }
      } catch (razorpayError: any) {
        console.error("Razorpay verification error:", {
          message: razorpayError.message,
          statusCode: razorpayError.statusCode,
          error: razorpayError.error,
        })
        // Continue to return booking status
      }
    }

    return NextResponse.json({
      success: true,
      isPaid: booking.paymentStatus === "paid",
      paymentStatus: booking.paymentStatus,
      status: booking.status,
    })
  } catch (error) {
    console.error("Payment status check error:", error)
    return NextResponse.json(
      {
        error: "An error occurred while checking payment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

