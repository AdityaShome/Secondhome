export type SmsProviderName = "console" | "textbelt"

export interface SendSmsParams {
  to: string
  message: string
}

export interface SendSmsResult {
  provider: SmsProviderName
  id?: string
}

function getProvider(): SmsProviderName {
  if (process.env.SKIP_SMS === "true") return "console"

  const raw = (process.env.SMS_PROVIDER || "").trim().toLowerCase()
  if (raw === "textbelt") return "textbelt"
  if (raw === "console") return "console"

  // Sensible default:
  // - In production, if TEXTBELT_KEY exists, use Textbelt.
  // - Otherwise, console.
  if (process.env.NODE_ENV === "production" && (process.env.TEXTBELT_KEY || "").trim()) {
    return "textbelt"
  }

  return "console"
}

export function shouldExposeOtpToClient(): boolean {
  return process.env.NODE_ENV !== "production"
}

export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const provider = getProvider()

  if (provider === "console") {
    // Free/dev mode: no real SMS is sent.
    console.log(`\n📩 [SMS:console] to=${params.to}\n${params.message}\n`)
    return { provider }
  }

  // Textbelt hosted API: https://textbelt.com
  const key = process.env.TEXTBELT_KEY || "textbelt" // 1 free SMS/day with key=textbelt

  const res = await fetch("https://textbelt.com/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: params.to, message: params.message, key }),
  })

  const data = (await res.json()) as { success?: boolean; error?: string; textId?: string }

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to send SMS via Textbelt")
  }

  return { provider, id: data.textId }
}
