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

    const { reason } = await req.json()

    await connectToDatabase()
    const { id } = await params

    const property = await Property.findByIdAndUpdate(
      id,
      {
        isApproved: false,
        isRejected: true,
        rejectedAt: new Date(),
        rejectedBy: session.user.id,
        rejectionReason: reason,
      },
      { new: true }
    ).populate("owner", "name email")

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    // TODO: Send rejection email to property owner
    // await sendRejectionEmail(property.owner.email, property, reason)

    return NextResponse.json({
      message: "Property rejected successfully",
      property,
    })
  } catch (error) {
    console.error("Error rejecting property:", error)
    return NextResponse.json({ error: "Failed to reject property" }, { status: 500 })
  }
}

