"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Handshake, X, MessageCircle, Crown, RefreshCw, ChevronLeft,
  Home, Building2, MapPin, CheckCircle, Target, Zap, Lock,
  Star, ArrowRight, Phone, IndianRupee, Sparkles, UserPlus, BrainCircuit
} from "lucide-react"

const SLEEP: Record<string, string> = { early_bird: "🌅 Early Bird", night_owl: "🦉 Night Owl", flexible: "🌤 Flexible" }
const COOK: Record<string, string> = { never: "🍕 Never cooks", sometimes: "🍳 Sometimes", always: "👨‍🍳 Always cooks" }

function scoreBg(s: number) { return s >= 85 ? "#22c55e" : s >= 70 ? "#f59e0b" : s >= 55 ? "#f97316" : "#9ca3af" }
function scoreLabel(s: number) { return s >= 85 ? "Excellent" : s >= 70 ? "Great Match" : s >= 55 ? "Good Match" : "Possible Match" }

// ─── AI Analysis Modal ───────────────────────────────────────────────────────
function AIAnalysisModal({ match, onClose }: { match: any; onClose: () => void }) {
  const [text, setText] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    let t = `Analyzing compatibility...\n`
    if (match.sharedInterests?.length > 0) {
      t += `\n🧠 Strong synergy detected! You both share an interest in ${match.sharedInterests.join(", ")}. `
    }
    if (match.compatibilityScore >= 80) {
      t += `\n🔥 Extremely high lifestyle match! Your preferences for budget and location align perfectly. `
    }
    if (match.sleepSchedule) {
      t += `\n💤 Roommate dynamic: They are a ${SLEEP[match.sleepSchedule].split(" ")[1]} which should fit your schedule.`
    }
    t += `\n\n✨ Verdict: ${scoreLabel(match.compatibilityScore)}!`

    let i = 0
    const interval = setInterval(() => {
      setText(t.substring(0, i + 1))
      i++
      if (i >= t.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, 25)

    return () => clearInterval(interval)
  }, [match])

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
      <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: 420, background: "#ffffff", borderRadius: "24px 24px 0 0", overflow: "hidden", boxShadow: "0 -10px 40px rgba(249,115,22,0.2)" }}>
        <div style={{ padding: "24px", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: 16, height: 16, color: "#6b7280" }} />
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, background: "#fff7ed", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrainCircuit style={{ width: 22, height: 22, color: "#f97316" }} />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>AI Compatibility Analysis</h3>
          </div>

          <div style={{ background: "#f9fafb", borderRadius: 16, padding: "16px", minHeight: 120, border: "2px solid #e5e7eb", fontFamily: "monospace", fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" as any }}>
            {text}
            {!done && <span style={{ display: "inline-block", width: 8, height: 14, background: "#f97316", animation: "blink 1s step-end infinite", marginLeft: 4 }} />}
          </div>

          {done && (
            <button onClick={onClose} style={{ width: "100%", padding: "12px", borderRadius: 12, background: "#111827", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", marginTop: 16 }}>
              Got it
            </button>
          )}
        </div>
      </motion.div>
      <style>{`@keyframes blink { 50% { opacity: 0 } }`}</style>
    </div>
  )
}

// ─── Subscription Modal ─────────────────────────────────────────────────────
function SubModal({ onClose, onPay, busy }: { onClose: () => void; onPay: (m: string) => void; busy: boolean }) {
  const [step, setStep] = useState<"choose" | "upi">("choose")
  const [upi, setUpi] = useState("")
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        style={{ width: "100%", maxWidth: 420, background: "#ffffff", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", padding: "28px 24px", textAlign: "center", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: 16, height: 16, color: "#fff" }} />
          </button>
          <div style={{ width: 52, height: 52, background: "#fff", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Crown style={{ width: 26, height: 26, color: "#f97316" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>SecMatch Pro</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "0 0 10px" }}>Chat with roommates & share contacts</p>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#fff" }}>₹25<span style={{ fontSize: 15, fontWeight: 400, opacity: 0.8 }}>/month</span></div>
        </div>

        <div style={{ padding: 24 }}>
          {step === "choose" && (
            <>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                {["Unlimited connection requests", "Chat with all your roommates", "Phone numbers after mutual approval", "See who connected with you", "Priority recommendations"].map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#374151" }}>
                    <CheckCircle style={{ width: 16, height: 16, color: "#22c55e", flexShrink: 0 }} />{f}
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginBottom: 12 }}>Choose payment method</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[{ id: "upi", label: "💳 Pay via UPI", sub: "Google Pay, PhonePe, Paytm" }, { id: "demo", label: "🎁 Demo Mode", sub: "Activate instantly for testing" }].map(m => (
                  <button key={m.id} onClick={() => m.id === "demo" ? onPay("demo") : setStep("upi")}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, border: "2px solid #e5e7eb", background: "#fff", cursor: "pointer", transition: "border-color 0.15s", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#f97316")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.sub}</div>
                    </div>
                    <ArrowRight style={{ width: 16, height: 16, color: "#9ca3af" }} />
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "upi" && (
            <>
              <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 16 }}>Scan & pay ₹25, then enter your transaction ID</p>
              <div style={{ width: 140, height: 140, borderRadius: 16, border: "2px solid #e5e7eb", background: "#f9fafb", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, padding: 10, width: "100%", height: "100%" }}>
                  {Array(49).fill(0).map((_, i) => <div key={i} style={{ borderRadius: 2, background: [0,1,2,3,4,5,6,7,14,21,28,35,42,43,44,45,46,47,48,8,15,22,29,36,10,11,12,17,24,25,26,31,38,39,40].includes(i) ? "#111" : "#fff" }} />)}
                </div>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 32, height: 32, background: "#f97316", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Crown style={{ width: 16, height: 16, color: "#fff" }} />
                  </div>
                </div>
              </div>
              <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>UPI ID: <strong style={{ color: "#374151" }}>secmatch@sbi</strong></p>
              <input value={upi} onChange={e => setUpi(e.target.value)} placeholder="Enter UPI Transaction ID" style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "2px solid #e5e7eb", background: "#fff", color: "#111827", fontSize: 13, outline: "none", marginBottom: 12, boxSizing: "border-box" as any }} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
              <button onClick={() => onPay(`upi:${upi}`)} disabled={!upi || busy}
                style={{ width: "100%", padding: "14px", borderRadius: 14, background: !upi || busy ? "#fdba74" : "#f97316", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: !upi || busy ? "not-allowed" : "pointer" }}>
                {busy ? "Activating..." : "✅ I've Paid — Activate Pro"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Mutual Match Modal ──────────────────────────────────────────────────────
function MatchModal({ match, onClose, subscribed, onSub }: { match: any; onClose: () => void; subscribed: boolean; onSub: () => void }) {
  const [showPhone, setShowPhone] = useState(false)
  const [showIcebreakers, setShowIcebreakers] = useState(false)

  const icebreakers = match?.sharedInterests?.length > 0 
    ? [
        `Hey! I saw we both love ${match.sharedInterests[0]}. Want to be roommates?`,
        `Nice to connect! Are you also looking for a place in ${match.preferredLocation || "the same area"}?`,
        `Hi ${match.name}! Love that we both are into ${match.sharedInterests[0] || "similar things"}. When are you planning to move in?`
      ]
    : [
        `Hey ${match.name}! Looks like we have great compatibility. Have you found a place yet?`,
        `Hi! I'm also looking for a room in ${match.preferredLocation || "the same area"}. Want to team up?`,
        `Nice to connect! What's your budget for a flat?`
      ]

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        style={{ width: "100%", maxWidth: 380, background: "#ffffff", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)", padding: "32px 24px" }}>
          <div style={{ width: 64, height: 64, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Handshake style={{ width: 32, height: 32, color: "#fff" }} />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 6px" }}>Roommate Match!</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", margin: 0 }}>
            You and <strong style={{ color: "#fff" }}>{match?.name}</strong> both connected!
          </p>
        </div>
        <div style={{ padding: "24px" }}>
          <div style={{ width: 72, height: 72, background: "#f97316", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#fff", margin: "-60px auto 20px", border: "4px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            {match?.name?.[0]}
          </div>
          
          {subscribed ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              
              {!showIcebreakers ? (
                <button onClick={() => setShowIcebreakers(true)} style={{ padding: "13px", borderRadius: 14, background: "linear-gradient(to right, #ea580c, #f97316)", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(249,115,22,0.3)" }}>
                  <Sparkles style={{ width: 18, height: 18 }} /> Generate AI Icebreakers
                </button>
              ) : (
                <div style={{ textAlign: "left", background: "#f9fafb", borderRadius: 16, padding: 12, border: "2px solid #e5e7eb" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}><Bot style={{width: 14, height: 14}}/> AI Suggestions:</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {icebreakers.map((ib, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#374151", background: "#fff", padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb", cursor: "pointer" }}
                        onClick={() => alert("Copied to clipboard! (Feature coming soon)")}>
                        "{ib}"
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showPhone ? (
                <button onClick={() => setShowPhone(true)} style={{ padding: "13px", borderRadius: 14, background: "#fff", color: "#374151", fontWeight: 700, fontSize: 14, border: "2px solid #e5e7eb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Phone style={{ width: 16, height: 16 }} /> View Phone Number
                </button>
              ) : (
                <div style={{ padding: 14, borderRadius: 14, background: "#f0fdf4", border: "2px solid #bbf7d0" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", margin: "0 0 4px" }}>📱 Secure Contact Info</p>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{match?.phone || "+91 ***** *****"}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 4px" }}>Subscribe to chat and share contacts</p>
              <button onClick={onSub} style={{ padding: "13px", borderRadius: 14, background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Crown style={{ width: 16, height: 16 }} /> Unlock for ₹25/month
              </button>
            </div>
          )}
          <button onClick={onClose} style={{ marginTop: 14, background: "none", border: "none", fontSize: 13, color: "#9ca3af", cursor: "pointer", padding: "8px 16px" }}>Back to Discover</button>
        </div>
      </motion.div>
    </div>
  )
}
function Bot(props: any) { return <Sparkles {...props} /> } // placeholder fallback

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SecMatchMatchesPage() {
  const router = useRouter()
  const { status } = useSession()
  const [matches, setMatches] = useState<any[]>([])
  const [mutual, setMutual] = useState<any[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [showSub, setShowSub] = useState(false)
  const [paying, setPaying] = useState(false)
  const [mutualMatch, setMutualMatch] = useState<any>(null)
  const [showMatch, setShowMatch] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [acting, setActing] = useState(false)
  const [liked, setLiked] = useState(0)
  const [tab, setTab] = useState<"discover" | "mutual">("discover")

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [mr, sr] = await Promise.all([fetch("/api/secmatch/matches"), fetch("/api/secmatch/subscribe")])
      if (mr.status === 404) { router.push("/secmatch/profile"); return }
      if (mr.ok) { const d = await mr.json(); setMatches(d.matches || []); setMutual(d.mutualMatches || []) }
      if (sr.ok) { const d = await sr.json(); setSubscribed(d.isActive) }
    } catch { }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated") load()
  }, [status, load])

  const act = async (action: "like" | "pass") => {
    if (acting || idx >= matches.length) return
    const m = matches[idx]
    setActing(true)
    try {
      const r = await fetch("/api/secmatch/like", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserId: m.userId, action }) })
      const d = await r.json()
      if (action === "like") {
        setLiked(c => c + 1)
        if (d.isMutualMatch) { setMutualMatch(d.matchProfile); setShowMatch(true) }
      }
      setIdx(i => i + 1)
    } finally { setActing(false) }
  }

  const pay = async (method: string) => {
    setPaying(true)
    try {
      const r = await fetch("/api/secmatch/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentMethod: method, transactionId: `TXN_${Date.now()}` }) })
      const d = await r.json()
      if (d.success) { setSubscribed(true); setShowSub(false) }
    } finally { setPaying(false) }
  }

  const cur = matches[idx]
  const hasMore = idx < matches.length
  const FREE_LIKES = 5
  const capped = !subscribed && liked >= FREE_LIKES

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 60, height: 60, background: "#f97316", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "pulse 1.5s ease-in-out infinite" }}>
            <UserPlus style={{ width: 28, height: 28, color: "#fff" }} />
          </div>
          <p style={{ color: "#6b7280", fontWeight: 600 }}>Analyzing AI Roommate Matches…</p>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
      </div>
    )
  }

  const avatarColors = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#14b8a6", "#f59e0b"]

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", color: "#111827" }}>
      {showSub && <SubModal onClose={() => setShowSub(false)} onPay={pay} busy={paying} />}
      {showMatch && mutualMatch && <MatchModal match={mutualMatch} onClose={() => setShowMatch(false)} subscribed={subscribed} onSub={() => { setShowMatch(false); setShowSub(true) }} />}
      {showAI && cur && <AIAnalysisModal match={cur} onClose={() => setShowAI(false)} />}

      {/* Sub-header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 64, zIndex: 40, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link href="/secmatch" style={{ color: "#9ca3af", textDecoration: "none", display: "flex" }}>
                <ChevronLeft style={{ width: 20, height: 20 }} />
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, background: "#f97316", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Handshake style={{ width: 16, height: 16, color: "#fff" }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>SecMatch</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {mutual.length > 0 && (
                <button onClick={() => setTab("mutual")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 99, background: "#fff7ed", border: "2px solid #fed7aa", color: "#ea580c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  <Handshake style={{ width: 14, height: 14, color: "#f97316" }} /> {mutual.length} Connections
                </button>
              )}
              {subscribed ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 99, background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", fontWeight: 700, fontSize: 12 }}>
                  <Crown style={{ width: 13, height: 13 }} /> Pro
                </span>
              ) : (
                <button onClick={() => setShowSub(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 99, background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}>
                  <Crown style={{ width: 13, height: 13 }} /> ₹25/mo
                </button>
              )}
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #f3f4f6" }}>
            {[{ id: "discover", label: "🔍 Roommates" }, { id: "mutual", label: `🤝 Connections (${mutual.length})` }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#f97316" : "transparent"}`, color: tab === t.id ? "#f97316" : "#9ca3af", cursor: "pointer", marginBottom: -2, transition: "color 0.15s" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MUTUAL TAB ── */}
      {tab === "mutual" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 20 }}>
            {mutual.length === 0 ? "No connections yet" : `${mutual.length} Roommate Connection${mutual.length > 1 ? "s" : ""}! 🎉`}
          </h2>
          {mutual.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "64px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
              <p style={{ fontWeight: 700, fontSize: 18, color: "#111827", marginBottom: 6 }}>No roommate connections yet</p>
              <p style={{ color: "#9ca3af", marginBottom: 20 }}>Keep connecting with profiles to find your perfect match!</p>
              <button onClick={() => setTab("discover")} style={{ padding: "10px 24px", borderRadius: 12, border: "2px solid #f97316", background: "#fff7ed", color: "#ea580c", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Continue Discovering →
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {mutual.map((m: any, i: number) => (
                <div key={m._id} style={{ background: "#fff", border: "2px solid #fed7aa", borderRadius: 20, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: avatarColors[i % avatarColors.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff" }}>
                      {m.name?.[0]}
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 16, color: "#111827", margin: "0 0 2px" }}>{m.name}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{m.college}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" as any, gap: 6, marginBottom: 14 }}>
                    {m.interests?.slice(0, 4).map((t: string) => (
                      <span key={t} style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>{t}</span>
                    ))}
                  </div>
                  {subscribed ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={() => router.push("/secmatch/chat/" + m.userId)} style={{ padding: "11px", borderRadius: 12, background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                        <MessageCircle style={{ width: 15, height: 15 }} /> Message
                      </button>
                      <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af" }}>📱 {m.phone || "Phone available after approval"}</p>
                    </div>
                  ) : (
                    <button onClick={() => setShowSub(true)} style={{ width: "100%", padding: "11px", borderRadius: 12, background: "#fff7ed", border: "2px solid #fed7aa", color: "#ea580c", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                      <Lock style={{ width: 14, height: 14 }} /> Subscribe to Chat — ₹25
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DISCOVER TAB ── */}
      {tab === "discover" && (
        <div style={{ maxWidth: 500, margin: "0 auto", padding: "24px 16px" }}>

          {/* Capped warning */}
          {capped && (
            <div style={{ background: "#fffbeb", border: "2px solid #fde68a", borderRadius: 14, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Zap style={{ width: 18, height: 18, color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, color: "#92400e", margin: "0 0 4px" }}>Daily limit reached (5 free connections)</p>
                <p style={{ fontSize: 12, color: "#b45309", margin: "0 0 8px" }}>Upgrade to Pro for unlimited connections!</p>
                <button onClick={() => setShowSub(true)} style={{ padding: "6px 14px", borderRadius: 99, background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}>
                  Get Pro — ₹25/month
                </button>
              </div>
            </div>
          )}

          {/* Counter */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            <span>{Math.max(0, matches.length - idx)} profiles remaining</span>
            {!subscribed && <span>{Math.max(0, FREE_LIKES - liked)} free connections left</span>}
          </div>

          {/* Empty */}
          {!hasMore || matches.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 24, padding: "60px 32px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🏠</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
                {matches.length === 0 ? "No profiles found" : "You've seen everyone!"}
              </h3>
              <p style={{ color: "#9ca3af", marginBottom: 24 }}>
                {matches.length === 0 ? "We couldn't find matches right now. Check back soon!" : "Come back tomorrow for fresh roommate profiles."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 12, border: "2px solid #e5e7eb", background: "#fff", color: "#6b7280", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  <RefreshCw style={{ width: 15, height: 15 }} /> Refresh AI
                </button>
                {mutual.length > 0 && (
                  <button onClick={() => setTab("mutual")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: 12, background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
                    <Handshake style={{ width: 15, height: 15 }} /> View {mutual.length} Connections
                  </button>
                )}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                {/* Profile Card */}
                <div style={{ background: "#ffffff", borderRadius: 24, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", marginBottom: 24 }}>
                  {/* Coloured header */}
                  <div style={{ height: 140, background: `linear-gradient(135deg, ${avatarColors[idx % avatarColors.length]}30, ${avatarColors[idx % avatarColors.length]}70)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    <div style={{ width: 90, height: 90, borderRadius: "50%", border: "4px solid #fff", background: avatarColors[idx % avatarColors.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
                      {cur.name?.[0]}
                    </div>
                    {/* Score badge */}
                    <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 99, background: scoreBg(cur.compatibilityScore), color: "#fff", fontSize: 12, fontWeight: 700 }}>
                      <Target style={{ width: 12, height: 12 }} /> {cur.compatibilityScore}% • {scoreLabel(cur.compatibilityScore)}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "20px 22px" }}>
                    <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>{cur.name}</h2>
                        <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{cur.age} years • {cur.year} • {cur.course}</p>
                      </div>
                      
                      {/* AI Analysis Button */}
                      <button onClick={() => setShowAI(true)} style={{ background: "linear-gradient(to right, #fff7ed, #fff)", border: "2px solid #fed7aa", padding: "6px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800, color: "#ea580c", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", boxShadow: "0 2px 8px rgba(234,88,12,0.15)" }}>
                        <Sparkles style={{ width: 12, height: 12 }} /> AI Analysis
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                      {[
                        { icon: Home, val: cur.college, c: "#f97316" },
                        { icon: MapPin, val: cur.preferredLocation, c: "#ec4899" },
                        { icon: Building2, val: cur.accommodationType, c: "#3b82f6" },
                        { icon: IndianRupee, val: `₹${cur.budgetMin?.toLocaleString("en-IN")} – ₹${cur.budgetMax?.toLocaleString("en-IN")}`, c: "#22c55e" },
                      ].map(({ icon: Icon, val, c }, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#6b7280" }}>
                          <Icon style={{ width: 13, height: 13, color: c, flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as any }}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Lifestyle */}
                    <div style={{ display: "flex", flexWrap: "wrap" as any, gap: 6, marginBottom: 12 }}>
                      {cur.sleepSchedule && <span style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99 }}>{SLEEP[cur.sleepSchedule]}</span>}
                      {cur.cookingHabits && <span style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99 }}>{COOK[cur.cookingHabits]}</span>}
                      {cur.cleanlinessLevel && <span style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99 }}>🧹 Clean: {cur.cleanlinessLevel}/5</span>}
                    </div>

                    {/* Shared interests */}
                    {cur.sharedInterests?.length > 0 && (
                      <div style={{ background: "#fff7ed", border: "2px solid #fed7aa", borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: "#ea580c", margin: "0 0 8px" }}>
                          ✨ {cur.sharedInterests.length} Shared Interest{cur.sharedInterests.length > 1 ? "s" : ""}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap" as any, gap: 5 }}>
                          {cur.sharedInterests.map((s: string) => (
                            <span key={s} style={{ background: "#f97316", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All interests */}
                    <div style={{ display: "flex", flexWrap: "wrap" as any, gap: 5, marginBottom: 14 }}>
                      {cur.interests?.map((t: string) => (
                        <span key={t} style={{ background: cur.sharedInterests?.includes(t) ? "#fff7ed" : "#f9fafb", border: `1px solid ${cur.sharedInterests?.includes(t) ? "#fed7aa" : "#e5e7eb"}`, color: cur.sharedInterests?.includes(t) ? "#ea580c" : "#9ca3af", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>{t}</span>
                      ))}
                    </div>

                    {cur.bio && <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic", borderTop: "1px solid #f3f4f6", paddingTop: 14, margin: 0 }}>"{cur.bio}"</p>}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, marginBottom: 12 }}>
                  {/* Pass */}
                  <button onClick={() => act("pass")} disabled={acting}
                    style={{ width: 62, height: 62, borderRadius: "50%", background: "#fff", border: "2px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", cursor: acting ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.08)", transition: "transform 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.borderColor = "#f87171" }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "#fecaca" }}>
                    <X style={{ width: 26, height: 26, color: "#ef4444" }} />
                  </button>

                  {/* Star (pro only) */}
                  {!subscribed && (
                    <button onClick={() => setShowSub(true)}
                      style={{ width: 46, height: 46, borderRadius: "50%", background: "#fff", border: "2px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "transform 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")} onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                      <Star style={{ width: 20, height: 20, color: "#f59e0b" }} />
                    </button>
                  )}

                  {/* Like / Connect */}
                  <button onClick={() => capped ? setShowSub(true) : act("like")} disabled={acting}
                    style={{ width: 62, height: 62, borderRadius: "50%", background: "#f97316", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: acting ? "not-allowed" : "pointer", boxShadow: "0 6px 20px rgba(249,115,22,0.40)", transition: "transform 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.background = "#ea580c" }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "#f97316" }}>
                    <UserPlus style={{ width: 26, height: 26, color: "#fff", marginLeft: 4 }} />
                  </button>
                </div>

                <p style={{ textAlign: "center", fontSize: 12, color: "#d1d5db" }}>{idx + 1} of {matches.length} profiles</p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }`}</style>
    </div>
  )
}
