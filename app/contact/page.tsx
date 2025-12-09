"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, MessageCircle, HeadphonesIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ContactChat } from "@/components/contact-chat"
import { WhatsAppChatButton } from "@/components/whatsapp-chat-button"

const TWILIO_NUMBER_DISPLAY = "+1 855 500 3465"
const TWILIO_NUMBER_TEL = "+18555003465"

export default function ContactPage() {
  const { toast } = useToast()
  const [callLoading, setCallLoading] = useState(false)

  const handleCallNow = async () => {
    const raw = window.prompt("Enter the number to connect (with country code or 10-digit):")
    if (!raw) return
    const digits = raw.replace(/\D/g, "")
    if (digits.length < 10) {
      toast({ title: "Invalid number", description: "Please enter a valid phone number.", variant: "destructive" })
      return
    }
    setCallLoading(true)
    try {
      const res = await fetch("/api/twilio/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: digits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to place call")
      toast({ title: "Calling now", description: `We’re calling ${data.toDisplay || raw} from ${TWILIO_NUMBER_DISPLAY}.` })
    } catch (e: any) {
      toast({ title: "Could not place call", description: e?.message || "Please try again.", variant: "destructive" })
    } finally {
      setCallLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container px-4 mx-auto">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">Contact Us</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Have questions or need assistance? We're here to help you find your perfect second home.
            </p>
            <div className="flex justify-center">
              <ContactChat />
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </section>

      {/* Contact Channels */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <Card className="shadow-lg border-t-4 border-t-green-600 h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative h-7 w-7">
                      <Image src="/WhatsApp.svg.webp" alt="WhatsApp" fill priority sizes="28px" />
                    </div>
                    <h2 className="text-xl font-semibold">WhatsApp Business</h2>
                    <Badge variant="secondary">Botkida</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Chat instantly on WhatsApp with our AI (powered by Botkida + Groq). We’ll detect frustration and surface quick-action buttons
                    to get you answers or route you to a human fast.
                  </p>
                  <WhatsAppChatButton propertyId="contact" propertyTitle="SecondHome Contact" label="Chat on WhatsApp" className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    Tip: say what you need in one line. The AI will propose buttons like “Schedule a visit” or “Talk to an executive”.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <Card className="shadow-lg border-t-4 border-t-primary h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <HeadphonesIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Website chat / Executive</h2>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Prefer to stay here? Use the in-site chat for AI help or connect to an executive. You can return to the mode selector or end a session anytime.
                  </p>
                  <ContactChat />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
              <Card className="shadow-lg border-t-4 border-t-orange-500 h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-orange-500" />
                    <h2 className="text-xl font-semibold">Call our AI agent</h2>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Call our Twilio-powered AI agent. It will greet callers with key info about SecondHome and answer common questions using Groq.
                  </p>
                  <div className="rounded-lg border p-3 bg-muted/40">
                    <div className="text-sm font-semibold">{TWILIO_NUMBER_DISPLAY}</div>
                    <div className="text-xs text-muted-foreground">24/7 AI receptionist</div>
                  </div>
                  <Button className="w-full" onClick={handleCallNow} disabled={callLoading}>
                    {callLoading ? "Calling..." : (
                      <>
                        <Phone className="h-4 w-4 mr-2" /> Call now
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    If you say “talk to a human”, we’ll route you to our executive workflow.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map Section removed */}{/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container px-4 mx-auto">
          <motion.div
            className="max-w-3xl mx-auto text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">Find quick answers to common questions</p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              {[
                {
                  question: "How do I book a property?",
                  answer:
                    "To book a property, browse our listings, select a property you like, and click on the 'Book Now' button. Follow the instructions to complete your booking. You'll receive a confirmation once the property owner approves your request.",
                },
                {
                  question: "What payment methods do you accept?",
                  answer:
                    "We accept various payment methods including credit/debit cards, UPI, net banking, and wallet payments. All transactions are secure and encrypted.",
                },
                {
                  question: "How can I list my property on Second Home?",
                  answer:
                    "To list your property, click on the 'List Your Property' button, fill out the property details form, upload clear images, and submit for review. Our team will verify your listing and make it live within 24-48 hours.",
                },
                {
                  question: "What if I need to cancel my booking?",
                  answer:
                    "Cancellation policies vary by property. You can find the specific cancellation policy on each property's listing page. In general, cancellations made at least 7 days before check-in are eligible for a full refund.",
                },
                {
                  question: "How do I contact a property owner?",
                  answer:
                    "You can contact property owners through our platform by clicking the 'Contact Owner' button on the property listing page. This ensures your communication is tracked and secured.",
                },
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold mb-2">{faq.question}</h3>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

