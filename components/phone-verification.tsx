"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Phone, Loader2, CheckCircle2, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PhoneVerificationProps {
  phone: string
  onPhoneChange: (phone: string) => void
  isEditing: boolean
  phoneVerified?: boolean
  onVerificationComplete?: () => void
}

export function PhoneVerification({
  phone,
  onPhoneChange,
  isEditing,
  phoneVerified = false,
  onVerificationComplete,
}: PhoneVerificationProps) {
  const { toast } = useToast()
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [tempPhone, setTempPhone] = useState(phone)

  const handleSendOTP = async () => {
    if (!tempPhone || tempPhone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/otp/send-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: tempPhone,
          type: "phone-verification",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP")
      }

      setOtpSent(true)
      toast({
        title: "✅ OTP Sent!",
        description: `Verification code sent to ${tempPhone}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch("/api/otp/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: tempPhone,
          otp,
          type: "phone-verification",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Verification failed")
      }

      toast({
        title: "✅ Phone Verified!",
        description: "Your phone number has been verified successfully",
      })
      
      setOtpSent(false)
      setOtp("")
      onPhoneChange(tempPhone)
      onVerificationComplete?.()
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOTP = async () => {
    setOtp("")
    await handleSendOTP()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="phone" className="flex items-center gap-2">
          Phone Number
          {phoneVerified && (
            <Badge variant="default" className="bg-green-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </Label>
        {!phoneVerified && phone && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Not Verified
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {!otpSent ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                value={tempPhone}
                onChange={(e) => {
                  setTempPhone(e.target.value)
                  if (!isEditing) onPhoneChange(e.target.value)
                }}
                placeholder="Enter your phone number (e.g., +91 9876543210)"
                disabled={!isEditing || phoneVerified}
                className="pl-10 bg-white text-gray-900"
                autoComplete="tel"
              />
            </div>
            {isEditing && !phoneVerified && tempPhone && (
              <Button
                onClick={handleSendOTP}
                disabled={isLoading}
                variant="outline"
                className="whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Shield className="w-4 h-4" />
              <span>Enter the 6-digit code sent to {tempPhone}</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
              <Button
                onClick={handleVerifyOTP}
                disabled={isVerifying || otp.length !== 6}
                className="whitespace-nowrap"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={handleResendOTP}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {isLoading ? "Sending..." : "Resend OTP"}
              </button>
              <button
                onClick={() => {
                  setOtpSent(false)
                  setOtp("")
                }}
                className="text-gray-600 hover:text-gray-700 font-medium"
              >
                Change Number
              </button>
            </div>
          </div>
        )}
      </div>

      {!phoneVerified && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Phone verification helps us keep your account secure and enables SMS notifications
        </p>
      )}
    </div>
  )
}
