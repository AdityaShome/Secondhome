import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Mess } from "@/models/mess"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import mongoose from "mongoose"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid mess ID" }, { status: 400 })
    }

    await connectToDatabase()

    const mess = await Mess.findById(id).populate("owner", "name email phone image")

    if (!mess) {
      return NextResponse.json({ error: "Mess not found" }, { status: 404 })
    }

    // Only approved messes are public. Pending/rejected are visible to admin/owner only.
    if (!mess.isApproved || mess.isRejected) {
      const session = await getServerSession(authOptions)
      const isAdmin = !!session && session.user.role === "admin"
      const ownerId = String((mess.owner as any)?._id ?? mess.owner)
      const isOwner = !!session && ownerId === session.user.id

      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Mess not found" }, { status: 404 })
      }
    }

    return NextResponse.json(mess)
  } catch (error) {
    console.error("Error fetching mess:", error)
    return NextResponse.json({ error: "An error occurred while fetching the mess" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    await connectToDatabase()

    const mess = await Mess.findById(id)

    if (!mess) {
      return NextResponse.json({ error: "Mess not found" }, { status: 404 })
    }

    // Check if user is the owner or an admin
    if (mess.owner.toString() !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "You don't have permission to update this mess" }, { status: 403 })
    }

    const updatedMess = await Mess.findByIdAndUpdate(id, { ...body, updatedAt: new Date() }, { new: true })

    return NextResponse.json(updatedMess)
  } catch (error) {
    console.error("Error updating mess:", error)
    return NextResponse.json({ error: "An error occurred while updating the mess" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    await connectToDatabase()

    const mess = await Mess.findById(id)

    if (!mess) {
      return NextResponse.json({ error: "Mess not found" }, { status: 404 })
    }

    // Check if user is the owner or an admin
    if (mess.owner.toString() !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "You don't have permission to delete this mess" }, { status: 403 })
    }

    await Mess.findByIdAndDelete(id)

    return NextResponse.json({ message: "Mess deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting mess:", error)
    return NextResponse.json({ error: "An error occurred while deleting the mess" }, { status: 500 })
  }
}
