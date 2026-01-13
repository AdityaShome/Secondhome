import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Mess } from "@/models/mess"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import Groq from "groq-sdk"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    // Admin-only: mess AI review is an internal moderation tool
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    const groq = new Groq({ apiKey: GROQ_API_KEY })

    await connectToDatabase()

    const { id } = await params
    const mess = await Mess.findById(id).populate("owner", "name email")

    if (!mess) {
      return NextResponse.json({ error: "Mess not found" }, { status: 404 })
    }

    const messData = {
      name: mess.name,
      description: mess.description,
      address: mess.address,
      location: mess.location,
      city: mess.city,
      state: mess.state,
      pincode: mess.pincode,
      monthlyPrice: mess.monthlyPrice,
      dailyPrice: mess.dailyPrice,
      trialDays: mess.trialDays,
      homeDeliveryAvailable: mess.homeDeliveryAvailable,
      deliveryRadius: mess.deliveryRadius,
      deliveryCharges: mess.deliveryCharges,
      packagingAvailable: mess.packagingAvailable,
      packagingPrice: mess.packagingPrice,
      mealTypes: mess.mealTypes,
      cuisineTypes: mess.cuisineTypes,
      dietTypes: mess.dietTypes,
      openingHours: mess.openingHours,
      amenities: mess.amenities,
      capacity: mess.capacity,
      contactName: mess.contactName,
      contactPhone: mess.contactPhone,
      contactEmail: mess.contactEmail,
      imagesCount: Array.isArray(mess.images) ? mess.images.length : 0,
    }

    const prompt = `You are an AI moderation assistant for a student mess/food subscription platform.
Review the following mess listing and provide a suggestion-only assessment (DO NOT auto-approve or auto-reject).

Mess Details:
${JSON.stringify(messData, null, 2)}

Analyze the listing for:
1) Realness/Legitimacy: does it look genuine?
2) Pricing reasonableness: price vs details and location fields.
3) Completeness: required fields, contact clarity, menu/timings, photos count.
4) Safety & compliance: suspicious claims, spam/scam indicators.
5) Delivery/Packaging: are charges reasonable and consistent?

Return ONLY valid JSON (no markdown) in this exact shape:
{
  "confidence": 0-100,
  "score": 0-100,
  "recommendation": "APPROVE" | "REJECT" | "MANUAL_REVIEW",
  "summary": "short human summary",
  "analysis": {
    "legitimacy": "...",
    "pricing": "...",
    "completeness": "...",
    "safety": "...",
    "deliveryPackaging": "..."
  },
  "redFlags": ["..."],
  "reason": "one-liner why this recommendation"
}

Important: This is only a suggestion to help the admin. Never state that you approved/rejected it.`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    })

    const aiText = completion.choices[0]?.message?.content || ""

    let aiResult: any
    try {
      aiResult = JSON.parse(aiText)
    } catch (e) {
      // Attempt to extract JSON if model accidentally returned extra text
      const match = aiText.match(/\{[\s\S]*\}/)
      if (match) {
        aiResult = JSON.parse(match[0])
      } else {
        aiResult = {
          confidence: 0,
          score: 0,
          recommendation: "MANUAL_REVIEW",
          summary: "AI response was invalid; please review manually.",
          analysis: {
            legitimacy: "AI returned invalid JSON",
            pricing: "AI returned invalid JSON",
            completeness: "AI returned invalid JSON",
            safety: "AI returned invalid JSON",
            deliveryPackaging: "AI returned invalid JSON",
          },
          redFlags: ["AI returned invalid JSON"],
          reason: "AI response parsing failed",
        }
      }
    }

    mess.aiReview = {
      reviewed: true,
      reviewedAt: new Date(),
      confidence: aiResult.confidence,
      score: aiResult.score,
      recommendation: aiResult.recommendation,
      summary: aiResult.summary,
      analysis: aiResult.analysis,
      redFlags: aiResult.redFlags,
      reason: aiResult.reason,
    }

    await mess.save()

    return NextResponse.json({
      message: "AI review completed - awaiting admin decision",
      result: aiResult,
      mess,
    })
  } catch (error) {
    console.error("Error in mess AI review:", error)
    return NextResponse.json(
      { error: "Failed to perform AI review", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
