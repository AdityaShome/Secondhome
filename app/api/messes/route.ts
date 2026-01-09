import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Mess } from "@/models/mess"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const query = url.searchParams.get("query") || ""
    const minPrice = Number.parseInt(url.searchParams.get("minPrice") || "0")
    const maxPrice = Number.parseInt(url.searchParams.get("maxPrice") || "10000")
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    // Skip DB connection if MONGODB_URI is not defined (during build)
    if (!process.env.MONGODB_URI) {
      // Return empty data during build
      return NextResponse.json({
        messes: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0,
        },
      })
    }

    // Connect to MongoDB
    try {
      await connectToDatabase()
    } catch (error) {
      console.error("MongoDB connection error:", error)
      return NextResponse.json(
        {
          error: "Failed to connect to database",
          messes: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            pages: 0,
          },
        },
        { status: 500 },
      )
    }

    // Build filter
    const filter: any = {
      monthlyPrice: { $gte: minPrice, $lte: maxPrice },
      isApproved: true,
      isRejected: false,
    }

    if (query) {
      filter.$or = [{ name: { $regex: query, $options: "i" } }, { location: { $regex: query, $options: "i" } }]
    }

    try {
      // Get total count for pagination
      const total = await Mess.countDocuments(filter)

      // Get messes
      const messes = await Mess.find(filter).sort({ rating: -1 }).skip(skip).limit(limit)

      return NextResponse.json({
        messes,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Error fetching messes:", error)
      return NextResponse.json(
        {
          error: "An error occurred while fetching messes",
          messes: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            pages: 0,
          },
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in messes API route:", error)
    return NextResponse.json({ error: "An error occurred while processing your request" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Skip DB connection if MONGODB_URI is not defined (during build)
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 503 })
    }

    try {
      await connectToDatabase()
    } catch (error) {
      console.error("MongoDB connection error:", error)
      return NextResponse.json({ error: "Failed to connect to database" }, { status: 500 })
    }

    try {
      const newMess = new Mess({
        ...body,
        owner: session.user.id,
        createdAt: new Date(),
      })

      await newMess.save()

      return NextResponse.json({ message: "Mess listed successfully", mess: newMess }, { status: 201 })
    } catch (error) {
      console.error("Error creating mess:", error)
      return NextResponse.json({ error: "An error occurred while creating the mess" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in messes POST route:", error)
    return NextResponse.json({ error: "An error occurred while processing your request" }, { status: 500 })
  }
}
