"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, Loader2, Home, Mail, Lock, User, ArrowRight } from "lucide-react"
import { signIn, useSession } from "next-auth/react"
import Image from "next/image"

const formSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { register } = useAuth()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState(1) // 1: Email form, 2: OTP verification
  const [otp, setOtp] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [formData, setFormData] = useState<any>(null)

  // Redirect if already logged in
  useEffect(() => {
    try {
      if (status === "authenticated" && session) {
        router.replace("/profile?tab=overview")
      }
    } catch (error) {
      console.error("Redirect error:", error)
      // If there's an error, just stay on signup page
    }
  }, [status, session, router])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setFormData(values)
    
    try {
      // Step 1: Check if email already exists
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      })

      const checkData = await checkResponse.json()

      if (checkResponse.status === 409) {
        // Email already exists
        toast({
          title: "Account Exists! 🚫",
          description: checkData.message || "This email is already registered. Please login instead.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (!checkResponse.ok) {
        throw new Error(checkData.error || "Failed to verify email")
      }

      // Step 2: Email is available, send OTP
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: values.email,
          type: "registration" 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "OTP Sent! 📧",
          description: `Verification code sent to ${values.email}`,
        })
        setStep(2) // Move to OTP verification step
      } else {
        throw new Error(data.error || "Failed to send OTP")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process signup",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyOTPAndRegister() {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      })
      return
    }

    setOtpLoading(true)
    
    try {
      const response = await fetch("/api/auth/register-with-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          otp,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success! 🎉",
          description: "Account created successfully. Please login.",
        })
        
        // Auto-login after registration
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (result?.ok) {
          router.push("/")
        } else {
          router.push("/login")
        }
      } else {
        throw new Error(data.error || "Registration failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Registration failed",
        variant: "destructive",
      })
    } finally {
      setOtpLoading(false)
    }
  }

  async function resendOTP() {
    if (!formData?.email) return
    
    setOtpLoading(true)
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: formData.email,
          type: "registration" 
        }),
      })

      if (response.ok) {
        toast({
          title: "OTP Resent! 📧",
          description: "New verification code sent to your email",
        })
        setOtp("") // Clear OTP input
      } else {
        throw new Error("Failed to resend OTP")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP",
        variant: "destructive",
      })
    } finally {
      setOtpLoading(false)
    }
  }

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  // Don't render form if already authenticated (will redirect)
  if (status === "authenticated" && session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-6 px-8">
          <Link href="/" className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Second <span className="text-orange-500">Home</span>
              </h1>
              <p className="text-sm text-gray-600">Student Accommodation Platform</p>
            </div>
          </Link>

          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-gray-900 leading-tight">
              Join Second Home Today!
            </h2>
            <p className="text-lg text-gray-600">
              Create your account and start your journey to find the perfect student accommodation.
            </p>
          </div>

          <div className="space-y-4 pt-8">
            {[
              { icon: "🎓", text: "Made for students" },
              { icon: "🏠", text: "Thousands of properties" },
              { icon: "", text: "Verified listings only" },
              { icon: "🚀", text: "Quick & easy booking" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="text-2xl">{item.icon}</div>
                <span className="text-gray-700 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <Card className="border-2 border-gray-200 shadow-xl">
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Mobile Logo */}
              <Link href="/" className="md:hidden flex items-center justify-center gap-2 mb-4">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  Second <span className="text-orange-500">Home</span>
                </span>
              </Link>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">
                  {step === 1 ? "Create Account" : "Verify Email"}
                </h2>
                <p className="text-gray-600">
                  {step === 1 
                    ? "Sign up to start finding your perfect home"
                    : `Enter the 6-digit code sent to ${formData?.email}`
                  }
                </p>
              </div>

              {/* Step 2: OTP Verification */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900">Verification Code</label>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest font-mono h-14 border-2"
                    />
                  </div>

                  <Button
                    onClick={verifyOTPAndRegister}
                    disabled={otpLoading || otp.length !== 6}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12"
                  >
                    {otpLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="text-center space-y-2">
                    <button
                      onClick={resendOTP}
                      disabled={otpLoading}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {otpLoading ? "Sending..." : "Resend OTP"}
                    </button>
                    <p className="text-xs text-gray-500">OTP valid for 10 minutes</p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(1)
                      setOtp("")
                    }}
                    className="w-full h-12"
                  >
                    Back to Registration
                  </Button>
                </div>
              )}

              {/* Step 1: Signup Form */}
              {step === 1 && <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 font-semibold">Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type="text"
                              placeholder="Enter your full name"
                              disabled={isLoading}
                              className="pl-11 h-12 border-2 border-gray-300 focus:border-orange-500 bg-white text-gray-900"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 font-semibold">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
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
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 font-semibold">Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
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
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-md"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-gray-600 pt-2">
                    By signing up, you agree to our{" "}
                    <Link href="/terms" className="text-orange-600 hover:text-orange-700 font-medium">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-orange-600 hover:text-orange-700 font-medium">
                      Privacy Policy
                    </Link>
                  </p>
                </form>
              </Form>}

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-orange-600 hover:text-orange-700 font-bold">
                    Sign in
                  </Link>
                </p>
                <p className="text-sm text-gray-600">
                  Property owner?{" "}
                  <Link href="/register-property" className="text-orange-600 hover:text-orange-700 font-bold">
                    Register here
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
