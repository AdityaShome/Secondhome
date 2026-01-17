import { NextRequest, NextResponse } from "next/server"

// Twilio outbound calling is disabled (paid provider). Keeping endpoint for compatibility.

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: "Phone calling is currently disabled.",
      hint: "Use WhatsApp or web chat instead.",
    },
    { status: 410 },
  )
}

