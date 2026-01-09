import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Mess } from "@/models/mess"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"

// Get all messes for admin (including pending)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "all" // all, pending, approved, rejected

    await connectToDatabase()

    let query: any = {}
    if (status === "pending") {
      query.isApproved = false
      query.isRejected = { $ne: true }
    } else if (status === "approved") {
      query.isApproved = true
    } else if (status === "rejected") {
      query.isRejected = true
    }

    const messes = await Mess.find(query).populate("owner", "name email phone").sort({ createdAt: -1 })

    return NextResponse.json({ messes })
  } catch (error) {
    console.error("Error fetching messes:", error)
    return NextResponse.json({ error: "Failed to fetch messes" }, { status: 500 })
  }
}
