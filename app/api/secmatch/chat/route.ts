import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getSession } from "@/lib/get-session"
import { getSecMatchMessageModel } from "@/models/SecMatchMessage"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get("matchId")
    if (!matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 })

    await connectToDatabase()
    const SecMatchMessage = await getSecMatchMessageModel()

    // Find all messages between current user and matchId
    const messages = await SecMatchMessage.find({
      $or: [
        { fromUserId: session.user.id, toUserId: matchId },
        { fromUserId: matchId, toUserId: session.user.id }
      ]
    })
      .sort({ createdAt: 1 })
      .lean()

    // Mark received messages as read
    await SecMatchMessage.updateMany(
      { fromUserId: matchId, toUserId: session.user.id, read: false },
      { $set: { read: true } }
    )

    return NextResponse.json({ success: true, messages })
  } catch (error: any) {
    console.error("Error fetching chat messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { toUserId, content } = await request.json()
    if (!toUserId || !content || content.trim().length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    await connectToDatabase()
    const SecMatchMessage = await getSecMatchMessageModel()

    const newMessage = await SecMatchMessage.create({
      fromUserId: session.user.id,
      toUserId,
      content: content.trim()
    })

    return NextResponse.json({ success: true, message: newMessage })
  } catch (error: any) {
    console.error("Error sending chat message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
