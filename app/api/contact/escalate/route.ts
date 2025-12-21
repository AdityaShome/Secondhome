import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { connectToDatabase } from "@/lib/mongodb"
import crypto from "node:crypto"
import { ContactConversation } from "@/models/contact-conversation"

function genToken() {
  return crypto.randomBytes(16).toString("hex")
}

export async function POST(req: NextRequest) {
  try {
    const { name = "", email = "", phone = "", transcript = [] } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    await connectToDatabase()

    const userToken = genToken()
    const agentToken = genToken()

    // Normalize transcript
    const normalized = Array.isArray(transcript)
      ? transcript.map((m: any) => ({
          role: m.role === "ai" ? "system" : m.role === "system" ? "system" : "user",
          content: String(m.content || ""),
          ts: m.ts ? new Date(m.ts) : new Date(),
        }))
      : []

    const convo = await ContactConversation.create({
      userName: name,
      userEmail: email,
      userPhone: phone,
      status: "pending",
      messages: normalized,
      userToken,
      agentToken,
    })

    // Build base URL for join link
    const originHeader = req.headers.get("origin")
    const fallbackBase = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    const baseUrl = originHeader || fallbackBase
    const joinUrl = `${baseUrl}/contact/agent?c=${convo._id.toString()}&t=${agentToken}`

    // Email config
    const emailUser = process.env.EMAIL_USER || process.env.HOST_EMAIL
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.HOST_EMAIL_PASSWORD

    if (!emailUser || !emailPassword) {
      console.error("SMTP not configured for escalation emails")
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: emailUser, pass: emailPassword.replace(/\s/g, "") },
    })

    const transcriptHTML = normalized.length
      ? normalized
          .map((m: any) => {
            const role = (m.role || "user").toUpperCase()
            const ts = m.ts ? new Date(m.ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : ""
            return `<div style="margin:8px 0;"><strong>${role}</strong> <span style=\"color:#999; font-size:12px;\">${ts}</span><br/>${String(m.content || "").replace(/</g, "&lt;")}</div>`
          })
          .join("")
      : "<em>No prior messages</em>"

    const html = `
      <!doctype html>
      <html>
        <body style="font-family:Arial, sans-serif; background:#f7f7f7; padding:20px;">
          <div style="max-width:640px; margin:0 auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.05)">
            <div style="background:linear-gradient(135deg,#FF6B35 0%, #F7931E 100%); color:#fff; padding:20px 24px;">
              <h2 style="margin:0;">🧑‍💼 New Live Contact Request</h2>
              <div style="opacity:0.9; font-size:13px;">SecondHome Contact Center</div>
            </div>
            <div style="padding:24px;">
              <p><strong>Name:</strong> ${name || "Unknown"}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
              <hr style="border:none; border-top:1px solid #eee; margin:16px 0;" />
              <h3 style="margin:8px 0 12px;">Conversation so far</h3>
              ${transcriptHTML}
              <hr style="border:none; border-top:1px solid #eee; margin:16px 0;" />
              <div style="text-align:center; margin-top:16px;">
                <a href="${joinUrl}" style="display:inline-block; padding:12px 24px; border-radius:999px; background:#FF6B35; color:#fff; text-decoration:none; font-weight:600">Join Chat as Executive</a>
              </div>
              <p style="font-size:12px;color:#666; text-align:center; margin-top:10px;">This link is unique and grants access to this user's conversation.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) {
      console.error("ADMIN_EMAIL not configured")
      return NextResponse.json({ error: "Admin email not configured" }, { status: 500 })
    }

    await transporter.sendMail({
      from: `SecondHome Contact <${emailUser}>`,
      to: adminEmail,
      subject: `🚨 Live support request from ${name || email}`,
      html,
      replyTo: email,
    })

    return NextResponse.json({ success: true, conversationId: convo._id.toString(), userToken })
  } catch (e: any) {
    console.error("Escalation error:", e)
    return NextResponse.json({ error: e?.message || "Failed to escalate" }, { status: 500 })
  }
}
