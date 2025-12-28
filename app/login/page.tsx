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
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, Loader2, Home, Mail, Lock, ArrowRight, Building2, ShieldCheck, BadgePercent, Zap } from "lucide-react"
import { signIn, useSession } from "next-auth/react"
import Image from "next/image"
import { useLanguage } from "@/providers/language-provider"

// SVG for Google Icon
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { login } = useAuth()
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isAdminAuto = searchParams.get("admin") === "1"
  const redirectParam = searchParams.get("redirect")

  const callbackUrl = redirectParam || searchParams.get("callbackUrl") || "/"

  // Check for OAuth error in URL
  useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      let errorMessage = "An error occurred during sign in."
      
      // Parse NextAuth error messages
      if (error.includes("already exists with this email")) {
        errorMessage = "An account with this email already exists. Please sign in with your email and password instead of using Google/Facebook."
      } else if (error === "OAuthAccountNotLinked") {
        errorMessage = "This email is already associated with another account. Please sign in with your original method."
      } else if (error === "OAuthSignin" || error === "OAuthCallback") {
        errorMessage = "There was a problem with the OAuth sign-in. Please try again."
      }
      
      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive",
      })
      
      // Clean up URL
      router.replace("/login", { scroll: false })
    }
  }, [searchParams, toast, router])

  // Redirect if already logged in
  useEffect(() => {
    try {
      if (status === "authenticated" && session) {
        // Redirect admin users to admin portal
        if (session.user?.role === "admin") {
          router.replace("/admin/properties")
        } else {
          router.replace(callbackUrl)
        }
      }
    } catch (error) {
      console.error("Redirect error:", error)
      // If there's an error, just stay on login page
    }
  }, [status, session, router, callbackUrl])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: isAdminAuto ? (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "") : "",
      password: isAdminAuto ? (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "") : "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
      })

      if (result?.error) {
        toast({
          title: "Login failed",
          description: result.error || "Please check your email and password.",
          variant: "destructive",
        })
        return
      }

      // Wait for session to update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Fetch fresh session to check role
      const response = await fetch('/api/auth/session')
      const sessionData = await response.json()
      
      if (sessionData?.user?.role === "admin") {
        router.push("/admin/properties")
      } else {
        router.push(callbackUrl)
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: "An error occurred during login.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    try {
      await signIn("google", {
        callbackUrl: callbackUrl,
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

  // Auto-submit for admin auto-login
  useEffect(() => {
    if (isAdminAuto) {
      const email = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ""
      const password = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ""
      setIsLoading(true)
      // Ensure admin exists before login (bootstrap route is open or token-protected)
      fetch("/api/admin/bootstrap", { method: "POST" })
        .catch(() => {})
        .finally(() => {
          // Use next-auth signIn directly to honor callback and redirect
          signIn("credentials", {
            redirect: true,
            email,
            password,
            callbackUrl,
          }).catch(() => {
            toast({
              title: "Admin login failed",
              description: "Please enter credentials manually.",
              variant: "destructive",
            })
            setIsLoading(false)
          })
        })
    }
  }, [isAdminAuto, callbackUrl, toast])

  // Show loading while checking authentication (but only for a short time)
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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/secondhome_login.png)',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
        }}
      />
      
      {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/50" />
      
      {/* Additional subtle overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center z-10">
        {/* Left Side - Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-6 px-8 text-white">
          <Link href="/" className="flex items-center gap-3 mb-8 group">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 group-hover:bg-white/30 transition-all">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                Second <span className="text-orange-400">Home</span>
              </h1>
              <p className="text-sm text-white/90 drop-shadow-md">Student Accommodation Platform</p>
            </div>
          </Link>

          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-2xl">
              {t("login.welcomeTitle")}
            </h2>
            <p className="text-xl text-white/95 drop-shadow-lg font-medium">
              {t("login.welcomeSubtitle")}
            </p>
          </div>

          <div className="space-y-4 pt-8">
            {[
              { Icon: Building2, text: t("login.benefit.inventory"), color: "text-orange-400" },
              { Icon: ShieldCheck, text: t("login.benefit.verified"), color: "text-green-400" },
              { Icon: BadgePercent, text: t("login.benefit.brokerage"), color: "text-blue-400" },
              { Icon: Zap, text: t("login.benefit.booking"), color: "text-amber-400" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <item.Icon className={`w-6 h-6 ${item.color} drop-shadow-md`} />
                <span className="text-white font-semibold drop-shadow-md">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <Card className="border-2 border-white/30 shadow-2xl bg-white/95 backdrop-blur-xl">
          <CardContent className="p-8 md:p-10">
            <div className="space-y-6">
              {/* Mobile Logo */}
              <Link href="/" className="md:hidden flex items-center justify-center gap-2 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  Second <span className="text-orange-500">Home</span>
                </span>
              </Link>

              <div className="space-y-3 text-center md:text-left">
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {t("login.signIn")}
                </h2>
                <p className="text-gray-600 text-base font-medium">
                  {isAdminAuto
                    ? t("login.adminAccess")
                    : t("login.enterCredentials")}
                </p>
              </div>

              {/* Login Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 font-bold text-sm">{t("login.email")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                            <Input
                              {...field}
                              type="email"
                              placeholder={t("login.emailPlaceholder")}
                              disabled={isLoading || isAdminAuto}
                              className="pl-12 h-14 border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-gray-900 text-base rounded-xl transition-all shadow-sm hover:shadow-md"
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-1">
                          <FormLabel className="text-gray-900 font-bold text-sm">{t("login.password")}</FormLabel>
                          <Link
                            href="/forgot-password"
                            className="text-sm text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                          >
                            {t("login.forgotPassword")}
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder={t("login.passwordPlaceholder")}
                              disabled={isLoading || isAdminAuto}
                              className="pl-12 pr-12 h-14 border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-gray-900 text-base rounded-xl transition-all shadow-sm hover:shadow-md"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all rounded-xl"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t("login.signingIn")}
                      </>
                    ) : (
                      <>
                        {t("login.signInCta")}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-semibold">Or continue with</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full h-14 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 hover:text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all opacity-100 hover:opacity-100 disabled:opacity-50 [&_svg]:opacity-100 [&_span]:opacity-100"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in with Google...
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span className="ml-2 opacity-100">Sign in with Google</span>
                  </>
                )}
              </Button>

              <div className="text-center space-y-3 pt-2">
                <p className="text-sm text-gray-600 font-medium">
                  {t("login.noAccount")}{" "}
                  <Link href="/signup" className="text-orange-600 hover:text-orange-700 font-bold transition-colors">
                    {t("login.signUpNow")}
                  </Link>
                </p>
                <p className="text-sm text-gray-600 font-medium">
                  {t("login.ownerPrompt")}{" "}
                  <Link href="/register-property" className="text-orange-600 hover:text-orange-700 font-bold transition-colors">
                    {t("login.registerHere")}
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
