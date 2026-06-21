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
