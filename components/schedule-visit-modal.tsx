"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Calendar, Clock, User, Phone, Mail } from "lucide-react"
import { motion } from "framer-motion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"

interface ScheduleVisitModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  propertyName: string
}

export function ScheduleVisitModal({ isOpen, onClose, propertyId, propertyName }: ScheduleVisitModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name)
      if (user.email) setEmail(user.email)
      if (user.phone) setPhone(user.phone)
    }
  }, [user])

  const handleSchedule = async () => {
    // Validate required fields
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      })
      return
    }

    if (!phone.trim()) {
      toast({
        title: "Phone required",
        description: "Please enter your phone number",
        variant: "destructive",
      })
      return
    }

    // Validate phone format
    const phoneRegex = /^[6-9]\d{9}$/
    const cleanPhone = phone.replace(/\D/g, "")
    if (cleanPhone.length !== 10 || !phoneRegex.test(cleanPhone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit Indian phone number",
        variant: "destructive",
      })
      return
    }

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    if (!date || !time) {
      toast({
        title: "Date and time required",
        description: "Please select both date and time for your visit",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Format the WhatsApp message
      const formattedDate = format(date, "EEEE, MMMM dd, yyyy")
      const visitMessage = `🏠 *Property Visit Request - SecondHome*

*Property Details:*
📍 Property: ${propertyName}
🆔 Property ID: ${propertyId}

*Visitor Information:*
👤 Name: ${name}
📱 Phone: ${phone}
📧 Email: ${email}

*Visit Schedule:*
📅 Date: ${formattedDate}
⏰ Time: ${time}

${notes ? `*Additional Notes:*\n${notes}\n` : ""}
---
This is an automated message from SecondHome platform.
Please confirm the visit schedule with the visitor.`

      // Send to business number 7384662005 (917384662005 in international format)
      const businessNumber = "917384662005"
      
      // Try to send via WhatsApp API first
      try {
        const response = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: businessNumber,
            message: visitMessage,
            propertyId: propertyId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.warn("WhatsApp API failed, using direct link:", errorData)
          // Fall through to direct WhatsApp link
        } else {
          const result = await response.json()
          if (result.success) {
            // API succeeded, continue
          } else {
            throw new Error(result.error || "API returned failure")
          }
        }
      } catch (apiError) {
        console.warn("WhatsApp API error, using direct link:", apiError)
        // Fall through to direct WhatsApp link
      }

      // Always open WhatsApp with the message (fallback or primary method)
      const whatsappUrl = `https://wa.me/${businessNumber}?text=${encodeURIComponent(visitMessage)}`
      window.open(whatsappUrl, "_blank")

      // Also save to database
      try {
        await fetch("/api/schedule-visit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            propertyId,
            name,
            phone,
            email,
            date: format(date, "yyyy-MM-dd"),
            time,
            notes,
          }),
        })
      } catch (dbError) {
        console.error("Failed to save to database:", dbError)
        // Don't fail the whole process if DB save fails
      }

      setIsSuccess(true)

      toast({
        title: "Visit request sent! ✅",
        description: "Your visit request has been sent to our team. We'll contact you shortly to confirm.",
      })

      // Reset form and close modal after 3 seconds
      setTimeout(() => {
        setName("")
        setPhone("")
        setEmail("")
        setDate(undefined)
        setTime("")
        setNotes("")
        setIsSuccess(false)
        onClose()
      }, 3000)
    } catch (error) {
      console.error("Schedule visit error:", error)
      toast({
        title: "Failed to send visit request",
        description: error instanceof Error ? error.message : "There was an error sending your visit request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule a Visit</DialogTitle>
          <DialogDescription>Choose a date and time to visit {propertyName}</DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="py-8 text-center"
          >
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Visit Scheduled!</h3>
            <p className="text-muted-foreground mb-6">
              A property representative will contact you shortly to confirm your visit.
            </p>
            <div className="animate-pulse">
              <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin" />
            </div>
          </motion.div>
        ) : (
          <>
            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Your Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-10"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Enter your 10-digit mobile number</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  Preferred Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left font-normal"
                      type="button"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span className="text-muted-foreground">Select a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={5}>
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={(selectedDate) => {
                        setDate(selectedDate)
                      }}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date < today
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">
                  Preferred Time <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <select
                    id="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer hover:bg-accent"
                    required
                  >
                    <option value="">Select a time</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any specific requirements, questions, or special requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleSchedule} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Send via WhatsApp
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
