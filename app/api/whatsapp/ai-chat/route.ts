import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"

const GROQ_API_KEY = process.env.GROQ_API_KEY
const frustrationKeywords = ["angry", "frustrated", "upset", "annoyed", "bad", "useless", "complaint", "cancel", "hate", "issue"]
const defaultButtons = [
  { label: "Talk to an executive", text: "Please connect me to an executive now" },
  { label: "Schedule a visit", text: "Schedule a property visit" },
  { label: "Share pricing", text: "Tell me the exact price and any deposits" },
]

function withFrustrationSafety(message: string, suggestions: Array<{ label: string; text: string }>) {
  const frustrated = frustrationKeywords.some((k) => message.toLowerCase().includes(k))
  if (frustrated) {
    const merged = suggestions.length ? suggestions : defaultButtons
    return merged.slice(0, 5)
  }
  return suggestions
}

export async function POST(req: NextRequest) {
  try {
    const { message, propertyId, conversationHistory = [] } = await req.json()

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      )
    }

    await connectToDatabase()

    // Handle general contact (no specific property)
    if (!propertyId || propertyId === "contact") {
      const systemPrompt = `You are SecondHome AI Assistant helping students via WhatsApp.

SECONDHOME INFORMATION:
- Email: second.home2k25@gmail.com
- Phone: +91 73846 62005
- Platform: Student accommodation platform (PGs, Flats, Hostels)
- Location: India-wide

STRICT INSTRUCTIONS:
1. Answer ONLY with information relevant to SecondHome and student accommodation. If unsure, ask a clarifying question.
2. Keep responses concise, WhatsApp style.
3. Prefer asking for missing details (city, college, budget, room type).
4. If the user sounds frustrated or asks for help, include buttons that escalate (executive, callback) or resolve quickly.
5. Respond in JSON with the exact shape:
{
  "message": string,              // the reply to show the user
  "suggestions": [                // 0-5 quick reply buttons
    { "label": string, "text": string }
  ]
}

CONVERSATION_HISTORY:
${(conversationHistory || []).map((m: any) => `${m.role}: ${m.content}`).join("\n")}

USER_MESSAGE: ${message}`

      const groq = new Groq({ apiKey: GROQ_API_KEY })
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: systemPrompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 300,
      })

      const raw = completion.choices[0]?.message?.content || ""
      let msg = "I'm here to help! How can I assist you with SecondHome?"
      let suggestions: Array<{ label: string; text: string }> = []
      try {
        const parsed = JSON.parse(raw)
        msg = parsed.message || msg
        suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : []
      } catch {
        msg = raw || msg
      }
      suggestions = withFrustrationSafety(message, suggestions)

      return NextResponse.json({ success: true, response: msg, suggestions, propertyId: null })
    }

    // Fetch property details for context
    const property = (await Property.findById(propertyId)
      .populate("owner", "name phone email")
      .lean()) as any

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      )
    }

    // Build property context for AI
    const propertyContext = `
PROPERTY DETAILS:
- Title: ${property.title}
- Location: ${property.location}
- Type: ${property.type}
- Gender: ${property.gender}
- Price: ₹${property.price}/month
- Deposit: ₹${property.deposit}
- Amenities: ${property.amenities?.join(", ") || "N/A"}
- Rating: ${property.rating || 0}/5 (${property.reviews || 0} reviews)
- Single Occupancy: ${property.roomTypes?.some((r: any) => r.type.toLowerCase().includes("single")) ? "Available" : "Not specified"}
- Curfew: ${property.rules?.find((r: string) => r.toLowerCase().includes("curfew") || r.toLowerCase().includes("timing")) || "Not specified"}
- Nearby Colleges: ${property.nearbyColleges?.map((c: any) => c.name).join(", ") || "N/A"}
- Owner: ${property.owner?.name || "N/A"}
- Verified: ${property.verificationStatus === "verified" ? "Yes ✅" : "No"}

COMMON QUESTIONS TO ANSWER:
- Single occupancy: Check roomTypes
- Curfew: Check rules for timing/curfew mentions
- WiFi: Check amenities
- Food: Check if mess nearby or food options
- Distance to college: Check nearbyColleges
- Pricing: Use price and deposit fields
- Availability: Check roomTypes availability
- Gender specific: Use gender field

If user wants to schedule a visit, respond with: "I can help you schedule a visit! Please reply with your preferred date and time, or type 'schedule' for available slots."
`

    // Initialize AI provider
    const groq = new Groq({ apiKey: GROQ_API_KEY })

    // Build conversation history
    const historyContext = conversationHistory
      .map((msg: any) => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
      .join("\n")

    const systemPrompt = `You are SecondHome AI Assistant helping students with property inquiries via WhatsApp.

${propertyContext}

STRICT INSTRUCTIONS:
1. Answer about THIS SPECIFIC PROPERTY ONLY using the data above.
2. Be concise (WhatsApp style). If info missing, ask 1 clarifying question.
3. If user wants a visit, guide them to suggest date/time.
4. Respond in JSON exactly as:
{
  "message": string,
  "suggestions": [ { "label": string, "text": string } ]
}

${historyContext ? `CONVERSATION_HISTORY:\n${historyContext}\n` : ""}

USER_MESSAGE: ${message}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: systemPrompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 350,
    })

    const raw = completion.choices[0]?.message?.content || ""
    let msg = "I'm here to help! What would you like to know about this property?"
    let suggestions: Array<{ label: string; text: string }> = []
    try {
      const parsed = JSON.parse(raw)
      msg = parsed.message || msg
      suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : []
    } catch {
      msg = raw || msg
    }
    suggestions = withFrustrationSafety(message, suggestions)

    return NextResponse.json({ success: true, response: msg, suggestions, propertyId })
  } catch (error: any) {
    console.error("WhatsApp AI chat error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to process AI chat",
        success: false,
      },
      { status: 500 }
    )
  }
}

