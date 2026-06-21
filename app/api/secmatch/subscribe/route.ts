import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getSession } from "@/lib/get-session"
import { getSecMatchSubscriptionModel } from "@/models/SecMatchSubscription"
import { getSecMatchProfileModel } from "@/models/SecMatchProfile"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { paymentMethod, transactionId } = await request.json()

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method required" }, { status: 400 })
    }

    await connectToDatabase()
    const SecMatchSubscription = await getSecMatchSubscriptionModel()
    const SecMatchProfile = await getSecMatchProfileModel()

    const startDate = new Date()
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + 1) // 1 month subscription

    // Create subscription record
    const subscription = await SecMatchSubscription.create({
      userId: session.user.id,
      plan: "monthly",
      amount: 25,
      currency: "INR",
      paymentMethod,
      transactionId: transactionId || `TXN_${Date.now()}_${session.user.id}`,
      status: "active",
      startDate,
      expiryDate,
    })

    // Update user profile to subscribed
    await SecMatchProfile.findOneAndUpdate(
      { userId: session.user.id },
      { isSubscribed: true, subscriptionExpiry: expiryDate },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      subscription,
      message: "Subscription activated! You can now chat with your matches.",
    })
  } catch (error: any) {
    console.error("Error activating subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()
    const SecMatchSubscription = await getSecMatchSubscriptionModel()

    const sub = await SecMatchSubscription.findOne({
      userId: session.user.id,
      status: "active",
      expiryDate: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ subscription: sub || null, isActive: !!sub })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
