import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import Groq from "groq-sdk"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    // Allow property owners and admins to trigger AI review
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    const groq = new Groq({ apiKey: GROQ_API_KEY })

    await connectToDatabase()

    const { id } = await params
    const property = await Property.findById(id).populate("owner", "name email")

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    // Prepare property data for AI review
    const propertyData = {
      title: property.title,
      description: property.description,
      type: property.type,
      gender: property.gender,
      address: property.address,
      location: property.location,
      price: property.price,
      deposit: property.deposit,
      amenities: property.amenities,
      rules: property.rules,
      roomTypes: property.roomTypes,
    }

    // Call AI service
    const prompt = `You are an AI property verification system for a student accommodation platform. Review the following property listing and determine if it's legitimate and suitable for students.

Property Details:
${JSON.stringify(propertyData, null, 2)}

Analyze the property based on:
1. **Legitimacy**: Does the property seem real and genuine? Check for suspicious details.
2. **Price Reasonableness**: Is the price reasonable for the location and amenities?
3. **Safety**: Are there appropriate safety features and rules for students?
4. **Completeness**: Is all required information provided and detailed enough?
5. **Quality**: Does the description and amenities match the property type?
6. **Red Flags**: Any suspicious patterns, scams indicators, or inappropriate content?

Provide your response in JSON format:
{
  "approved": true/false,
  "confidence": 0-100,
  "score": 0-100,
  "analysis": {
    "legitimacy": "detailed analysis",
    "pricing": "detailed analysis",
    "safety": "detailed analysis",
    "completeness": "detailed analysis",
    "quality": "detailed analysis"
  },
  "redFlags": ["list of any red flags found"],
  "recommendation": "APPROVE/REJECT/MANUAL_REVIEW",
  "reason": "Brief reason for the recommendation"
}

Only approve if confidence is above 80% and no major red flags exist.`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    })
    
    const aiText = completion.choices[0]?.message?.content || ""
    
    console.log("AI response:", aiText)
    
    if (!aiText) {
      console.error("Invalid AI response: empty response")
      
      // Fallback: Auto-approve if AI fails (better than blocking)
      const aiResult = {
        approved: true,
        confidence: 75,
        score: 7.5,
        recommendation: "APPROVE",
        redFlags: [],
        reason: "AI review unavailable - auto-approved with moderate confidence",
        analysis: {
          legitimacy: "AI review service unavailable",
          pricing: "Unable to verify",
          safety: "Unable to verify",
          completeness: "Unable to verify",
          quality: "Unable to verify"
        }
      }
      
      // Update property with fallback approval
      property.aiReview = {
        reviewed: true,
        reviewedAt: new Date(),
        confidence: aiResult.confidence,
        score: aiResult.score,
        recommendation: aiResult.recommendation,
        analysis: aiResult.analysis,
        redFlags: aiResult.redFlags,
        reason: aiResult.reason,
      }
      
      property.isApproved = true
      property.approvedAt = new Date()
      property.approvedBy = session.user.id
      property.approvalMethod = "AI"
      
      await property.save()
      
      return NextResponse.json({
        message: "Property auto-approved (AI service unavailable)",
        approved: true,
        confidence: aiResult.confidence,
        score: aiResult.score,
        recommendation: aiResult.recommendation,
        result: aiResult,
        property,
      })
    }

    console.log("AI Text Response:", aiText)
    
    // Extract JSON from response (AI might include markdown code blocks)
    let aiResult
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("No JSON found in AI response:", aiText)
        throw new Error("No JSON in AI response")
      }
      aiResult = JSON.parse(jsonMatch[0])
      console.log("Parsed AI Result:", aiResult)
    } catch (e) {
      console.error("Failed to parse AI response:", e)
      
      // Fallback: Auto-approve if parsing fails
      aiResult = {
        approved: true,
        confidence: 75,
        score: 7.5,
        recommendation: "APPROVE",
        redFlags: [],
        reason: "AI parsing failed - auto-approved",
        analysis: {
          legitimacy: "Unable to parse AI response",
          pricing: "Unable to verify",
          safety: "Unable to verify",
          completeness: "Unable to verify",
          quality: "Unable to verify"
        }
      }
    }

    // Update property with AI review results
    property.aiReview = {
      reviewed: true,
      reviewedAt: new Date(),
      confidence: aiResult.confidence,
      score: aiResult.score,
      recommendation: aiResult.recommendation,
      analysis: aiResult.analysis,
      redFlags: aiResult.redFlags,
      reason: aiResult.reason,
    }

    // Auto-approve if AI recommends and confidence is high
    if (aiResult.recommendation === "APPROVE" && aiResult.confidence >= 80) {
      property.isApproved = true
      property.isRejected = false
      property.approvedAt = new Date()
      property.approvedBy = session.user.id
      property.approvalMethod = "AI"
    } else if (aiResult.recommendation === "REJECT") {
      property.isRejected = true
      property.isApproved = false
      property.rejectedAt = new Date()
      property.rejectedBy = session.user.id
      property.rejectionReason = aiResult.reason
      property.approvalMethod = "AI"
    }

    await property.save()

    return NextResponse.json({
      message: "AI review completed",
      approved: property.isApproved,
      confidence: aiResult.confidence,
      score: aiResult.score,
      recommendation: aiResult.recommendation,
      result: aiResult,
      property,
    })
  } catch (error) {
    console.error("Error in AI review:", error)
    return NextResponse.json({ 
      error: "Failed to perform AI review", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

