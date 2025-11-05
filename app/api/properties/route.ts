import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50") // Higher limit for map view
    const type = searchParams.get("type")
    const gender = searchParams.get("gender")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const location = searchParams.get("location")
    
    // Geolocation parameters for map view
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    const radius = searchParams.get("radius")

    await connectToDatabase()

    // Build query - ONLY show approved properties
    const query: any = { isApproved: true, isRejected: false }

    // Geospatial query for map view
    if (lat && lng && radius) {
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lng)
      const radiusInMeters = parseInt(radius)
      
      query.coordinates = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude], // GeoJSON uses [lng, lat]
          },
          $maxDistance: radiusInMeters,
        },
      }
    }

    if (type) query.type = type
    if (gender) query.gender = gender
    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = parseInt(minPrice)
      if (maxPrice) query.price.$lte = parseInt(maxPrice)
    }
    if (location) query.location = new RegExp(location, "i")

    const skip = (page - 1) * limit

    // If using geospatial query, don't use skip/limit (it causes issues with $near)
    let properties
    let total
    
    if (lat && lng && radius) {
      properties = await Property.find(query)
        .limit(limit)
        .populate("owner", "name email")
      total = properties.length
      
      // Return array directly for map view
      return NextResponse.json(properties)
    } else {
      [properties, total] = await Promise.all([
        Property.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("owner", "name email"),
        Property.countDocuments(query),
      ])

      return NextResponse.json({
        properties,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          current: page,
          limit,
        },
      })
    }
  } catch (error) {
    console.error("Error fetching properties:", error)
    return NextResponse.json({
      properties: [],
      pagination: { total: 0, pages: 0 },
    })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // ========================================
    // AI VERIFICATION - Check property legitimacy
    // ========================================
    let aiVerification: any = null
    let autoApproved = false

    try {
      console.log("🤖 Starting AI verification for property...")
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://secondhome-eight.vercel.app'
      const verifyResponse = await fetch(`${baseUrl}/api/ai/verify-property`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (verifyResponse.ok) {
        aiVerification = await verifyResponse.json()
        console.log("✅ AI Verification completed:", {
          score: aiVerification.score,
          recommendation: aiVerification.recommendation,
          verified: aiVerification.verified
        })

        // Auto-approve if AI is confident and score is high
        if (aiVerification.verified && aiVerification.score >= 70 && aiVerification.confidence >= 75) {
          autoApproved = true
          console.log("🎉 Property AUTO-APPROVED by AI!")
        } else {
          console.log("⚠️ Property flagged for manual review")
        }
      }
    } catch (verifyError) {
      console.error("AI verification failed:", verifyError)
      // Continue with manual review if AI fails
    }

    await connectToDatabase()

    // Create property with AI review data
    const newProperty = new Property({
      ...body,
      owner: session.user.id,
      createdAt: new Date(),
      isApproved: autoApproved, // Auto-approve if AI verified
      approvedAt: autoApproved ? new Date() : undefined,
      approvalMethod: autoApproved ? "AI" : undefined,
      aiReview: aiVerification ? {
        reviewed: true,
        reviewedAt: new Date(),
        confidence: aiVerification.confidence || 0,
        score: aiVerification.score || 0,
        recommendation: aiVerification.recommendation || "REVIEW",
        analysis: aiVerification.analysis || {},
        redFlags: aiVerification.redFlags || [],
        reason: aiVerification.reason || "AI verification completed"
      } : undefined
    })

    await newProperty.save()

    // Send notification to admin only if needs manual review
    if (!autoApproved) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://secondhome-eight.vercel.app'
        await fetch(`${baseUrl}/api/properties/notify-admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: newProperty._id,
            propertyTitle: newProperty.title,
            ownerName: session.user.name,
            ownerEmail: session.user.email,
            aiReview: aiVerification,
          }),
        })
        console.log("✅ Admin notification sent successfully")
      } catch (emailError) {
        console.error("⚠️ Failed to send admin notification:", emailError)
        // Don't fail the request if email fails
      }
    }

    // Prepare response message based on verification result
    let message = ""
    let statusInfo: any = {}

    if (autoApproved) {
      message = "🎉 Congratulations! Your property has been verified and is now LIVE on Second Home!"
      statusInfo = {
        status: "approved",
        verifiedBy: "AI",
        listedAt: new Date()
      }
    } else if (aiVerification?.needsReview) {
      message = "Your property is under review. Our team will verify it within 24 hours."
      statusInfo = {
        status: "pending_review",
        aiScore: aiVerification.score,
        estimatedReviewTime: "24 hours"
      }
    } else {
      message = "Property submitted successfully! It will be listed after admin approval."
      statusInfo = {
        status: "pending_review"
      }
    }

    return NextResponse.json({ 
      message,
      property: newProperty,
      aiVerification: aiVerification || null,
      ...statusInfo
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating property:", error)
    return NextResponse.json({ error: "An error occurred while creating the property" }, { status: 500 })
  }
}
