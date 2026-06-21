"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Handshake, Shield, MessageCircle, Lock, Sparkles, Home, Building2,
  Crown, Target, Search, ArrowRight, CheckCircle, Star, Users,
  MapPin, Zap, RefreshCw, Loader2, UserPlus
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────
interface LiveProfile {
  id: string; name: string; age: number; gender: string; college: string
  course: string; year: string; interests: string[]; accommodationType: string
  preferredLocation: string; budget: string; bio: string
  sleepSchedule: string; cleanlinessLevel: number; cookingHabits: string
  joinedAgo: string
}
interface LiveStats { value: string; label: string }

// ─── Static UI content (not data) ─────────────────────────────────────────
const HOW_IT_WORKS = [
  { n: "01", title: "Create Your Profile",  body: "Fill in your interests, lifestyle, budget and accommodation type in our simple 4-step form.", icon: "👤" },
  { n: "02", title: "Smart Matching",       body: "Our AI algorithm scores compatibility across 8 dimensions and surfaces your top matches with a % score.", icon: "🤖" },
  { n: "03", title: "Connect",       body: "Request to connect with profiles you're interested in. When it's mutual, subscribe for ₹25 to chat and share contacts.", icon: "🤝" },
]

const WHY_US = [
  { icon: Zap,           bg: "#fff7ed", ic: "#f97316", title: "AI Matching",      body: "Scored on 8 real dimensions — interests, budget, sleep, lifestyle and more." },
  { icon: Shield,        bg: "#f0fdf4", ic: "#22c55e", title: "Gender-Safe Only",     body: "Boys matched with boys, girls with girls. No cross-gender matches, ever." },
  { icon: Handshake,     bg: "#fff1f2", ic: "#f43f5e", title: "Mutual Approval",       body: "Contact details shared only when both users approve." },
  { icon: MessageCircle, bg: "#eff6ff", ic: "#3b82f6", title: "Secure Chat",           body: "Chat first. Phone numbers only after both approve." },
]

const SLEEP_LABELS: Record<string, string> = { early_bird: "🌅 Early Bird", night_owl: "🦉 Night Owl", flexible: "🌤 Flexible" }
const COOK_LABELS:  Record<string, string> = { never: "🍕 Doesn't cook", sometimes: "🍳 Cooks sometimes", always: "👨‍🍳 Loves cooking" }
const AVATAR_COLORS = ["#f97316", "#ec4899", "#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b"]

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

// ─── Skeleton loaders ──────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div style={{ textAlign: "center", padding: "12px 24px", borderRadius: 16, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", minWidth: 120 }}>
      <div style={{ height: 32, width: 80, background: "rgba(255,255,255,0.2)", borderRadius: 8, margin: "0 auto 6px", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ height: 12, width: 100, background: "rgba(255,255,255,0.15)", borderRadius: 6, margin: "0 auto", animation: "pulse 1.5s ease-in-out infinite" }} />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div style={{ height: 112, background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ padding: 20 }}>
        <div style={{ height: 18, width: "60%", background: "#f3f4f6", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: 12, width: "40%", background: "#f3f4f6", borderRadius: 6, marginBottom: 14, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as any }}>
          {[60, 80, 50].map((w, i) => <div key={i} style={{ height: 22, width: w, background: "#f3f4f6", borderRadius: 99, animation: "pulse 1.5s ease-in-out infinite" }} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Profile Card ──────────────────────────────────────────────────────────
function ProfileCard({ profile, idx, isAuth }: { profile: LiveProfile; idx: number; isAuth: boolean }) {
  const router = useRouter()
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length]
  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ delay: idx * 0.08 }}>
      <div style={{ background: "#ffffff", borderRadius: 20, border: "1px solid #e5e7eb", overflow: "hidden", transition: "all 0.25s", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)" }}>

        {/* Coloured avatar header */}
        <div style={{ height: 112, background: `linear-gradient(135deg, ${color}25, ${color}55)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: 78, height: 78, borderRadius: "50%", background: color, border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, color: "#fff", boxShadow: "0 4px 14px rgba(0,0,0,0.12)" }}>
            {profile.name[0]}
          </div>
          <span style={{ position: "absolute", bottom: 10, right: 10, fontSize: 10, fontWeight: 600, color: "#9ca3af", background: "#fff", padding: "3px 8px", borderRadius: 99, border: "1px solid #e5e7eb" }}>
            {profile.joinedAgo}
          </span>
        </div>

        {/* Content — blur-locked for guests */}
        <div style={{ padding: "18px 20px", position: "relative" }}>
          {!isAuth && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(7px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, borderRadius: "0 0 20px 20px" }}
              onClick={() => router.push("/signup")}>
              <Lock style={{ width: 24, height: 24, color: "#f97316", marginBottom: 8 }} />
              <p style={{ fontWeight: 700, fontSize: 13, color: "#111827", margin: "0 0 3px" }}>Sign up to view full profile</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Free forever</p>
            </div>
          )}

          <p style={{ fontWeight: 800, fontSize: 17, color: "#111827", margin: "0 0 2px" }}>{profile.name}</p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>{profile.age} yrs • {profile.year} • {profile.course}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
            {[
              { icon: Home,     val: profile.college,           c: "#f97316" },
              { icon: MapPin,   val: `${profile.accommodationType} • ${profile.preferredLocation}`, c: "#ec4899" },
              { icon: Target,   val: `Budget: ${profile.budget}`, c: "#3b82f6" },
            ].map(({ icon: Icon, val, c }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#6b7280" }}>
                <Icon style={{ width: 13, height: 13, color: c, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as any }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Lifestyle chips */}
          {(profile.sleepSchedule || profile.cookingHabits) && (
            <div style={{ display: "flex", flexWrap: "wrap" as any, gap: 5, marginBottom: 10 }}>
              {profile.sleepSchedule && <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", background: "#f9fafb", border: "1px solid #e5e7eb", padding: "3px 9px", borderRadius: 99 }}>{SLEEP_LABELS[profile.sleepSchedule]}</span>}
              {profile.cookingHabits && <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", background: "#f9fafb", border: "1px solid #e5e7eb", padding: "3px 9px", borderRadius: 99 }}>{COOK_LABELS[profile.cookingHabits]}</span>}
            </div>
          )}

          {profile.bio && <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", margin: "0 0 12px", lineHeight: 1.5 }}>"{profile.bio}"</p>}

          <div style={{ display: "flex", flexWrap: "wrap" as any, gap: 5 }}>
            {profile.interests.map(t => (
              <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "#ea580c", background: "#fff7ed", border: "1px solid #fed7aa", padding: "3px 10px", borderRadius: 99 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function SecMatchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // All state is live — nothing hardcoded
  const [stats, setStats] = useState<LiveStats[]>([])
  const [profiles, setProfiles] = useState<LiveProfile[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)
  const [activeGender, setActiveGender] = useState<"male" | "female">("male")
  const [profilesError, setProfilesError] = useState(false)

  const isAuth = status === "authenticated"
  const ctaHref  = !isAuth ? "/signup" : hasProfile ? "/secmatch/matches" : "/secmatch/profile"
  const ctaLabel = !isAuth ? "Get Started — It's Free" : hasProfile ? "View My Matches" : "Create My Profile"

  // Fetch live stats
  useEffect(() => {
    setStatsLoading(true)
    fetch("/api/secmatch/stats")
      .then(r => r.json())
      .then(d => setStats(d.stats || []))
      .catch(() => setStats([]))
      .finally(() => setStatsLoading(false))
  }, [])

  // Check if user has a profile
  useEffect(() => {
    if (isAuth) {
      fetch("/api/secmatch/profile")
        .then(r => r.json())
        .then(d => setHasProfile(!!d.profile))
        .catch(() => {})
    }
  }, [isAuth])

  // Fetch live preview profiles when gender tab changes
  useEffect(() => {
    setProfilesLoading(true)
    setProfilesError(false)
    fetch(`/api/secmatch/preview?gender=${activeGender}`)
      .then(r => r.json())
      .then(d => setProfiles(d.profiles || []))
      .catch(() => { setProfilesError(true); setProfiles([]) })
      .finally(() => setProfilesLoading(false))
  }, [activeGender])

  return (
    <div style={{ background: "#ffffff", color: "#111827", minHeight: "100vh" }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[600px] flex items-center overflow-hidden"
        style={{ backgroundImage: "url(/pexels-photo-439391.jpeg)", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.88) 0%, rgba(249,115,22,0.75) 100%)" }} />

        <div className="relative container mx-auto px-4 py-24 z-10">
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto text-center">

            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-7"
              style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)", color: "#fff" }}>
              <Users className="w-4 h-4" /> Smart Roommate Matching
            </span>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 drop-shadow-xl">
              Find the Roommate<br />
              <span style={{ color: "#ffedd5" }}>You'll Actually Love</span>
            </h1>

            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed">
              Stop scrolling WhatsApp groups. Our matching engine connects you with roommates who share your{" "}
              <strong className="text-white">interests</strong>,{" "}
              <strong className="text-white">lifestyle</strong> &{" "}
              <strong className="text-white">budget</strong> — safely and instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <Link href={ctaHref}>
                <button id="secmatch-hero-cta"
                  className="inline-flex items-center gap-2 font-bold text-base px-8 py-4 rounded-xl shadow-xl transition-all hover:shadow-2xl hover:-translate-y-0.5"
                  style={{ background: "#ffffff", color: "#ea580c" }}>
                  {ctaLabel} <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>

            {/* ── Live Stats from DB ── */}
            <div className="flex flex-wrap justify-center gap-4">
              {statsLoading ? (
                [0, 1, 2].map(i => <StatSkeleton key={i} />)
              ) : stats.length > 0 ? (
                stats.map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: "12px 28px", borderRadius: 16, background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.22)" }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))
              ) : (
                // Stats are 0 (fresh platform) — show "Be among the first!"
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white/80 text-sm"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <Sparkles className="w-4 h-4" /> Be among the first students on SecMatch!
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section style={{ background: "#f9fafb" }} className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ background: "#fff7ed", color: "#ea580c" }}>How It Works</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: "#111827" }}>Three Simple Steps</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "#6b7280" }}>
              From profile creation to finding your roommate — takes less than 5 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {HOW_IT_WORKS.map((s, i) => (
              <motion.div key={s.n} initial="hidden" whileInView="show" variants={fadeUp} transition={{ delay: i * 0.12 }} viewport={{ once: true }}>
                <div className="h-full p-8 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1"
                  style={{ background: "#ffffff", borderColor: "#e5e7eb" }}>
                  <div className="text-5xl font-black mb-5 select-none" style={{ color: "#fed7aa" }}>{s.n}</div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5" style={{ background: "#fff7ed" }}>{s.icon}</div>
                  <h3 className="text-xl font-bold mb-3" style={{ color: "#111827" }}>{s.title}</h3>
                  <p className="leading-relaxed" style={{ color: "#6b7280" }}>{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY SECMATCH ════════════════════════════════════════════════════ */}
      <section style={{ background: "#ffffff" }} className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ background: "#fff7ed", color: "#ea580c" }}>Why SecMatch</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: "#111827" }}>
              Built for Students, <span style={{ color: "#f97316" }}>By Students</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {WHY_US.map((w, i) => {
              const Icon = w.icon
              return (
                <motion.div key={w.title} initial="hidden" whileInView="show" variants={fadeUp} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                  <div className="h-full p-6 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1"
                    style={{ background: "#ffffff", borderColor: "#e5e7eb" }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: w.bg }}>
                      <Icon className="w-6 h-6" style={{ color: w.ic }} />
                    </div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: "#111827" }}>{w.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{w.body}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══ LIVE PROFILES PREVIEW ═══════════════════════════════════════════ */}
      <section style={{ background: "#f9fafb" }} className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ background: "#fff7ed", color: "#ea580c" }}>Live Profiles</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-3" style={{ color: "#111827" }}>
              Real Students on SecMatch
            </h2>
            <p className="text-lg mb-8" style={{ color: "#6b7280" }}>
              These are real student profiles on our platform. Sign up to see your personalized matches.
            </p>

            {/* Gender Toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl mb-2" style={{ background: "#e5e7eb" }}>
              {(["male", "female"] as const).map(g => (
                <button key={g} onClick={() => setActiveGender(g)}
                  className="px-7 py-2.5 rounded-lg font-semibold text-sm transition-all"
                  style={activeGender === g ? { background: "#f97316", color: "#fff", boxShadow: "0 2px 8px rgba(249,115,22,0.4)" } : { background: "transparent", color: "#6b7280" }}>
                  {g === "male" ? "👦 Boys" : "👧 Girls"}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Grid */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {profilesLoading ? (
              [0, 1, 2, 3].map(i => <ProfileSkeleton key={i} />)
            ) : profilesError ? (
              <div className="col-span-2 text-center py-12">
                <p style={{ color: "#9ca3af" }}>Could not load profiles. Please try again.</p>
                <button onClick={() => setActiveGender(g => g)} className="mt-4 text-orange-500 font-semibold text-sm flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            ) : profiles.length === 0 ? (
              <div className="col-span-2 text-center py-16">
                <div style={{ fontSize: 48, marginBottom: 12 }}>🙌</div>
                <p className="text-xl font-bold mb-2" style={{ color: "#111827" }}>Be the first {activeGender === "male" ? "boy" : "girl"} on SecMatch!</p>
                <p style={{ color: "#9ca3af", marginBottom: 20 }}>No {activeGender} profiles yet — create yours and start matching.</p>
                <Link href="/secmatch/profile">
                  <button className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl text-white"
                    style={{ background: "#f97316" }}>
                    Create My Profile <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {profiles.map((p, i) => (
                  <ProfileCard key={p.id} profile={p} idx={i} isAuth={isAuth} />
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="text-center mt-10">
            <Link href={ctaHref}>
              <button id="secmatch-browse-btn"
                className="inline-flex items-center gap-2 font-bold text-base px-8 py-4 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                style={{ background: "#f97316", color: "#ffffff" }}>
                <Search className="w-5 h-5" />
                {isAuth ? "Find My Matches" : "See My AI Matches — Free"}
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ PRICING ═════════════════════════════════════════════════════════ */}
      <section style={{ background: "#ffffff" }} className="py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ background: "#fff7ed", color: "#ea580c" }}>Pricing</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-3" style={{ color: "#111827" }}>
              Simple, Student-Friendly
            </h2>
            <p className="text-lg" style={{ color: "#6b7280" }}>
              Start free. Unlock everything for ₹25/month — less than a chai.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Free */}
            <div className="p-8 rounded-2xl border" style={{ background: "#fff", borderColor: "#e5e7eb" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>Free Plan</p>
              <div className="text-5xl font-black mb-1" style={{ color: "#111827" }}>₹0</div>
              <p className="text-sm mb-8" style={{ color: "#9ca3af" }}>Forever free</p>
              <ul className="space-y-3 mb-8">
                {["Create your profile", "See matched profiles", "5 connection requests per day", "View AI compatibility scores"].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#374151" }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />{f}
                  </li>
                ))}
                {["Chat with roommates", "Get phone numbers", "Unlimited connections"].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm line-through" style={{ color: "#d1d5db" }}>
                    <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "#e5e7eb" }} />{f}
                  </li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button className="w-full py-4 rounded-xl font-bold border-2 transition-all"
                  style={{ borderColor: "#e5e7eb", color: "#374151", background: "#fff" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#f97316"; (e.currentTarget as HTMLButtonElement).style.color = "#f97316" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.color = "#374151" }}>
                  Get Started Free
                </button>
              </Link>
            </div>

            {/* Pro */}
            <div className="p-8 rounded-2xl relative overflow-hidden border-2" style={{ background: "#fff7ed", borderColor: "#f97316" }}>
              <div className="absolute top-0 right-0 flex items-center gap-1 px-4 py-2 rounded-bl-xl text-xs font-bold text-white"
                style={{ background: "#f97316" }}>
                <Crown className="w-3 h-3" /> MOST POPULAR
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#ea580c" }}>Pro Plan</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl font-black" style={{ color: "#111827" }}>₹25</span>
                <span className="text-sm" style={{ color: "#9ca3af" }}>/month</span>
              </div>
              <p className="text-sm mb-8" style={{ color: "#9ca3af" }}>Cancel any time ☕</p>
              <ul className="space-y-3 mb-8">
                {["Everything in Free", "Unlimited connections per day", "Chat with all your roommates", "Phone numbers after mutual approval", "Priority match recommendations", "See who requested to connect first"].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#374151" }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#f97316" }} />{f}
                  </li>
                ))}
              </ul>
              <Link href={isAuth ? "/secmatch/matches" : "/signup"}>
                <button id="secmatch-pro-btn"
                  className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: "#f97316", boxShadow: "0 4px 14px rgba(249,115,22,0.35)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#ea580c"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "#f97316"}>
                  <Crown className="w-4 h-4" /> Get SecMatch Pro <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ════════════════════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden"
        style={{ backgroundImage: "url(/luxury-girls-pg.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.88), rgba(249,115,22,0.78))" }} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial="hidden" whileInView="show" variants={fadeUp} viewport={{ once: true }}>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 drop-shadow-xl">
              Your Perfect Roommate is Already Here
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-lg mx-auto">
              {stats.length > 0 && stats[0]?.value !== "0+"
                ? `Join ${stats[0].value} students already on SecMatch.`
                : "Join the growing community of students finding their ideal roommates."}
            </p>
            <Link href={ctaHref}>
              <button id="secmatch-final-cta"
                className="inline-flex items-center gap-3 font-bold text-lg px-12 py-5 rounded-2xl shadow-2xl transition-all hover:-translate-y-1"
                style={{ background: "#ffffff", color: "#ea580c" }}>
                Start Matching Now <ArrowRight className="w-6 h-6" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }`}</style>
    </div>
  )
}
