import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Mess } from "@/models/mess"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { reason } = await req.json()

    await connectToDatabase()
    const { id } = await params

    const mess = await Mess.findByIdAndUpdate(
      id,
      {
        isApproved: false,
        isRejected: true,
        rejectedAt: new Date(),
        rejectedBy: session.user.id,
        rejectionReason: reason,
      },
      { new: true },
    ).populate("owner", "name email")

    if (!mess) {
      return NextResponse.json({ error: "Mess not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Mess rejected successfully", mess })
  } catch (error) {
    console.error("Error rejecting mess:", error)
    return NextResponse.json({ error: "Failed to reject mess" }, { status: 500 })
  }
}
