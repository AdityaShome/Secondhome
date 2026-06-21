import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getSession } from "@/lib/get-session"
import { getSecMatchLikeModel } from "@/models/SecMatchLike"
import { getSecMatchProfileModel } from "@/models/SecMatchProfile"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { toUserId, action } = await request.json()
    if (!toUserId || !action || !["like", "pass"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    if (toUserId === session.user.id) {
      return NextResponse.json({ error: "Cannot like yourself" }, { status: 400 })
    }

    await connectToDatabase()
    const SecMatchLike = await getSecMatchLikeModel()
    const SecMatchProfile = await getSecMatchProfileModel()

    // Upsert the like/pass
    await SecMatchLike.findOneAndUpdate(
      { fromUserId: session.user.id, toUserId },
      { fromUserId: session.user.id, toUserId, action },
      { upsert: true, new: true }
    )

    let isMutualMatch = false
    let matchProfile = null

    if (action === "like") {
      // Check if the other person also liked this user
      const theirLike = await SecMatchLike.findOne({
        fromUserId: toUserId,
        toUserId: session.user.id,
        action: "like",
      })

      if (theirLike) {
        isMutualMatch = true
        matchProfile = await SecMatchProfile.findOne({ userId: toUserId })
          .select("name age college course interests photo bio accommodationType preferredLocation")
          .lean()
          
        try {
          const { User } = await import("@/models/user")
          const targetUser = await User.findById(toUserId).lean()
          if (targetUser && targetUser.email) {
            const nodemailer = await import("nodemailer")
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
            })
            await transporter.sendMail({
              from: `"SecMatch" <${process.env.EMAIL_USER}>`,
              to: targetUser.email,
              subject: "🎉 You have a new Roommate Match on SecMatch!",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                  <h2 style="color: #f97316;">Roommate Match! 🤝</h2>
                  <p style="font-size: 16px; color: #374151;">Great news! Someone you requested to connect with just accepted your request.</p>
                  <p style="font-size: 16px; color: #374151;">You now have a mutual connection and can start chatting immediately to secure your perfect roommate.</p>
                  <div style="margin-top: 30px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/secmatch/matches" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Your Match</a>
                  </div>
                </div>
              `
            })
          }
        } catch (mailError) {
          console.error("Failed to send match email:", mailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      action,
      isMutualMatch,
      matchProfile,
      message: isMutualMatch ? "It's a Match! 🎉" : action === "like" ? "Liked!" : "Passed",
    })
  } catch (error: any) {
    console.error("Error in SecMatch like:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
