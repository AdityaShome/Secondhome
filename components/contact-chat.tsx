"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Send, BotMessageSquare, HeadphonesIcon } from "lucide-react"

interface MessageItem {
  role: "user" | "ai" | "system"
  content: string
  ts: number
}

interface QuickSuggestion {
  label: string
  text: string
}

export function ContactChat() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"idle" | "ai" | "escalating" | "connected">("idle")
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [agentJoined, setAgentJoined] = useState(false)
  const [sessionClosed, setSessionClosed] = useState(false)
  const [suggestions, setSuggestions] = useState<QuickSuggestion[]>([])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const { toast } = useToast()
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  // Poll conversation if created
  useEffect(() => {
    if (!conversationId || !userToken || !open) return
    let stop = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/contact/chat/${conversationId}?token=${userToken}`)
        const data = await res.json()
        if (res.ok && data.success) {
          // Map server messages to UI shape
          const serverMsgs: MessageItem[] = (data.messages || []).map((m: any) => ({
            role: m.role === "agent" ? "system" : (m.role as "user" | "system"),
            content: String(m.content || ""),
            ts: new Date(m.ts).getTime(),
          }))
          setMessages(serverMsgs)
          setAgentJoined(data.status === "connected")
          if (data.status === "connected") setMode("connected")
          if (data.status === "closed") {
            setSessionClosed(true)
            setMode("idle")
          }
        }
      } catch (e) {
        // ignore transient errors
      }
    }
    const id = setInterval(() => { if (!stop) poll() }, 2000)
    poll()
    return () => { stop = true; clearInterval(id) }
  }, [conversationId, userToken, open])

  const disabledSend = useMemo(() => loading || !input.trim(), [loading, input])

  const resetConversationState = () => {
    setConversationId(null)
    setUserToken(null)
    setMessages([])
    setSuggestions([])
    setAgentJoined(false)
    setSessionClosed(false)
    setMode("idle")
    setInput("")
  }

  const sendAI = async (text: string) => {
    setLoading(true)
    try {
      const payload = { message: text, propertyId: "contact", conversationHistory: messages }
      const res = await fetch("/api/whatsapp/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "AI error")

      const aiResponse = data.response || ""
      const quickButtons: QuickSuggestion[] = Array.isArray(data.suggestions)
        ? data.suggestions.slice(0, 6)
        : []

      setMessages((prev) => [
        ...prev,
        { role: "user", content: text, ts: Date.now() },
        { role: "ai", content: aiResponse, ts: Date.now() },
      ])
      setSuggestions(quickButtons)
    } catch (e: any) {
      toast({ title: "AI unavailable", description: e.message || "Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const escalateToExecutive = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Enter your email", description: "We need your email so our executive can reach you.", variant: "destructive" })
      return
    }
    setMode("escalating")
    setLoading(true)
    try {
      const res = await fetch("/api/contact/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, transcript: messages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to notify executive")

      setMessages((prev) => [
        ...prev,
        { role: "system", content: "Connecting you to an executive... We'll notify you shortly.", ts: Date.now() },
      ])

      // Store conversation credentials and start polling
      if (data.conversationId && data.userToken) {
        setConversationId(data.conversationId)
        setUserToken(data.userToken)
      }
      toast({ title: "Request sent", description: "An executive has been notified and will join soon." })
    } catch (e: any) {
      toast({ title: "Could not connect", description: e.message || "Please try again.", variant: "destructive" })
      setMode("ai")
    } finally {
      setLoading(false)
    }
  }

  const handleEndSession = async () => {
    if (!conversationId || !userToken) {
      resetConversationState()
      return
    }
    setLoading(true)
    try {
      await fetch(`/api/contact/chat/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: userToken, endSession: true }),
      })
      setMessages((prev) => [...prev, { role: "system", content: "Session ended. We hope we helped!", ts: Date.now() }])
      setSessionClosed(true)
      resetConversationState()
      toast({ title: "Session closed", description: "You can start a new chat anytime." })
    } catch (e: any) {
      toast({ title: "Could not end session", description: e?.message || "Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const onSend = async () => {
    const text = input.trim()
    if (!text) return
    setInput("")

    // If conversation exists, send to live chat backend
    if (conversationId && userToken) {
      // Optimistic update
      setMessages((prev) => [...prev, { role: "user", content: text, ts: Date.now() }])
      try {
        await fetch(`/api/contact/chat/${conversationId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: userToken, content: text }),
        })
      } catch (e) {
        // ignore
      }
      return
    }

    // Before escalation, use AI quick help
    if (mode === "ai" || mode === "idle") {
      setSuggestions([])
      await sendAI(text)
      return
    }
  }

  const headerTitle = mode === "ai" ? "SecondHome Assistant" : mode === "escalating" ? "Connecting you..." : mode === "connected" ? (agentJoined ? "Executive Chat" : "Connecting you...") : "How can we help?"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-12 px-6 rounded-full shadow-md">Contact Support</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between gap-3 text-lg w-full">
            <div className="flex items-center gap-2">
              {mode !== "idle" && (
                <Button variant="ghost" size="sm" onClick={resetConversationState} className="px-2">
                  Back
                </Button>
              )}
              <BotMessageSquare className="h-5 w-5 text-primary" /> {headerTitle}
            </div>
            {conversationId && (
              <Button variant="outline" size="sm" onClick={handleEndSession}>
                End session
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === "idle" && (
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4">
              <div className="font-semibold mb-1 flex items-center gap-2"><BotMessageSquare className="h-4 w-4" /> Quick help (AI)</div>
              <p className="text-sm text-muted-foreground mb-3">Ask anything. Great for simple, instant answers.</p>
              <Button onClick={() => setMode("ai")} variant="outline" className="w-full">Start AI Chat</Button>
            </div>
            <div className="rounded-xl border p-4">
              <div className="font-semibold mb-1 flex items-center gap-2"><HeadphonesIcon className="h-4 w-4" /> Connect with executive</div>
              <p className="text-sm text-muted-foreground mb-3">Best for complex queries or bookings. We’ll notify our team.</p>
              <div className="grid grid-cols-1 gap-2 mb-2">
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input placeholder="Your phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button onClick={escalateToExecutive} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeadphonesIcon className="h-4 w-4 mr-2" />} Connect now
              </Button>
            </div>
          </div>
        )}

        {(mode === "ai" || mode === "escalating" || mode === "connected") && (
          <div className="flex flex-col h-[520px]">
            <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-muted/30">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground">Start by asking a question, or switch to "Connect with executive" for priority assistance.</div>
              )}
              {sessionClosed && (
                <div className="text-xs text-muted-foreground">Session closed. Start a new chat anytime.</div>
              )}
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow ${m.role === "user" ? "bg-primary text-primary-foreground" : m.role === "system" ? "bg-amber-100" : "bg-white"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {mode === "escalating" && (
                <div className="text-xs text-muted-foreground">Connecting to an executive… please wait.</div>
              )}
            </div>
            {suggestions.length > 0 && !conversationId && (
              <div className="border-t px-4 py-2 bg-white">
                <div className="text-xs text-muted-foreground mb-1">Quick actions</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, idx) => (
                    <Button
                      key={idx}
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setInput(s.text)
                        // Immediately send to AI for speed
                        sendAI(s.text)
                      }}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t p-3 flex items-center gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message"
                className="min-h-[44px] max-h-[120px] resize-y"
              />
              <Button onClick={onSend} disabled={disabledSend} className="h-10">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
