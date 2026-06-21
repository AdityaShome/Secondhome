"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ChevronLeft, Send, Loader2, Sparkles, Phone, AlertCircle } from "lucide-react"

export default function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { matchId } = use(params)
  
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/secmatch/chat?matchId=${matchId}`)
      if (res.ok) {
        const d = await res.json()
        setMessages(d.messages || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated") {
      fetchMessages()
      const interval = setInterval(fetchMessages, 3000)
      return () => clearInterval(interval)
    }
  }, [status, matchId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!text.trim() || sending) return

    const msg = text.trim()
    setText("")
    setSending(true)

    // Optimistic UI update
    const tempMsg = {
      _id: Date.now().toString(),
      fromUserId: session?.user?.id,
      toUserId: matchId,
      content: msg,
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      await fetch("/api/secmatch/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: matchId, content: msg })
      })
      // Fetch fresh messages
      fetchMessages()
    } catch (error) {
      console.error("Failed to send", error)
    } finally {
      setSending(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <Loader2 style={{ width: 32, height: 32, color: "#f97316", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f9fafb" }}>
      
      {/* HEADER */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/secmatch/matches" style={{ color: "#6b7280", display: "flex", alignItems: "center", padding: 4, borderRadius: 8, background: "#f3f4f6" }}>
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </Link>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>Roommate Chat</h2>
            <p style={{ fontSize: 12, color: "#22c55e", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}></span> Online
            </p>
          </div>
        </div>
        <button style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => alert("Phone number is available on the Matches page!")}>
          <Phone style={{ width: 16, height: 16, color: "#ea580c" }} />
        </button>
      </div>

      {/* SAFETY TIP */}
      <div style={{ padding: "12px 20px", background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <AlertCircle style={{ width: 16, height: 16, color: "#16a34a", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12, color: "#166534", margin: 0, lineHeight: 1.4 }}>
          <strong>Safety Tip:</strong> Keep conversations on SecMatch until you're comfortable. Never share passwords or send money before verifying the property.
        </p>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, background: "#fff7ed", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Sparkles style={{ width: 32, height: 32, color: "#f97316" }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Say Hello!</h3>
            <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 280 }}>You both requested to connect. Use the AI Icebreakers from the matches page or just introduce yourself!</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.fromUserId === session?.user?.id
            return (
              <div key={m._id || i} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                <div style={{
                  padding: "12px 16px",
                  borderRadius: isMe ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  background: isMe ? "#f97316" : "#ffffff",
                  color: isMe ? "#ffffff" : "#111827",
                  border: isMe ? "none" : "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  wordBreak: "break-word"
                }}>
                  {m.content}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 6, textAlign: isMe ? "right" : "left", padding: "0 4px" }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div style={{ background: "#ffffff", padding: "16px 20px", borderTop: "1px solid #e5e7eb" }}>
        <form onSubmit={send} style={{ display: "flex", gap: 10 }}>
          <input 
            value={text} 
            onChange={e => setText(e.target.value)} 
            placeholder="Type a message..." 
            style={{ flex: 1, padding: "14px 18px", borderRadius: 99, border: "1px solid #e5e7eb", background: "#f9fafb", outline: "none", fontSize: 14 }}
            onFocus={e => (e.target.style.borderColor = "#f97316")} 
            onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
          />
          <button 
            type="submit" 
            disabled={!text.trim() || sending}
            style={{ width: 48, height: 48, borderRadius: "50%", background: !text.trim() || sending ? "#fdba74" : "#f97316", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: !text.trim() || sending ? "not-allowed" : "pointer", transition: "background 0.2s" }}
          >
            <Send style={{ width: 20, height: 20, marginLeft: -2 }} />
          </button>
        </form>
      </div>
    </div>
  )
}
