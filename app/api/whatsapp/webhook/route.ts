import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"
const GROQ_API_KEY = process.env.GROQ_API_KEY
const BOTKIDA_API_KEY = process.env.BOTKIDA_API_KEY
const BOTKIDA_API_URL = process.env.BOTKIDA_API_URL || "https://app.botkida.com/api/v1/whatsapp/send"
// WhatsApp Business AI Number from configured provider
const WHATSAPP_AI_NUMBER = process.env.WHATSAPP_AI_NUMBER || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "917384662005"

export async function POST(req: NextRequest) {
  try {
    const webhookData = await req.json()

    if (!BOTKIDA_API_KEY) {
      return NextResponse.json({ success: false, error: "BOTKIDA_API_KEY not configured" }, { status: 500 })
    }

    // Webhook format may vary, adjust based on actual provider format
    const { from, message, type } = webhookData

    if (type !== "message" || !message || !from) {
      return NextResponse.json({ success: true, message: "Ignored" })
    }

    const userMessage = typeof message === "string" ? message : message.text || ""
    const userPhone = from.replace(/\D/g, "")

    if (!userMessage.trim()) {
      return NextResponse.json({ success: true, message: "Empty message" })
    }

    // Extract property ID from context (could be from message or stored context)
    // For now, we'll try to extract or use a default flow
    let propertyId: string | null = null
    
    // Try to extract property ID from message or use conversation context
    const propertyIdMatch = userMessage.match(/property[_-]?id[:\s]+([a-f0-9]{24})/i)
    if (propertyIdMatch) {
      propertyId = propertyIdMatch[1]
    }

    if (!propertyId) {
      // Send general response if no property context
      const response = await sendWhatsAppMessage(
        userPhone,
        "👋 Hi! I'm SecondHome AI Assistant. Please visit our website and click 'Chat with Owner' on any property to get started!"
      )
      return NextResponse.json({ success: true, response })
    }

    await connectToDatabase()

    // Check if message is about scheduling
    const isScheduleRequest =
      userMessage.toLowerCase().includes("schedule") ||
      userMessage.toLowerCase().includes("visit") ||
      userMessage.toLowerCase().includes("book a visit") ||
      userMessage.toLowerCase().includes("available")

    if (isScheduleRequest) {
      // Handle visit scheduling
      const property = await Property.findById(propertyId).lean()
      if (property) {
        // Get available slots (you can implement calendar logic here)
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dayAfter = new Date(today)
        dayAfter.setDate(dayAfter.getDate() + 2)

        const availableSlots = [
          `${tomorrow.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} 10 AM - 12 PM`,
          `${tomorrow.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} 2 PM - 4 PM`,
          `${dayAfter.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} 10 AM - 12 PM`,
          `${dayAfter.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} 2 PM - 4 PM`,
        ]

        const scheduleResponse = `📅 Available visit slots for *${property.title}*:\n\n${availableSlots
          .map((slot, idx) => `${idx + 1}. ${slot}`)
          .join("\n")}\n\nReply with the slot number (1-4) or your preferred date/time.\n\nOwner: ${property.owner?.name || "N/A"}`
        
        const response = await sendWhatsAppMessage(userPhone, scheduleResponse)
        return NextResponse.json({ success: true, response })
      }
    }

    // Handle general AI chat
    if (!GROQ_API_KEY) {
      const response = await sendWhatsAppMessage(
        userPhone,
        "I'm here to help! Please visit our website for property details."
      )
      return NextResponse.json({ success: true, response })
    }

    const property = await Property.findById(propertyId).lean()
    if (!property) {
      const response = await sendWhatsAppMessage(
        userPhone,
        "Sorry, I couldn't find that property. Please try again!"
      )
      return NextResponse.json({ success: true, response })
    }

    // Build AI context
    const propertyContext = `
PROPERTY: ${property.title}
Location: ${property.location}
Type: ${property.type}
Price: ₹${property.price}/month
Amenities: ${property.amenities?.join(", ") || "N/A"}
Rating: ${property.rating || 0}/5
Single Occupancy: ${property.roomTypes?.some((r: any) => r.type.toLowerCase().includes("single")) ? "Yes" : "Check with owner"}
Curfew: ${property.rules?.find((r: string) => r.toLowerCase().includes("curfew")) || "Not specified"}
`

    const groq = new Groq({ apiKey: GROQ_API_KEY })

    const prompt = `You are SecondHome AI Assistant on WhatsApp. Answer property questions concisely.

${propertyContext}

USER: "${userMessage}"

Provide a short, helpful WhatsApp-style response (under 150 words):`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 200,
    })

    const aiResponse = completion.choices[0]?.message?.content || "I'm here to help! What would you like to know?"

    const response = await sendWhatsAppMessage(userPhone, aiResponse)

    return NextResponse.json({
      success: true,
      response: response,
      aiResponse: aiResponse,
    })
  } catch (error: any) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      {
        error: error.message || "Webhook processing failed",
        success: false,
      },
      { status: 500 }
    )
  }
}

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(phoneNumber: string, message: string) {
  try {
    let formattedPhone = phoneNumber.replace(/\D/g, "")
    if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone
    }

    const response = await fetch(BOTKIDA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BOTKIDA_API_KEY}`,
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: message,
        from: WHATSAPP_AI_NUMBER, // Send from AI number
      }),
    })

    const contentType = response.headers.get("content-type")
    
    if (!response.ok) {
      let errorText = ""
      try {
        errorText = await response.text()
        if (contentType?.includes("application/json")) {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || errorData.message || `WhatsApp provider API error: ${response.status}`)
        }
      } catch (parseError) {
        console.error("WhatsApp provider API returned non-JSON error:", errorText.substring(0, 200))
      }
      throw new Error(`WhatsApp provider API error: HTTP ${response.status}`)
    }

    // Parse response safely
    if (contentType?.includes("application/json")) {
      try {
        return await response.json()
      } catch (jsonError) {
        const responseText = await response.text()
        console.warn("Failed to parse JSON response:", responseText.substring(0, 200))
        return { success: true, message: "Message sent" }
      }
    } else {
      // Non-JSON response - still consider it success if status is OK
      return { success: true, message: "Message sent" }
    }
  } catch (error: any) {
    console.error("Failed to send WhatsApp message:", error)
    throw error
  }
}

// GET endpoint for webhook verification (if required by provider)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // Verify webhook (adjust verification token as needed)
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

