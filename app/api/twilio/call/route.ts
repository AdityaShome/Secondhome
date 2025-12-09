import { NextRequest, NextResponse } from "next/server"
import Twilio from "twilio"

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

function formatNumber(raw: string) {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return null
  // If 10 digits, assume India default 91; otherwise trust with +
  if (digits.length === 10) return `+91${digits}`
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`
  if (digits.startsWith("+")) return digits
  return `+${digits}`
}

function resolvePublicBase(req: NextRequest) {
  // Prefer explicit public base; must be https for Twilio
  const explicit =
    process.env.TWILIO_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (explicit) return explicit

  // Fallback to origin header, but reject localhost for Twilio
  const origin = req.headers.get("origin")
  if (origin && !origin.includes("localhost")) return origin

  return null
}

export async function POST(req: NextRequest) {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return NextResponse.json({ error: "Twilio not configured" }, { status: 500 })
    }

    const { to } = await req.json()
    if (!to) {
      return NextResponse.json({ error: "Destination number is required" }, { status: 400 })
    }
    const toNumber = formatNumber(String(to))
    if (!toNumber) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
    }

    // Build absolute URL for the voice webhook
    const base = resolvePublicBase(req)
    if (!base || base.includes("localhost")) {
      return NextResponse.json(
        { error: "Public base URL not configured. Set TWILIO_PUBLIC_BASE_URL (https) so Twilio can reach /api/twilio/voice." },
        { status: 400 },
      )
    }

    const voiceUrl = `${base.replace(/\/$/, "")}/api/twilio/voice`

    const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    await client.calls.create({
      to: toNumber,
      from: TWILIO_PHONE_NUMBER,
      url: voiceUrl,
    })

    return NextResponse.json({ success: true, to: toNumber, toDisplay: toNumber })
  } catch (error: any) {
    console.error("Twilio outbound call error", error)
    return NextResponse.json({ error: error?.message || "Failed to place call" }, { status: 500 })
  }
}

