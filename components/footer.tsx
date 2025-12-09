"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Home, Mail, Phone, MapPin, Instagram, Facebook, Twitter, Linkedin, Youtube, ArrowRight, Check, Loader2, Globe2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

export default function Footer() {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [language, setLanguage] = useState("English")

  // Socials from env so links always work or are hidden if not set
  const socials = useMemo(() => {
    return [
      { Icon: Instagram, label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#" },
      { Icon: Youtube, label: "YouTube", href: process.env.NEXT_PUBLIC_YOUTUBE_URL || "#" },
      { Icon: Facebook, label: "Facebook", href: process.env.NEXT_PUBLIC_FACEBOOK_URL || "#" },
      { Icon: Twitter, label: "Twitter", href: process.env.NEXT_PUBLIC_TWITTER_URL || "#" },
      { Icon: Linkedin, label: "LinkedIn", href: process.env.NEXT_PUBLIC_LINKEDIN_URL || "#" },
    ]
  }, [])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSubscribed(true)
        toast({
          title: "🎉 Successfully Subscribed!",
          description: data.message || "Check your email for confirmation",
        })
        setEmail("")
        
        // Reset after 3 seconds
        setTimeout(() => setIsSubscribed(false), 3000)
      } else {
        toast({
          title: "Subscription Failed",
          description: data.error || "Please try again later",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <footer className="bg-slate-950 text-slate-100">
      <div className="container px-4 py-16 mx-auto space-y-14">
        {/* Utility bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-orange-400" />
            <span className="font-semibold text-white">Second Home</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <Globe2 className="h-4 w-4 text-orange-300" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-slate-100 text-sm outline-none"
              >
                {["English", "हिन्दी", "मराठी", "తెలుగు"].map((lang) => (
                  <option key={lang} value={lang} className="text-slate-900">
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              {socials.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href === "#" ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (href === "#") e.preventDefault()
                  }}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-orange-300 transition-all duration-300 border border-white/10"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Top CTA bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 rounded-2xl px-6 py-5 shadow-xl border border-orange-300/40">
          <div className="space-y-1 text-center lg:text-left">
            <p className="text-sm uppercase tracking-[0.2em] text-white/80 font-semibold">We’re here 24/7</p>
            <h3 className="text-2xl font-bold leading-tight">Talk to SecondHome AI or a live executive</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-white/90 shadow-md">
              <Link href="tel:+18555003465">
                <Phone className="h-4 w-4 mr-2 text-orange-600" />
                Call our AI desk
              </Link>
            </Button>
            <Button asChild variant="secondary" className="bg-slate-900 text-white border border-white/20 hover:bg-slate-800 shadow-md">
              <Link href="/contact">
                <ArrowRight className="h-4 w-4 mr-2" />
                Contact support
              </Link>
            </Button>
          </div>
        </div>

        {/* Newsletter */}
        <div className="max-w-5xl mx-auto p-8 bg-slate-900/70 border border-white/10 rounded-2xl shadow-2xl backdrop-blur">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-200 font-semibold">Stay ahead</p>
              <h3 className="text-3xl font-bold text-white">Get early access to new listings & offers</h3>
              <p className="text-slate-300 max-w-xl">
                Weekly curation of verified PGs, flats, and hostels. No spam—just the best options near your campus.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full lg:w-[420px]">
              <Input
                type="email"
                placeholder="Work or personal email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-12 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-orange-400 focus:ring-orange-400"
                required
                disabled={isLoading || isSubscribed}
              />
              <Button
                type="submit"
                disabled={isLoading || isSubscribed}
                className="h-12 px-6 rounded-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-600 text-white gap-2 hover:from-orange-600 hover:to-orange-700 disabled:opacity-70 shadow-lg shadow-orange-500/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subscribing...
                  </>
                ) : isSubscribed ? (
                  <>
                    <Check className="h-4 w-4" />
                    Subscribed
                  </>
                ) : (
                  <>
                    Subscribe
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <Home className="h-7 w-7 text-orange-400 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xl font-bold text-white">Second Home</span>
            </Link>
            <p className="text-slate-300 leading-relaxed">
              Simplifying student accommodation across India. Find your perfect place near campus with verified options and AI-guided help.
            </p>
            <div className="flex gap-3 pt-2 flex-wrap">
              {socials.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href === "#" ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (href === "#") e.preventDefault()
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-orange-300 transition-all duration-300 hover:scale-110 border border-white/10"
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white text-lg">Explore</h3>
            <ul className="space-y-3">
              {[
                { href: "/listings", label: "PGs & Flats" },
                { href: "/messes", label: "Messes" },
                { href: "/map", label: "Map View" },
                { href: "/register-property", label: "List Property" },
                { href: "/blog", label: "Blog" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-slate-300 hover:text-orange-400 transition-all duration-300 flex items-center gap-2 group"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 text-orange-400" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white text-lg">Popular Colleges</h3>
            <ul className="space-y-3">
              {[
                "Dayananda Sagar College",
                "RV College of Engineering",
                "PES University",
                "BMS College of Engineering",
                "Christ University",
              ].map((college) => (
                <li key={college}>
                  <Link
                    href={`/colleges/${college.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-slate-300 hover:text-orange-400 transition-all duration-300 flex items-center gap-2 group"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 text-orange-400" />
                    {college}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white text-lg">Contact</h3>
            <ul className="space-y-4 text-slate-300">
              <li className="flex items-start gap-3 group cursor-pointer">
                <MapPin className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300" />
                <span className="group-hover:text-white transition-colors">
                  123 Startup Hub, Koramangala
                  <br />
                  Bangalore, India - 560034
                </span>
              </li>
              <li className="flex items-center gap-3 group cursor-pointer hover:text-orange-300 transition-colors">
                <Phone className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <a href="tel:+917384662005" className="group-hover:text-white transition-colors">
                  +91 73846 62005
                </a>
              </li>
              <li className="flex items-center gap-3 group cursor-pointer hover:text-orange-300 transition-colors">
                <Mail className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <a href="mailto:second.home2k25@gmail.com" className="group-hover:text-white transition-colors">
                  second.home2k25@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Second Home. All rights reserved.
            </p>
            <div className="flex gap-6">
              {[
                { href: "/terms", label: "Terms of Service" },
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/faq", label: "FAQ" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-slate-400 hover:text-orange-300 transition-all duration-300"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
