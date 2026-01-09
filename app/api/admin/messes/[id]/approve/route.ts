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

    await connectToDatabase()
    const { id } = await params

    const mess = await Mess.findByIdAndUpdate(
      id,
      {
        isApproved: true,
        isRejected: false,
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
      { new: true },
    ).populate("owner", "name email")

    if (!mess) {
      return NextResponse.json({ error: "Mess not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Mess approved successfully", mess })
  } catch (error) {
    console.error("Error approving mess:", error)
    return NextResponse.json({ error: "Failed to approve mess" }, { status: 500 })
  }
}
