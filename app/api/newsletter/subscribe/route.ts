import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import Newsletter from "@/models/newsletter"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Check if already subscribed
    const existing = await Newsletter.findOne({ email: email.toLowerCase() })

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { message: "You're already subscribed! Check your inbox for updates." },
          { status: 200 }
        )
      } else {
        // Reactivate subscription
        existing.isActive = true
        existing.subscribedAt = new Date()
        await existing.save()

        return NextResponse.json({
          success: true,
          message: "Welcome back! Your subscription has been reactivated.",
        })
      }
    }

    // Create new subscription
    const unsubscribeToken = crypto.randomBytes(32).toString("hex")
    
    const newsletter = await Newsletter.create({
      email: email.toLowerCase(),
      unsubscribeToken,
      subscribedAt: new Date(),
      isActive: true,
    })

    // Send welcome email
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "https://secondhome-eight.vercel.app"}/api/newsletter/send-welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletter.email, unsubscribeToken }),
      })
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError)
      // Don't fail the subscription if email fails
    }

    return NextResponse.json({
      success: true,
      message: "🎉 Subscribed! Check your email for exclusive property updates.",
    })
  } catch (error: any) {
    console.error("Error subscribing to newsletter:", error)
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 }
    )
  }
}

// Unsubscribe endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 })
    }

    await connectToDatabase()

    const subscriber = await Newsletter.findOne({ unsubscribeToken: token })

    if (!subscriber) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    subscriber.isActive = false
    await subscriber.save()

    return NextResponse.json({
      success: true,
      message: "You've been unsubscribed. We're sorry to see you go!",
    })
  } catch (error) {
    console.error("Error unsubscribing:", error)
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 })
  }
}


