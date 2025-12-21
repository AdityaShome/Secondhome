"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Mail, Lock, ArrowLeft, Eye, EyeOff, Shield } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
})

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type Step = "email" | "otp" | "password"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>("email")
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userType, setUserType] = useState<"owner" | "student">("student")
  
  // Check if this is for property owners
  useEffect(() => {
    const type = searchParams.get("type")
    if (type === "owner") {
      setUserType("owner")
    }
  }, [searchParams])

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  })

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  })

  const sendOTP = async (emailValue: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailValue,
          type: "password-reset",
          userType: userType, // Pass user type to API
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 500 && data.error?.includes("not configured")) {
          toast({
            title: "Email Service Unavailable",
            description: "Please contact support or try again later.",
            variant: "destructive",
          })
        } else if (response.status === 404) {
          toast({
            title: "Email Not Found",
            description: "No account found with this email address.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Failed to send OTP",
            description: data.error || "Please check your email and try again.",
            variant: "destructive",
          })
        }
        return false
      }

      setEmail(emailValue.toLowerCase().trim())
      setStep("otp")
      toast({
        title: "OTP Sent Successfully!",
        description: `Check your email (${emailValue}) for the 6-digit verification code. Valid for 10 minutes.`,
      })
      return true
    } catch (error: any) {
      console.error("OTP send error:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to email service. Please check your internet connection and try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const verifyOTP = async (otpValue: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: otpValue,
          type: "password-reset",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Invalid OTP",
          description: data.error || "Please check the OTP and try again.",
          variant: "destructive",
        })
        return false
      }

      setStep("password")
      toast({
        title: "OTP Verified!",
        description: "Please enter your new password.",
      })
      return true
    } catch (error: any) {
      console.error("OTP verify error:", error)
      toast({
        title: "Error",
        description: "Failed to verify OTP. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (passwordData: z.infer<typeof passwordSchema>) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to reset password. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Password Reset Successful!",
        description: "Your password has been updated. You can now login with your new password.",
      })

      // Redirect to appropriate login page after 2 seconds
      setTimeout(() => {
        if (userType === "owner") {
          router.push("/register-property")
        } else {
          router.push("/login")
        }
      }, 2000)
    } catch (error: any) {
      console.error("Password reset error:", error)
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSubmit = async (values: z.infer<typeof emailSchema>) => {
    await sendOTP(values.email)
  }

  const handleOTPSubmit = async (values: z.infer<typeof otpSchema>) => {
    await verifyOTP(values.otp)
  }

  const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    await resetPassword(values)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 border-gray-200 shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <Link
                href={userType === "owner" ? "/register-property" : "/login"}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {userType === "owner" ? "Reset Property Owner Password" : "Reset Password"}
              </CardTitle>
              <div className="w-5" /> {/* Spacer for centering */}
            </div>
            <CardDescription className="text-gray-600">
              {step === "email" && userType === "owner" && "Enter your property owner email to receive a verification code"}
              {step === "email" && userType === "student" && "Enter your email to receive a verification code"}
              {step === "otp" && "Enter the 6-digit code sent to your email"}
              {step === "password" && "Enter your new password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Email Input */}
            {step === "email" && (
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 font-semibold">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter your email"
                              disabled={isLoading}
                              className="pl-11 h-12 border-2 border-gray-300 focus:border-orange-500 bg-white text-gray-900"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {/* Step 2: OTP Verification */}
            {step === "otp" && (
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(handleOTPSubmit)} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600">
                      OTP sent to <span className="font-semibold">{email}</span>
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setStep("email")
                        otpForm.reset()
                      }}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      Change email
                    </Button>
                  </div>

                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 font-semibold">Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="Enter 6-digit code"
                            disabled={isLoading}
                            maxLength={6}
                            className="h-12 border-2 border-gray-300 focus:border-orange-500 bg-white text-gray-900 text-center text-2xl tracking-widest font-mono"
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                              field.onChange(value)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Code"
                    )}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={async () => {
                        await sendOTP(email)
                      }}
                      disabled={isLoading}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      Resend OTP
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 3: New Password */}
            {step === "password" && (
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 font-semibold">New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter new password"
                              disabled={isLoading}
                              className="pl-11 pr-11 h-12 border-2 border-gray-300 focus:border-orange-500 bg-white text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 font-semibold">Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm new password"
                              disabled={isLoading}
                              className="pl-11 pr-11 h-12 border-2 border-gray-300 focus:border-orange-500 bg-white text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        Reset Password
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center">
              <Link
                href={userType === "owner" ? "/register-property" : "/login"}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Back to {userType === "owner" ? "Property Owner Login" : "Login"}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

