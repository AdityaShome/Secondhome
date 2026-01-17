export async function POST(req: NextRequest) {
  // Twilio voice webhooks are disabled (paid provider). Keeping endpoint for compatibility.
  return NextResponse.json(
    {
      error: "Voice calling is currently disabled.",
      hint: "Use WhatsApp or web chat instead.",
    },
    { status: 410 },
  )
}

