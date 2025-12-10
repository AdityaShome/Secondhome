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
import { useLanguage } from "@/providers/language-provider"

const TWILIO_NUMBER_DISPLAY = "+1 855 500 3465"
const TWILIO_NUMBER_TEL = "+18555003465"

export default function ContactPage() {
  const { toast } = useToast()
  const [callLoading, setCallLoading] = useState(false)
  const { t } = useLanguage()

  const handleCallNow = async () => {
    const raw = window.prompt(t("contact.prompt.callNumber"))
    if (!raw) return
    const digits = raw.replace(/\D/g, "")
    if (digits.length < 10) {
      toast({ title: t("contact.error.invalidNumber.title"), description: t("contact.error.invalidNumber.desc"), variant: "destructive" })
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
      const numberDisplay = data.toDisplay || raw
      const desc = t("contact.toast.calling.desc").replace("{{number}}", numberDisplay)
      toast({ title: t("contact.toast.calling.title"), description: desc })
    } catch (e: any) {
      toast({ title: t("contact.toast.failed.title"), description: e?.message || t("contact.toast.failed.desc"), variant: "destructive" })
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
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">{t("contact.heroTitle")}</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("contact.heroSubtitle")}
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
                    <h2 className="text-xl font-semibold">{t("contact.whatsapp.title")}</h2>
                    <Badge variant="secondary">{t("contact.whatsapp.badge")}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {t("contact.whatsapp.desc")}
                  </p>
                  <WhatsAppChatButton propertyId="contact" propertyTitle="SecondHome Contact" label={t("contact.whatsapp.button")} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    {t("contact.whatsapp.tip")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <Card className="shadow-lg border-t-4 border-t-primary h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <HeadphonesIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">{t("contact.webchat.title")}</h2>
                      </div>
                  <p className="text-muted-foreground text-sm">
                    {t("contact.webchat.desc")}
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
                    <h2 className="text-xl font-semibold">{t("contact.call.title")}</h2>
                        </div>
                  <p className="text-muted-foreground text-sm">
                    {t("contact.call.desc")}
                  </p>
                  <div className="rounded-lg border p-3 bg-muted/40">
                    <div className="text-sm font-semibold">{TWILIO_NUMBER_DISPLAY}</div>
                    <div className="text-xs text-muted-foreground">{t("contact.call.numberLabel")}</div>
                        </div>
                  <Button className="w-full" onClick={handleCallNow} disabled={callLoading}>
                    {callLoading ? t("contact.call.calling") : (
                      <>
                        <Phone className="h-4 w-4 mr-2" /> {t("contact.call.button")}
                            </>
                          )}
                        </Button>
                  <p className="text-xs text-muted-foreground">
                    {t("contact.call.note")}
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
          <h2 className="text-3xl font-bold mb-4">{t("contact.faq.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("contact.faq.subtitle")}</p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              {[
                {
                  question: t("contact.faq.q1"),
                  answer: t("contact.faq.a1"),
                },
                {
                  question: t("contact.faq.q2"),
                  answer: t("contact.faq.a2"),
                },
                {
                  question: t("contact.faq.q3"),
                  answer: t("contact.faq.a3"),
                },
                {
                  question: t("contact.faq.q4"),
                  answer: t("contact.faq.a4"),
                },
                {
                  question: t("contact.faq.q5"),
                  answer: t("contact.faq.a5"),
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

