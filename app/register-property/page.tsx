"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import {
  Building2,
  Mail,
  Lock,
  Phone,
  User,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react"
import { motion } from "framer-motion"

// SVG for Google Icon
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  emailOtp: z.string().optional(),
  phoneOtp: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type SignInFormData = z.infer<typeof signInSchema>
type SignUpFormData = z.infer<typeof signUpSchema>

export default function RegisterPropertyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status, update } = useSession()
  const [isSignIn, setIsSignIn] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [stats, setStats] = useState([
    { value: "0", label: "Property Owners", description: "Trusted partners across India" },
    { value: "0", label: "Student Bookings", description: "Annual bookings on our platform" },
  ])

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      emailOtp: "",
      phoneOtp: "",
    },
  })

  // Autofill user data from session if logged in (only on Create Account tab)
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user && !isSignIn) {
        try {
          const response = await fetch("/api/user/profile")
          if (response.ok) {
            const data = await response.json()
            const userData = data.user || data
            
            // Only autofill if the form is empty (first time switching to sign up)
            const currentName = signUpForm.getValues("name")
            const currentEmail = signUpForm.getValues("email")
            
            if (!currentName && !currentEmail) {
              // Autofill form with existing user data
              signUpForm.setValue("name", userData.name || "")
              signUpForm.setValue("email", userData.email || "")
              signUpForm.setValue("phone", userData.phone || "")
              
              toast({
                title: "Welcome back!",
                description: "We've pre-filled your information. Please verify to upgrade to property owner.",
              })
            }
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error)
        }
      }
    }
    
    // Only run when switching to sign up tab while logged in
    if (!isSignIn && session?.user) {
      fetchUserData()
    }
  }, [isSignIn, session?.user])

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: "Sign in failed",
          description: "Invalid email or password",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Wait for session to update
      await update()
      
      // Add delay to ensure session is refreshed with current role
      await new Promise(resolve => setTimeout(resolve, 800))

      // Fetch user data to check role
      try {
        const userResponse = await fetch("/api/user/profile")
        if (userResponse.ok) {
          const responseData = await userResponse.json()
          const userData = responseData.user || responseData
          const userRole = userData.role || "user"

          if (userRole === "owner" || userRole === "admin") {
            toast({
              title: "Welcome back!",
              description: "Redirecting to property listing...",
            })
            setTimeout(() => {
              router.push("/list-property")
            }, 1000)
          } else {
            toast({
              title: "Owner Registration Required",
              description: "This account is not registered as a property owner. Please register as an owner to list properties.",
              variant: "destructive",
            })
            setIsSignIn(false) // Switch to sign up tab
            setIsLoading(false)
            return
          }
        } else {
          // If we can't fetch user data, redirect anyway and let list-property page handle it
          toast({
            title: "Welcome back!",
            description: "Redirecting...",
          })
          setTimeout(() => {
            router.push("/list-property")
          }, 1000)
        }
      } catch (error) {
        // Fallback: redirect and let list-property page handle verification
        toast({
          title: "Welcome back!",
          description: "Redirecting...",
        })
        setTimeout(() => {
          router.push("/list-property")
        }, 1000)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendEmailOTP = async (email: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          type: "registration",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show specific error messages
        if (response.status === 500 && data.error?.includes("not configured")) {
          toast({
            title: "Email Service Unavailable",
            description: "Please contact support or try again later. Error: Email service not configured.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Failed to send Email OTP",
            description: data.error || data.details || "Please check your email and try again.",
            variant: "destructive",
          })
        }
        setIsLoading(false)
        return
      }

      setEmailOtpSent(true)
      toast({
        title: "✅ Email OTP Sent!",
        description: `Check your email (${email}) for the 6-digit verification code. Valid for 10 minutes.`,
      })
    } catch (error: any) {
      console.error("Email OTP send error:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to email service. Please check your internet connection and try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // COMMENTED OUT - Phone OTP for now
  // const sendPhoneOTP = async (phone: string) => {
  //   setIsLoading(true)
  //   try {
  //     const response = await fetch("/api/otp/send-phone", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         phone,
  //         type: "registration",
  //       }),
  //     })

  //     const data = await response.json()

  //     if (!response.ok) {
  //       if (response.status === 500 && data.error?.includes("not configured")) {
  //         toast({
  //           title: "SMS Service Unavailable",
  //           description: "Please contact support or try again later. Error: SMS service not configured.",
  //           variant: "destructive",
  //         })
  //       } else {
  //         toast({
  //           title: "Failed to send Phone OTP",
  //           description: data.error || "Please check your phone number and try again.",
  //           variant: "destructive",
  //         })
  //       }
  //       setIsLoading(false)
  //       return
  //     }

  //     setPhoneOtpSent(true)
  //     toast({
  //       title: "✅ Phone OTP Sent!",
  //       description: `Check your phone (${phone}) for the 6-digit verification code. Valid for 10 minutes.`,
  //     })
  //   } catch (error: any) {
  //     console.error("Phone OTP send error:", error)
  //     toast({
  //       title: "Connection Error",
  //       description: "Failed to connect to SMS service. Please check your internet connection and try again.",
  //       variant: "destructive",
  //     })
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  const handleSignUp = async (data: SignUpFormData) => {
    // Step 1: Send Email OTP
    if (!emailOtpSent) {
      console.log("Sending Email OTP to:", data.email)
      await sendEmailOTP(data.email)
      return
    }

    // Step 2: Verify Email OTP and Register (Phone verification commented out)
    if (emailOtpSent && !emailVerified) {
      if (!data.emailOtp || data.emailOtp.length !== 6) {
        toast({
          title: "Invalid Email OTP",
          description: "Please enter the 6-digit OTP sent to your email.",
          variant: "destructive",
        })
        return
      }

      setIsLoading(true)
      try {
        // Verify Email OTP
        const verifyEmailResponse = await fetch("/api/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            otp: data.emailOtp,
            type: "registration",
          }),
        })

        if (!verifyEmailResponse.ok) {
          const error = await verifyEmailResponse.json()
          throw new Error(error.error || "Invalid or expired Email OTP")
        }

        setEmailVerified(true)
        toast({
          title: "✅ Email Verified!",
          description: "Creating your account...",
        })

        // COMMENTED OUT - Phone OTP verification
        // await sendPhoneOTP(data.phone)
        // Register user as property owner (directly after email verification)
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
            phone: data.phone,
            isPropertyOwner: true,
          }),
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || "Registration failed")
        }

        // Auto sign in after registration or re-authenticate to refresh session
        const signInResult = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        })

        if (signInResult?.error) {
          throw new Error("Auto sign-in failed. Please try logging in manually.")
        }

        // Refresh the session to get updated role and wait for it to complete
        await update()
        
        // Add a longer delay to ensure session is fully refreshed with new role
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Show appropriate success message
        if (result.upgraded) {
          toast({
            title: "🎉 Account Upgraded!",
            description: "You are now a property owner! Redirecting to list your property...",
          })
        } else if (result.created) {
          toast({
            title: "✅ Registration successful!",
            description: "Welcome to Second Home! Redirecting to property listing...",
          })
        }

        setTimeout(() => {
          router.push("/list-property")
        }, 1500)
      } catch (error: any) {
        toast({
          title: "Registration Failed",
          description: error.message || "An error occurred. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
      return
    }

    // COMMENTED OUT - Phone verification step
    // if (emailVerified && phoneOtpSent && !phoneVerified) {
    //   if (!data.phoneOtp || data.phoneOtp.length !== 6) {
    //     toast({
    //       title: "Invalid Phone OTP",
    //       description: "Please enter the 6-digit OTP sent to your phone.",
    //       variant: "destructive",
    //     })
    //     return
    //   }
    //   setIsLoading(true)
    //   try {
    //     const verifyPhoneResponse = await fetch("/api/otp/verify-phone", {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({
    //         phone: data.phone,
    //         otp: data.phoneOtp,
    //         type: "registration",
    //       }),
    //     })
    //     if (!verifyPhoneResponse.ok) {
    //       const error = await verifyPhoneResponse.json()
    //       throw new Error(error.error || "Invalid or expired Phone OTP")
    //     }
    //     setPhoneVerified(true)
    //   } catch (error: any) {
    //     toast({
    //       title: "Phone Verification Failed",
    //       description: error.message || "An error occurred. Please try again.",
    //       variant: "destructive",
    //     })
    //   } finally {
    //     setIsLoading(false)
    //   }
    //   return
    // }
  }
async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    try {
      await signIn("google", {
        callbackUrl: "/list-property",
      })
    } catch (error) {
      console.error("Google sign-in error:", error)
      toast({
        title: "Sign in failed",
        description: "Failed to sign in with Google.",
        variant: "destructive",
      })
      setIsGoogleLoading(false)
    }
  }

  
  // Fetch real statistics from database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats")
        if (response.ok) {
          const data = await response.json()
          setStats([
            { value: data.propertyOwnersFormatted, label: "Property Owners", description: "Trusted partners across India" },
            { value: data.studentBookingsFormatted, label: "Student Bookings", description: "Annual bookings on our platform" },
          ])
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background Image */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'url(/secondhome_property.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/70 to-slate-900/80" />
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Section - Hero Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-white"
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                List your Property for free & grow your business
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100">
                Partner with Second Home
              </p>
              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <Building2 className="w-6 h-6" />
                  <span className="text-lg font-semibold">Second Home</span>
                </div>
              </div>
              <p className="text-lg text-gray-300 mb-8">
                Join a community of 1,00,000+ listings
              </p>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mt-12">
                {stats.map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20"
                  >
                    <div className="text-3xl font-bold text-orange-400 mb-1">{stat.value}</div>
                    <div className="text-sm font-semibold text-white mb-1">{stat.label}</div>
                    <div className="text-xs text-gray-300">{stat.description}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Section - Sign In/Sign Up Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-md mx-auto"
            >
              <Card className="bg-slate-800/95 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                <CardContent className="p-8">
                  {/* Toggle Buttons */}
                  <div className="flex gap-2 mb-6 border-b border-slate-700">
                    <button
                      onClick={() => {
                        setIsSignIn(true)
                        setEmailOtpSent(false)
                        setPhoneOtpSent(false)
                        setEmailVerified(false)
                        setPhoneVerified(false)
                      }}
                      className={`flex-1 py-3 text-sm font-semibold transition-all ${
                        isSignIn
                          ? "text-orange-400 border-b-2 border-orange-400"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        setIsSignIn(false)
                        setEmailOtpSent(false)
                        setPhoneOtpSent(false)
                        setEmailVerified(false)
                        setPhoneVerified(false)
                        signUpForm.reset()
                      }}
                      className={`flex-1 py-3 text-sm font-semibold transition-all ${
                        !isSignIn
                          ? "text-orange-400 border-b-2 border-orange-400"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {isSignIn ? (
                    // Sign In Form
                    <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-5">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Sign in to manage your property</h2>
                        <p className="text-sm text-gray-400">Welcome back! Please enter your details.</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Username/Email address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...signInForm.register("email")}
                              type="email"
                              placeholder="Enter your email"
                              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-orange-400"
                            />
                          </div>
                          {signInForm.formState.errors.email && (
                            <p className="text-red-400 text-xs mt-1">
                              {signInForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...signInForm.register("password")}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-orange-400"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {signInForm.formState.errors.password && (
                            <p className="text-red-400 text-xs mt-1">
                              {signInForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-400">
                          <input type="checkbox" className="rounded border-slate-600" />
                          Remember me
                        </label>
                        <button 
                          type="button" 
                          onClick={() => router.push("/forgot-password?type=owner")}
                          className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          Forgot your password?
                        </button>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 h-auto"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign in"
                        )}
                      </Button>

                      {/* Divider */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-slate-800 text-gray-400 font-medium">Or continue with</span>
                        </div>
                      </div>

                      {/* Google Sign-In Button */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading || isLoading}
                        className="w-full border-2 border-slate-600 hover:bg-slate-700 text-white font-semibold py-3 h-auto bg-slate-700/50"
                      >
                        {isGoogleLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Signing in with Google...
                          </>
                        ) : (
                          <>
                            <GoogleIcon />
                            <span className="ml-2">Sign in with Google</span>
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    // Sign Up Form
                    <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-5">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Create your property owner account</h2>
                        <p className="text-sm text-gray-400">Join Second Home and start listing your properties today.</p>
                        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                          <p className="text-xs text-orange-300">
                            <strong>Already have an account?</strong> Use your existing email to upgrade to property owner!
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...signUpForm.register("name")}
                              placeholder="Enter your full name"
                              disabled={emailOtpSent}
                              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-orange-400 disabled:opacity-60"
                            />
                          </div>
                          {signUpForm.formState.errors.name && (
                            <p className="text-red-400 text-xs mt-1">
                              {signUpForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email address {emailVerified && <span className="text-green-400 text-xs ml-2">✓ Verified</span>}
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...signUpForm.register("email")}
                              type="email"
                              placeholder="Enter your email"
                              disabled={emailOtpSent}
                              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-orange-400 disabled:opacity-60"
                            />
                          </div>
                          {signUpForm.formState.errors.email && (
                            <p className="text-red-400 text-xs mt-1">
                              {signUpForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Phone Number {phoneVerified && <span className="text-green-400 text-xs ml-2">✓ Verified</span>}
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...signUpForm.register("phone")}
                              type="tel"
                              placeholder="Enter your phone number (e.g., +91 9876543210)"
                              disabled={phoneOtpSent}
                              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-orange-400 disabled:opacity-60"
                            />
                          </div>
                          <p className="text-xs text-orange-300 mt-1 font-medium">
                            Required: You must verify both email and phone number during registration
                          </p>
                          {signUpForm.formState.errors.phone && (
                            <p className="text-red-400 text-xs mt-1">
                              {signUpForm.formState.errors.phone.message}
                            </p>
                          )}
                        </div>

                        {/* Email OTP Verification */}
                        {emailOtpSent && !emailVerified && (
                          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-3">
                            <div className="flex items-center gap-2">
                              <Mail className="w-5 h-5 text-blue-400" />
                              <h3 className="text-sm font-semibold text-blue-300">Step 1: Verify Email</h3>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Enter Email OTP</label>
                              <div className="relative">
                                <Input
                                  {...signUpForm.register("emailOtp")}
                                  type="text"
                                  maxLength={6}
                                  placeholder="Enter 6-digit email OTP"
                                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-blue-400 text-center text-2xl tracking-widest"
                                />
                              </div>
                              {signUpForm.formState.errors.emailOtp && (
                                <p className="text-red-400 text-xs mt-1">
                                  {signUpForm.formState.errors.emailOtp.message}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const email = signUpForm.getValues("email")
                                  sendEmailOTP(email)
                                }}
                                className="text-sm text-blue-400 hover:text-blue-300 mt-2"
                              >
                                Resend Email OTP
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Email Verified Badge */}
                        {emailVerified && (
                          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <span className="text-sm text-green-300 font-medium">Email Verified Successfully!</span>
                          </div>
                        )}

                        {/* Phone OTP Verification - COMMENTED OUT */}
                        {/* {phoneOtpSent && !phoneVerified && (
                          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-3">
                            <div className="flex items-center gap-2">
                              <Phone className="w-5 h-5 text-purple-400" />
                              <h3 className="text-sm font-semibold text-purple-300">Step 2: Verify Phone</h3>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Enter Phone OTP</label>
                              <div className="relative">
                                <Input
                                  {...signUpForm.register("phoneOtp")}
                                  type="text"
                                  maxLength={6}
                                  placeholder="Enter 6-digit phone OTP"
                                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-purple-400 text-center text-2xl tracking-widest"
                                />
                              </div>
                              {signUpForm.formState.errors.phoneOtp && (
                                <p className="text-red-400 text-xs mt-1">
                                  {signUpForm.formState.errors.phoneOtp.message}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const phone = signUpForm.getValues("phone")
                                  sendPhoneOTP(phone)
                                }}
                                className="text-sm text-purple-400 hover:text-purple-300 mt-2"
                              >
                                Resend Phone OTP
                              </button>
                            </div>
                          </div>
                        )} */}

                        {/* Phone Verified Badge - COMMENTED OUT */}
                        {/* {phoneVerified && (
                          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <span className="text-sm text-green-300 font-medium">Phone Verified Successfully!</span>
                          </div>
                        )} */}

                        {!emailOtpSent && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                  {...signUpForm.register("password")}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a password"
                                  className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-orange-400"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                >
                                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                              {signUpForm.formState.errors.password && (
                                <p className="text-red-400 text-xs mt-1">
                                  {signUpForm.formState.errors.password.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                  {...signUpForm.register("confirmPassword")}
                                  type="password"
                                  placeholder="Confirm your password"
                                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-orange-400"
                                />
                              </div>
                              {signUpForm.formState.errors.confirmPassword && (
                                <p className="text-red-400 text-xs mt-1">
                                  {signUpForm.formState.errors.confirmPassword.message}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 h-auto"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {emailOtpSent && !emailVerified && "Verifying Email..."}
                            {emailVerified && "Creating Account..."}
                            {!emailOtpSent && "Sending Email OTP..."}
                          </>
                        ) : emailOtpSent && !emailVerified ? (
                          "Verify Email & Register"
                        ) : (
                          "Send Verification Code"
                        )}
                      </Button>

                      {!emailOtpSent && (
                        <>
                          {/* Divider */}
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-slate-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-4 bg-slate-800 text-gray-400 font-medium">Or continue with</span>
                            </div>
                          </div>

                          {/* Google Sign-In Button */}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoogleSignIn}
                            disabled={isGoogleLoading || isLoading}
                            className="w-full border-2 border-slate-600 hover:bg-slate-700 text-white font-semibold py-3 h-auto bg-slate-700/50"
                          >
                            {isGoogleLoading ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Signing up with Google...
                              </>
                            ) : (
                              <>
                                <GoogleIcon />
                                <span className="ml-2">Sign up with Google</span>
                              </>
                            )}
                          </Button>
                        </>
                      )}

                      {!emailOtpSent && (
                        <p className="text-xs text-gray-400 text-center">
                          By continuing, you agree to Second Home's Terms of Service and Privacy Policy
                        </p>
                      )}
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}

