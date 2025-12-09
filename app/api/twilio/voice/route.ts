import { NextRequest, NextResponse } from "next/server"
import { twiml } from "twilio"
import Groq from "groq-sdk"

const GROQ_API_KEY = process.env.GROQ_API_KEY
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "+18555003465"

function buildXmlResponse(builder: (vr: twiml.VoiceResponse) => void) {
  const vr = new twiml.VoiceResponse()
  builder(vr)
  return new NextResponse(vr.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  })
}

async function getParams(req: NextRequest) {
  const contentType = req.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return (await req.json()) as Record<string, string>
  }
  const text = await req.text()
  const search = new URLSearchParams(text)
  const params: Record<string, string> = {}
  search.forEach((value, key) => {
    params[key] = value
  })
  return params
}

function resolvePublicBase(req: NextRequest) {
  const explicit =
    process.env.TWILIO_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (explicit) return explicit.replace(/\/$/, "")

  const origin = req.headers.get("origin") || req.nextUrl.origin
  if (origin && !origin.includes("localhost")) return origin.replace(/\/$/, "")

  return null
}

export async function POST(req: NextRequest) {
  try {
    const params = await getParams(req)
    const callerSpeech = params["SpeechResult"] || ""
    const digits = params["Digits"] || ""
    const from = params["From"] || "caller"

    const base = resolvePublicBase(req)
    const actionUrl = base ? `${base}/api/twilio/voice` : "/api/twilio/voice"

    // First turn: greet and gather speech
    if (!callerSpeech && !digits) {
      return buildXmlResponse((vr) => {
        const gather = vr.gather({
          input: "speech dtmf",
          action: actionUrl,
          method: "POST",
          speechTimeout: "auto",
          numDigits: 1,
        })
        gather.say(
          "Hi! I'm the SecondHome AI agent. Tell me what you need—housing help, booking a visit, or anything about our website secondhome dot com. You can also press 1 anytime to reach an executive.",
        )
        vr.say("If you prefer WhatsApp, message us on plus nine one seven three eight four six six two zero zero five.")
      })
    }

    // Handle human escalation
    if (digits === "1" || /human|executive|agent/i.test(callerSpeech || "")) {
      return buildXmlResponse((vr) => {
        vr.say(
          "Got it. I've noted your request for an executive. We will reach you soon. Meanwhile you can also chat with us on WhatsApp or visit secondhome dot com.",
        )
        vr.hangup()
      })
    }

    const prompt = `You are the SecondHome voice AI answering an incoming phone call from ${from}.

Website: https://secondhome.com
Toll-free/AI line: ${TWILIO_PHONE_NUMBER}
WhatsApp business: +91 73846 62005
Role: greet warmly, explain SecondHome is a student accommodation platform (PGs, flats, hostels), answer caller's request, and offer to text/WhatsApp or connect to an executive if they sound frustrated.

Caller said: "${callerSpeech}"

Return a concise, natural voice reply under 70 words. Mention secondhome.com once and, if relevant, suggest WhatsApp or talking to an executive.`

    let aiReply =
      "Thanks for calling SecondHome! We help students find verified PGs, flats, and hostels. What city or college should I search for? I can also text you our WhatsApp link."

    if (GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: GROQ_API_KEY })
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.5,
          max_tokens: 180,
        })
        aiReply = completion.choices[0]?.message?.content?.trim() || aiReply
      } catch (err) {
        console.error("Groq voice error", err)
      }
    }

    return buildXmlResponse((vr) => {
      const gather = vr.gather({
        input: "speech dtmf",
        action: actionUrl,
        method: "POST",
        speechTimeout: "auto",
        numDigits: 1,
      })
      gather.say(aiReply)
      gather.say("You can press 1 to talk to an executive, or ask another question.")
    })
  } catch (error: any) {
    console.error("Twilio voice webhook error", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

