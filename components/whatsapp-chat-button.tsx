"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, Calendar } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"

interface WhatsAppChatButtonProps {
  propertyId: string
  propertyTitle: string
  ownerPhone?: string
  ownerName?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  label?: string
  className?: string
}

export function WhatsAppChatButton({
  propertyId,
  propertyTitle,
  ownerPhone,
  ownerName,
  variant = "default",
  size = "default",
  label = "Chat on WhatsApp",
  className = "",
}: WhatsAppChatButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleWhatsAppChat = async () => {
    // General contact uses official WhatsApp Business link if provided
    const isGeneralContact = propertyId === "contact" || !ownerPhone
    const botkidaUrl = process.env.NEXT_PUBLIC_BOTKIDA_WHATSAPP_URL
    const defaultBusinessUrl = "https://wa.me/917384662005" // Safe default to SecondHome business number
    const businessNumberFromEnv = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER // e.g., 91XXXXXXXXXX
    const aiNumber = businessNumberFromEnv || "917384662005"
    
    if (!ownerPhone && !isGeneralContact) {
      toast({
        title: "Phone not available",
        description: "Owner phone number is not available",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // 1) If general contact and preferred URL is configured, open it directly
      if (isGeneralContact) {
        // Prefer configured URL if provided, else fall back to default wa.me link
        window.open(botkidaUrl || defaultBusinessUrl, "_blank")
        toast({
          title: "WhatsApp opened! 💬",
          description: "You're now chatting with SecondHome on WhatsApp.",
        })
        return
      }

      // 2) Otherwise, create wa.me link to business/owner number
      let phone = (isGeneralContact ? aiNumber : (ownerPhone || "")).replace(/\D/g, "")
      if (phone && !phone.startsWith("91") && phone.length === 10) {
        phone = "91" + phone
      }
      if (!phone) {
        throw new Error("No phone number available for WhatsApp chat")
      }

      const whatsappMessage = isGeneralContact
        ? `👋 Hi! I need help with SecondHome. Can you assist me?`
        : `Hi! I'm interested in your property "${propertyTitle}" on SecondHome.`
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`

      window.open(whatsappUrl, "_blank")
      toast({
        title: "WhatsApp opened! 💬",
        description: isGeneralContact
          ? "You're now chatting with SecondHome on WhatsApp."
          : "Chat with the owner on WhatsApp.",
      })
    } catch (error: any) {
      console.error("WhatsApp error:", error)
      // As a last resort, try opening the configured URL if present
      if (botkidaUrl || defaultBusinessUrl) {
        window.open(botkidaUrl || defaultBusinessUrl, "_blank")
        toast({ title: "Opening WhatsApp", description: "Redirecting to SecondHome WhatsApp Business." })
      } else {
        toast({
          title: "Could not open WhatsApp",
          description: "No WhatsApp link or number configured.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleWhatsAppChat}
      disabled={loading}
      className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      {loading ? "Opening..." : label}
    </Button>
  )
}

interface WhatsAppScheduleButtonProps {
  propertyId: string
  propertyTitle: string
  ownerPhone?: string
  ownerName?: string
}

export function WhatsAppScheduleButton({
  propertyId,
  propertyTitle,
  ownerPhone,
  ownerName,
}: WhatsAppScheduleButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleScheduleVisit = async () => {
    const businessNumberFromEnv = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    const aiNumber = businessNumberFromEnv || "917384662005"
    
    if (!ownerPhone && propertyId !== "contact") {
      toast({
        title: "Phone not available",
        description: "Owner phone number is not available",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Use owner phone for property visits, AI number for general contact
      const useAINumber = propertyId === "contact" || !ownerPhone
      let phone = useAINumber ? aiNumber : ownerPhone.replace(/\D/g, "")
      if (!phone.startsWith("91") && phone.length === 10) {
        phone = "91" + phone
      }

      // Message for scheduling visit
      const scheduleMessage = useAINumber
        ? `📅 Hi! I'd like to schedule a visit for a property on SecondHome. Can you help me?`
        : `📅 Hi ${ownerName || "there"}! I'd like to schedule a visit for "${propertyTitle}" on SecondHome. What are your available time slots?`

      // Send via API
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          message: scheduleMessage,
          propertyId: propertyId,
        }),
      })

      // If a preferred URL exists and this is general contact, prefer that
      const botkidaUrl = process.env.NEXT_PUBLIC_BOTKIDA_WHATSAPP_URL
      if (useAINumber && botkidaUrl) {
        window.open(botkidaUrl, "_blank")
      } else {
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(scheduleMessage)}`
        window.open(whatsappUrl, "_blank")
      }

      toast({
        title: "Scheduling visit! 📅",
        description: "Our AI will help you find the best time slot with the owner",
      })
    } catch (error) {
      console.error("Schedule error:", error)
      
      // Fallback
      if (ownerPhone) {
        let phone = ownerPhone.replace(/\D/g, "")
        if (!phone.startsWith("91") && phone.length === 10) {
          phone = "91" + phone
        }
        const scheduleMessage = `📅 Hi! I'd like to schedule a visit for "${propertyTitle}". What are your available time slots?`
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(scheduleMessage)}`
        window.open(whatsappUrl, "_blank")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleScheduleVisit}
      disabled={loading || !ownerPhone}
      className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50"
    >
      <Calendar className="mr-2 h-5 w-5" />
      {loading ? "Opening..." : "Schedule Visit via WhatsApp"}
    </Button>
  )
}

