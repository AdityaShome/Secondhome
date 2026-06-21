"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { User, Home, Handshake, ChevronLeft, ChevronRight, CheckCircle, Sparkles, MapPin, IndianRupee, Bot, Calendar as CalendarIcon, X } from "lucide-react"

const INTERESTS = [
  { id: "Coding", emoji: "💻", label: "Coding" },
  { id: "Music", emoji: "🎵", label: "Music" },
  { id: "Gaming", emoji: "🎮", label: "Gaming" },
  { id: "Reading", emoji: "📚", label: "Reading" },
  { id: "Fitness", emoji: "💪", label: "Fitness" },
  { id: "Art", emoji: "🎨", label: "Art" },
  { id: "Dance", emoji: "💃", label: "Dance" },
  { id: "Sports", emoji: "⚽", label: "Sports" },
  { id: "Travel", emoji: "✈️", label: "Travel" },
  { id: "Movies", emoji: "🎬", label: "Movies" },
  { id: "Photography", emoji: "📸", label: "Photography" },
  { id: "Cooking", emoji: "👨‍🍳", label: "Cooking" },
  { id: "Yoga", emoji: "🧘", label: "Yoga" },
  { id: "Entrepreneurship", emoji: "🚀", label: "Startups" },
  { id: "Anime", emoji: "⛩️", label: "Anime" },
  { id: "Cycling", emoji: "🚴", label: "Cycling" },
]

const STEPS = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Accommodation", icon: Home },
  { id: 3, title: "Lifestyle", icon: Handshake },
  { id: 4, title: "Interests", icon: Sparkles },
]

type F = {
  name: string; age: string; gender: string; college: string; course: string
  year: string; bio: string; phone: string; accommodationType: string
  preferredLocation: string; budgetMin: string; budgetMax: string
  moveInDate: string; sleepSchedule: string; cleanlinessLevel: string
  cookingHabits: string; smokingPreference: string; drinkingPreference: string
  guestPolicy: string; workFromHome: boolean; hasPets: boolean
  petFriendly: boolean; interests: string[]
}

const init: F = {
  name: "", age: "", gender: "", college: "", course: "", year: "", bio: "", phone: "",
  accommodationType: "", preferredLocation: "", budgetMin: "", budgetMax: "",
  moveInDate: "", sleepSchedule: "", cleanlinessLevel: "3", cookingHabits: "",
  smokingPreference: "", drinkingPreference: "", guestPolicy: "",
  workFromHome: false, hasPets: false, petFriendly: false, interests: [],
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e5e7eb", background: "#ffffff", color: "#111827", fontSize: 14, outline: "none" }
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "none" as any }

function Input({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#f97316" }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function Pill({ value, current, onChange, label }: { value: string; current: string; onChange: (v: string) => void; label: string }) {
  const active = current === value
  return (
    <button type="button" onClick={() => onChange(value)}
      style={{
        padding: "10px 16px", borderRadius: 12, border: `2px solid ${active ? "#f97316" : "#e5e7eb"}`,
        background: active ? "#fff7ed" : "#ffffff", color: active ? "#ea580c" : "#6b7280",
        fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
      }}>
      {label}
    </button>
  )
}

// ─── Custom Interactive Calendar ─────────────────────────────────────────────
function InteractiveDatePicker({ value, onChange }: { value: string, onChange: (d: string) => void }) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDay }, (_, i) => i)

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const today = new Date()

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <div onClick={() => setOpen(!open)}
        style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderColor: open ? "#f97316" : "#e5e7eb" }}>
        <span style={{ color: value ? "#111827" : "#9ca3af" }}>
          {value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "Select your move-in date..."}
        </span>
        <CalendarIcon style={{ width: 18, height: 18, color: open ? "#f97316" : "#9ca3af" }} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            style={{ position: "absolute", top: "100%", left: 0, width: "100%", marginTop: 8, background: "#ffffff", border: "2px solid #e5e7eb", borderRadius: 16, padding: 16, zIndex: 50, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                style={{ padding: 6, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
                <ChevronLeft style={{ width: 16, height: 16 }} />
              </button>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</div>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                style={{ padding: 6, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center", marginBottom: 8 }}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af" }}>{d}</div>)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {blanks.map(b => <div key={`blank-${b}`} />)}
              {days.map(d => {
                const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const isSelected = value === dateStr
                const isPast = new Date(dateStr) < new Date(today.setHours(0,0,0,0))

                return (
                  <button key={d} type="button" disabled={isPast}
                    onClick={() => { onChange(dateStr); setOpen(false) }}
                    style={{
                      height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", cursor: isPast ? "not-allowed" : "pointer", border: "none",
                      background: isSelected ? "#f97316" : isPast ? "#f9fafb" : "#fff",
                      color: isSelected ? "#fff" : isPast ? "#d1d5db" : "#374151",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={e => { if(!isPast && !isSelected) e.currentTarget.style.background = "#fff7ed" }}
                    onMouseLeave={e => { if(!isPast && !isSelected) e.currentTarget.style.background = "#fff" }}>
                    {d}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SecMatchProfilePage() {
  const router = useRouter()
  const { status } = useSession()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<F>(init)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  // AI Generator state
  const [aiGenerating, setAiGenerating] = useState(false)
  const [vibe, setVibe] = useState<string>("")

  if (status === "unauthenticated") { router.push("/login"); return null }

  const set = (k: keyof F, v: any) => { setForm(p => ({ ...p, [k]: v })); setErr("") }
  const toggle = (id: string) => set("interests", form.interests.includes(id) ? form.interests.filter(i => i !== id) : [...form.interests, id])

  const ok = () => {
    if (step === 1 && (!form.name || !form.age || !form.gender || !form.college || !form.course || !form.year || !form.bio)) { setErr("Please fill in all required fields."); return false }
    if (step === 2 && (!form.accommodationType || !form.preferredLocation || !form.budgetMin || !form.budgetMax || !form.moveInDate)) { setErr("Please complete all accommodation details."); return false }
    if (step === 3 && (!form.sleepSchedule || !form.cookingHabits || !form.smokingPreference || !form.drinkingPreference || !form.guestPolicy)) { setErr("Please fill all lifestyle preferences."); return false }
    if (step === 4 && form.interests.length < 2) { setErr("Please select at least 2 interests."); return false }
    return true
  }

  const next = () => { if (ok()) setStep(s => s + 1) }
  const submit = async () => {
    if (!ok()) return
    setSaving(true); setErr("")
    try {
      const res = await fetch("/api/secmatch/profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, age: +form.age, budgetMin: +form.budgetMin, budgetMax: +form.budgetMax, cleanlinessLevel: +form.cleanlinessLevel }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error || "Something went wrong."); return }
      router.push("/secmatch/matches")
    } catch { setErr("Network error. Please try again.") }
    finally { setSaving(false) }
  }

  const pct = ((step - 1) / (STEPS.length - 1)) * 100

  // ─── AI Bio Generator Logic ────────────────────────────────────────────────
  const generateBio = async () => {
    setAiGenerating(true)
    let text = ""
    
    if (vibe === "studious") {
      text = `Hey! I'm ${form.name ? form.name.split(" ")[0] : "a student"} focused on my academics in ${form.course || "college"}. I value a peaceful, clean environment to study and relax. Looking for a respectful roommate to share a great space! 📚✨`
    } else if (vibe === "chill") {
      text = `What's up! I'm easy-going and love a chill vibe at home. Down for weekend movie nights or just hanging out. As long as we keep the common areas clean, we'll get along great! 🍕🎮`
    } else if (vibe === "creative") {
      text = `Hi! I'm a creative soul who loves art, music, and good energy. I keep my space organized and love making a house feel like a home. Looking for a roommate with good vibes! 🎨✨`
    } else if (vibe === "fitness") {
      text = `Hey! Fitness and health are my top priorities. I stick to a good routine, eat clean, and hit the gym. Very disciplined and clean roommate looking for someone with a similar healthy lifestyle! 💪🥗`
    } else {
      text = `Hi there! I'm an organized and friendly student looking for a like-minded roommate. I believe in clear communication, keeping the place tidy, and respecting each other's personal space. Let's connect! 🤝`
    }

    set("bio", "")
    for (let i = 0; i < text.length; i++) {
      await new Promise(r => setTimeout(r, 20))
      setForm(p => ({ ...p, bio: text.substring(0, i + 1) }))
    }
    setAiGenerating(false)
  }

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "40px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Back */}
        <Link href="/secmatch" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#6b7280", textDecoration: "none", marginBottom: 24 }}>
          <ChevronLeft style={{ width: 16, height: 16 }} /> Back to SecMatch
        </Link>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, background: "#f97316", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Handshake style={{ width: 20, height: 20, color: "#fff" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Create Your Profile</h1>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 32 }}>Help our algorithm find your perfect roommate match</p>

        {/* Step indicators */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          {STEPS.map(s => {
            const Icon = s.icon
            const done = step > s.id
            const active = step === s.id
            return (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${done || active ? "#f97316" : "#e5e7eb"}`, background: done ? "#f97316" : active ? "#fff7ed" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                  {done ? <CheckCircle style={{ width: 20, height: 20, color: "#fff" }} /> : <Icon style={{ width: 18, height: 18, color: active ? "#f97316" : "#d1d5db" }} />}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? "#f97316" : done ? "#fdba74" : "#d1d5db" }}>{s.title}</span>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 99, marginBottom: 32, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #f97316, #fb923c)", borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>

        {/* Card */}
        <div style={{ background: "#ffffff", borderRadius: 20, border: "1px solid #e5e7eb", padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

          {err && (
            <div style={{ background: "#fef2f2", border: "2px solid #fecaca", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
              ⚠️ {err}
            </div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "#fff7ed", padding: "6px 8px", borderRadius: 8, fontSize: 14 }}>👤</span> Personal Information
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Input label="Full Name" required>
                    <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" style={inputStyle} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                  </Input>
                </div>
                <Input label="Age" required>
                  <input type="number" value={form.age} onChange={e => set("age", e.target.value)} placeholder="Age" min="16" max="35" style={inputStyle} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                </Input>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Input label="Gender" required hint="🔒 Safety: Boys matched with boys, Girls matched with girls only">
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as any }}>
                    <Pill value="male" current={form.gender} onChange={v => set("gender", v)} label="👦 Male" />
                    <Pill value="female" current={form.gender} onChange={v => set("gender", v)} label="👧 Female" />
                    <Pill value="other" current={form.gender} onChange={v => set("gender", v)} label="🏳️‍🌈 Other" />
                  </div>
                </Input>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Input label="College / University" required>
                  <input value={form.college} onChange={e => set("college", e.target.value)} placeholder="e.g. IIT Delhi, Delhi University..." style={inputStyle} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                </Input>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <Input label="Course" required>
                  <input value={form.course} onChange={e => set("course", e.target.value)} placeholder="e.g. B.Tech CSE" style={inputStyle} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                </Input>
                <Input label="Year" required>
                  <select value={form.year} onChange={e => set("year", e.target.value)} style={selectStyle}>
                    <option value="">Select year</option>
                    {["1st Year","2nd Year","3rd Year","4th Year","5th Year","PG 1st Year","PG 2nd Year","Working Professional"].map(y => <option key={y}>{y}</option>)}
                  </select>
                </Input>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Input label="Phone (optional)" hint="Only shared securely after both roommates agree to connect.">
                  <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" style={inputStyle} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                </Input>
              </div>

              {/* AI Bio Generator Section */}
              <div style={{ marginBottom: 20, padding: 16, borderRadius: 16, background: "linear-gradient(to right, #fff7ed, #fff)", border: "2px solid #fed7aa", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.1 }}><Bot size={100} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Bot style={{ color: "#ea580c", width: 20, height: 20 }} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#9a3412" }}>AI Bio Generator</span>
                </div>
                <p style={{ fontSize: 12, color: "#c2410c", marginBottom: 12 }}>Pick your vibe and let AI write your bio instantly!</p>
                
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as any, marginBottom: 12 }}>
                  {[
                    { id: "chill", l: "🍕 Chill" }, { id: "studious", l: "📚 Studious" }, 
                    { id: "creative", l: "🎨 Creative" }, { id: "fitness", l: "💪 Fitness" }
                  ].map(v => (
                    <button key={v.id} type="button" onClick={() => setVibe(v.id)}
                      style={{ padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, border: `2px solid ${vibe === v.id ? "#f97316" : "#fdba74"}`, background: vibe === v.id ? "#f97316" : "#fff", color: vibe === v.id ? "#fff" : "#ea580c", cursor: "pointer", transition: "all 0.2s" }}>
                      {v.l}
                    </button>
                  ))}
                </div>
                
                <button type="button" onClick={generateBio} disabled={aiGenerating || !vibe}
                  style={{ width: "100%", padding: "10px", borderRadius: 12, background: aiGenerating || !vibe ? "#fdba74" : "#f97316", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: aiGenerating || !vibe ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
                  <Sparkles style={{ width: 16, height: 16, animation: aiGenerating ? "spin 2s linear infinite" : "none" }} />
                  {aiGenerating ? "Generating magic..." : "✨ Auto-Write My Bio"}
                </button>
              </div>

              <Input label="About Yourself" required>
                <textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Tell potential roommates about yourself, your habits, what you're looking for..." rows={4} maxLength={300} style={{ ...inputStyle, resize: "none" as any }} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "right", marginTop: 4 }}>{form.bio.length}/300</p>
              </Input>
            </motion.div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "#fff7ed", padding: "6px 8px", borderRadius: 8 }}>🏠</span> Accommodation Preferences
              </h2>

              <div style={{ marginBottom: 20 }}>
                <Input label="Looking for" required>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Pill value="PG" current={form.accommodationType} onChange={v => set("accommodationType", v)} label="🏠 PG" />
                    <Pill value="Flat" current={form.accommodationType} onChange={v => set("accommodationType", v)} label="🏢 Flat" />
                    <Pill value="Both" current={form.accommodationType} onChange={v => set("accommodationType", v)} label="🔄 Either" />
                  </div>
                </Input>
              </div>

              <div style={{ marginBottom: 20 }}>
                <Input label="Preferred Location / Area" required>
                  <div style={{ position: "relative" }}>
                    <MapPin style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af" }} />
                    <input value={form.preferredLocation} onChange={e => set("preferredLocation", e.target.value)} placeholder="e.g. Koramangala, Bangalore" style={{ ...inputStyle, paddingLeft: 40 }} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                  </div>
                </Input>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Monthly Budget Range <span style={{ color: "#f97316" }}>*</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Minimum (₹)</p>
                    <input type="number" value={form.budgetMin} onChange={e => set("budgetMin", e.target.value)} placeholder="3000" style={inputStyle} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Maximum (₹)</p>
                    <input type="number" value={form.budgetMax} onChange={e => set("budgetMax", e.target.value)} placeholder="15000" style={inputStyle} onFocus={e => (e.target.style.borderColor = "#f97316")} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" as any, gap: 8 }}>
                  {[{ l: "Under ₹5k", mn: "1000", mx: "5000" }, { l: "₹5k–10k", mn: "5000", mx: "10000" }, { l: "₹10k–15k", mn: "10000", mx: "15000" }, { l: "₹15k–25k", mn: "15000", mx: "25000" }, { l: "₹25k+", mn: "25000", mx: "50000" }].map(p => {
                    const active = form.budgetMin === p.mn && form.budgetMax === p.mx
                    return (
                      <button key={p.l} type="button" onClick={() => { set("budgetMin", p.mn); set("budgetMax", p.mx) }}
                        style={{ padding: "6px 14px", borderRadius: 99, border: `2px solid ${active ? "#f97316" : "#e5e7eb"}`, background: active ? "#fff7ed" : "#fff", color: active ? "#ea580c" : "#9ca3af", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {p.l}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <Input label="Expected Move-in Date" required>
                  {/* BEAUTIFUL CUSTOM CALENDAR REPLACING NATIVE INPUT */}
                  <InteractiveDatePicker value={form.moveInDate} onChange={v => set("moveInDate", v)} />
                </Input>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "#fff7ed", padding: "6px 8px", borderRadius: 8 }}>🛋️</span> Lifestyle & Habits
              </h2>

              {[
                { label: "Sleep Schedule", key: "sleepSchedule", options: [{ v: "early_bird", l: "🌅 Early Bird" }, { v: "flexible", l: "🌤 Flexible" }, { v: "night_owl", l: "🦉 Night Owl" }] },
                { label: "Cooking Habits", key: "cookingHabits", options: [{ v: "never", l: "🍕 Never cook" }, { v: "sometimes", l: "🍳 Sometimes" }, { v: "always", l: "👨‍🍳 Always cook" }] },
                { label: "Smoking Preference", key: "smokingPreference", options: [{ v: "non_smoker", l: "🚭 Non-smoker" }, { v: "smoker", l: "🚬 Smoker" }, { v: "doesnt_matter", l: "🤷 Doesn't matter" }] },
                { label: "Drinking Preference", key: "drinkingPreference", options: [{ v: "non_drinker", l: "🧃 Non-drinker" }, { v: "social_drinker", l: "🍺 Social" }, { v: "doesnt_matter", l: "🤷 Doesn't matter" }] },
                { label: "Guest Policy", key: "guestPolicy", options: [{ v: "no_guests", l: "🚫 No guests" }, { v: "occasional", l: "👋 Occasionally" }, { v: "frequent", l: "🎉 Frequently" }, { v: "doesnt_matter", l: "🤷 Doesn't matter" }] },
              ].map(({ label, key, options }) => (
                <div key={key} style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>{label} <span style={{ color: "#f97316" }}>*</span></label>
                  <div style={{ display: "flex", flexWrap: "wrap" as any, gap: 8 }}>
                    {options.map(o => <Pill key={o.v} value={o.v} current={(form as any)[key]} onChange={v => set(key as keyof F, v)} label={o.l} />)}
                  </div>
                </div>
              ))}

              {/* Cleanliness slider */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
                  Cleanliness Level — <span style={{ color: "#f97316" }}>{form.cleanlinessLevel}/5</span> <span style={{ color: "#f97316" }}>*</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Messy</span>
                  <input type="range" min="1" max="5" step="1" value={form.cleanlinessLevel} onChange={e => set("cleanlinessLevel", e.target.value)} style={{ flex: 1, accentColor: "#f97316" }} />
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Spotless</span>
                </div>
              </div>

              {/* Toggles */}
              {([
                { field: "workFromHome", label: "I work/study from home", icon: "💻" },
                { field: "hasPets", label: "I have pets", icon: "🐾" },
                { field: "petFriendly", label: "I'm okay living with pets", icon: "🐾" },
              ] as const).map(({ field, label, icon }) => (
                <button key={field} type="button" onClick={() => set(field, !(form as any)[field])}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, border: `2px solid ${(form as any)[field] ? "#f97316" : "#e5e7eb"}`, background: (form as any)[field] ? "#fff7ed" : "#fff", cursor: "pointer", marginBottom: 10, transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: (form as any)[field] ? "#ea580c" : "#6b7280" }}>{label}</span>
                  </div>
                  <div style={{ width: 44, height: 24, borderRadius: 99, background: (form as any)[field] ? "#f97316" : "#e5e7eb", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 3, left: (form as any)[field] ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", transition: "left 0.2s" }} />
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "#fff7ed", padding: "6px 8px", borderRadius: 8 }}>✨</span> Your Interests
              </h2>
              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>Select at least <strong style={{ color: "#f97316" }}>2</strong>. Our AI uses these to calculate perfect roommate compatibility!</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {INTERESTS.map(it => {
                  const sel = form.interests.includes(it.id)
                  return (
                    <button key={it.id} type="button" onClick={() => toggle(it.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, border: `2px solid ${sel ? "#f97316" : "#e5e7eb"}`, background: sel ? "#fff7ed" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: sel ? "#ea580c" : "#6b7280", transition: "all 0.15s", transform: sel ? "scale(1.03)" : "scale(1)" }}>
                      <span style={{ fontSize: 18 }}>{it.emoji}</span>
                      {it.label}
                      {sel && <CheckCircle style={{ width: 12, height: 12, color: "#f97316", marginLeft: "auto" }} />}
                    </button>
                  )
                })}
              </div>

              <div style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
                Selected: <strong style={{ color: "#f97316" }}>{form.interests.length}</strong> interests
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 24, borderTop: "1px solid #f3f4f6" }}>
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 20px", borderRadius: 12, border: "2px solid #e5e7eb", background: "#fff", color: "#6b7280", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                <ChevronLeft style={{ width: 16, height: 16 }} /> Back
              </button>
            ) : <div />}

            {step < STEPS.length ? (
              <button type="button" onClick={next}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 28px", borderRadius: 12, background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none", boxShadow: "0 4px 12px rgba(249,115,22,0.35)" }}>
                Next <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: saving ? "#fdba74" : "#f97316", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", border: "none", boxShadow: "0 4px 12px rgba(249,115,22,0.35)" }}>
                {saving ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Saving...</> : <>✨ Find Roommates!</>}
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
