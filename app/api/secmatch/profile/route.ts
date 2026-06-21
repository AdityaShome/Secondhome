import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getSession } from "@/lib/get-session"
import { getSecMatchProfileModel } from "@/models/SecMatchProfile"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()
    const SecMatchProfile = await getSecMatchProfileModel()
    const profile = await SecMatchProfile.findOne({ userId: session.user.id }).lean()

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 })
    }

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error("Error fetching SecMatch profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    await connectToDatabase()
    const SecMatchProfile = await getSecMatchProfileModel()

    const existing = await SecMatchProfile.findOne({ userId: session.user.id })

    if (existing) {
      // Update
      const updated = await SecMatchProfile.findOneAndUpdate(
        { userId: session.user.id },
        { ...body, updatedAt: new Date() },
        { new: true }
      )
      return NextResponse.json({ profile: updated, message: "Profile updated!" }, { status: 200 })
    } else {
      // Create
      const profile = await SecMatchProfile.create({
        userId: session.user.id,
        ...body,
      })
      return NextResponse.json({ profile, message: "Profile created!" }, { status: 201 })
    }
  } catch (error: any) {
    console.error("Error saving SecMatch profile:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
