import { NextResponse } from "next/server"
import { getUserModel } from "@/models/user"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim()

    await connectToDatabase()
    const User = await getUserModel()
    
    // Check if user already exists (emails are stored normalized)
    const existingUser = await User.findOne({ 
      email: normalizedEmail
    })
    
    if (existingUser) {
      return NextResponse.json({ 
        exists: true,
        message: "An account with this email already exists. Please login instead." 
      }, { status: 409 })
    }

    return NextResponse.json({ 
      exists: false,
      message: "Email available for registration" 
    }, { status: 200 })
  } catch (error) {
    console.error("Email check error:", error)
    return NextResponse.json({ error: "Failed to check email" }, { status: 500 })
  }
}
