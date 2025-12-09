import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ContactConversation } from "@/models/contact-conversation"
import Groq from "groq-sdk"

// GET /api/contact/chat/[id]?token=
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase()
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token") || ""
    const { id } = await context.params
    const convo = await ContactConversation.findById(id)
    if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (token !== convo.userToken && token !== convo.agentToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const isAgent = token === convo.agentToken
    return NextResponse.json({
      success: true,
      status: convo.status,
      isAgent,
      messages: convo.messages,
      user: { name: convo.userName, email: convo.userEmail, phone: convo.userPhone },
      agent: { name: convo.agentName, joinedAt: convo.agentJoinedAt },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

// POST /api/contact/chat/[id]  { token, content }
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase()
    const { token, content, endSession } = await req.json()
    const { id } = await context.params
    const convo = await ContactConversation.findById(id)
    if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (token !== convo.userToken && token !== convo.agentToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (endSession) {
      convo.status = "closed"
      convo.messages.push({ role: "system", content: "Session closed by user.", ts: new Date() } as any)
      await convo.save()
      return NextResponse.json({ success: true, closed: true })
    }
    if (convo.status === "closed") {
      return NextResponse.json({ error: "Conversation closed" }, { status: 409 })
    }
    const role = token === convo.agentToken ? "agent" : "user"
    convo.messages.push({ role, content: String(content || ""), ts: new Date() } as any)
    await convo.save()
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

// PATCH /api/contact/chat/[id]  { agentToken, agentName }
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase()
    const { agentToken, agentName } = await req.json()
    const { id } = await context.params
    const convo = await ContactConversation.findById(id)
    if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (agentToken !== convo.agentToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (convo.status !== "connected") {
      convo.status = "connected"
      convo.agentJoinedAt = new Date()
      if (agentName) convo.agentName = agentName
      // Summarize prior conversation for the agent
      let summary = ""
      try {
        const GROQ_API_KEY = process.env.GROQ_API_KEY
        if (GROQ_API_KEY) {
          const groq = new Groq({ apiKey: GROQ_API_KEY })
          const history = (convo.messages || [])
            .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n")
          const prompt = `Summarize the following chat between a user and an AI assistant in 6-8 bullet points focusing on intent, constraints (budget, city, college, dates), and next recommended actions for a sales executive.\n\n${history}`
          const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 220,
          })
          summary = completion.choices[0]?.message?.content || ""
        }
      } catch {}
      convo.messages.push({ role: "system", content: "Executive joined the chat.", ts: new Date() } as any)
      if (summary) {
        convo.messages.push({ role: "system", content: `AI Summary for executive:\n${summary}`, ts: new Date() } as any)
      }
      await convo.save()
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
