import { NextRequest, NextResponse } from "next/server"

const BOTKIDA_API_KEY = process.env.BOTKIDA_API_KEY
const BOTKIDA_API_URL = process.env.BOTKIDA_API_URL || "https://app.botkida.com/api/v1/whatsapp/send"
// WhatsApp Business AI Number from Botkida
const WHATSAPP_AI_NUMBER = process.env.WHATSAPP_AI_NUMBER || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "917384662005" // This is the AI bot number that will handle messages

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, message, propertyId } = await req.json()

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: "Phone number and message are required" },
        { status: 400 }
      )
    }

    if (!BOTKIDA_API_KEY) {
      return NextResponse.json(
        { error: "BOTKIDA_API_KEY not configured" },
        { status: 500 }
      )
    }

    // Format phone number (ensure it starts with country code)
    let formattedPhone = phoneNumber.replace(/\D/g, "") // Remove non-digits
    if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone // Add India country code
    }

    // Send message via Botkida API
    const response = await fetch(BOTKIDA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BOTKIDA_API_KEY}`,
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: message,
        propertyId: propertyId || null,
        from: WHATSAPP_AI_NUMBER, // Send from AI number
      }),
    })

    // Check response status
    const contentType = response.headers.get("content-type")
    
    if (!response.ok) {
      let errorText = ""
      try {
        errorText = await response.text()
        // Try to parse as JSON if possible
        if (contentType?.includes("application/json")) {
          const errorData = JSON.parse(errorText)
          console.error("Botkida API error:", errorData)
          throw new Error(errorData.error || errorData.message || `Failed to send WhatsApp message: ${response.status}`)
        }
      } catch (parseError) {
        // If it's HTML or other non-JSON response
        console.error("Botkida API returned non-JSON error:", errorText.substring(0, 200))
      }
      throw new Error(`Failed to send WhatsApp message: HTTP ${response.status}`)
    }

    // Parse response only if it's JSON
    let data = null
    if (contentType?.includes("application/json")) {
      try {
        data = await response.json()
      } catch (jsonError) {
        const responseText = await response.text()
        console.error("Failed to parse JSON response:", responseText.substring(0, 200))
        // If JSON parsing fails, still return success but log the issue
        data = { rawResponse: responseText.substring(0, 200) }
      }
    } else {
      // If response is not JSON (might be HTML or plain text)
      const responseText = await response.text()
      console.warn("Botkida API returned non-JSON response:", responseText.substring(0, 200))
      data = { message: "Message sent (non-JSON response received)" }
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp message sent successfully",
      data: data,
    })
  } catch (error: any) {
    console.error("WhatsApp send error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to send WhatsApp message",
        success: false,
      },
      { status: 500 }
    )
  }
}

