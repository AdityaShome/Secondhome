import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserModel } from "@/models/user"
import { hash, compare } from "bcryptjs"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  college: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
})

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Validate input
    const validation = updateProfileSchema.safeParse(body)
    if (!validation.success) {
      const errorMessage = validation.error.issues[0]?.message || "Invalid input data"
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    await connectToDatabase()
    const User = await getUserModel()

    const user = await User.findById(session.user.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updateData: any = {}

    // Update name if provided
    if (body.name) {
      updateData.name = body.name
    }

    // Update email if provided
    if (body.email) {
      // Check if email already exists (excluding current user)
      const existingUser = await User.findOne({ email: body.email, _id: { $ne: session.user.id } })
      if (existingUser) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 })
      }
      updateData.email = body.email
    }

    // Update phone if provided
    if (body.phone !== undefined) {
      updateData.phone = body.phone
    }

    // Update image if provided
    if (body.image !== undefined) {
      updateData.image = body.image
    }

    // Update other profile fields
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth
    if (body.gender !== undefined) updateData.gender = body.gender
    if (body.nationality !== undefined) updateData.nationality = body.nationality
    if (body.college !== undefined) updateData.college = body.college
    if (body.address !== undefined) updateData.address = body.address
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.pincode !== undefined) updateData.pincode = body.pincode

    // Update password if both current and new passwords are provided
    if (body.currentPassword || body.newPassword) {
      if (!body.currentPassword || !body.newPassword) {
        return NextResponse.json({ 
          error: "Both current password and new password are required to change password" 
        }, { status: 400 })
      }

      // Verify current password
      const isPasswordValid = await compare(body.currentPassword, user.password)

      if (!isPasswordValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }

      updateData.password = await hash(body.newPassword, 12)
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).select("-password")

    return NextResponse.json({ 
      message: "Profile updated successfully",
      user: updatedUser
    }, { status: 200 })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "An error occurred while updating your profile" }, { status: 500 })
  }
}

