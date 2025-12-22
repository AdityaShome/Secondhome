import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"
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

    const property = await Property.findByIdAndUpdate(
      id,
      {
        isApproved: true,
        isRejected: false,
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
      { new: true }
    ).populate("owner", "name email")

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    // TODO: Send approval email to property owner
    // await sendApprovalEmail(property.owner.email, property)

    return NextResponse.json({
      message: "Property approved successfully",
      property,
    })
  } catch (error) {
    console.error("Error approving property:", error)
    return NextResponse.json({ error: "Failed to approve property" }, { status: 500 })
  }
}

