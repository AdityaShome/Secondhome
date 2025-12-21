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
  const [showPassword, setShowPassword] = useState(false)
  const isAdminAuto = searchParams.get("admin") === "1"
  const redirectParam = searchParams.get("redirect")

  const callbackUrl = redirectParam || searchParams.get("callbackUrl") || "/"

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
              {t("login.welcomeTitle")}
            </h2>
            <p className="text-lg text-gray-600">
              {t("login.welcomeSubtitle")}
            </p>
          </div>

          <div className="space-y-4 pt-8">
            {[
              { Icon: Building2, text: t("login.benefit.inventory"), color: "text-orange-500" },
              { Icon: ShieldCheck, text: t("login.benefit.verified"), color: "text-green-600" },
              { Icon: BadgePercent, text: t("login.benefit.brokerage"), color: "text-blue-600" },
              { Icon: Zap, text: t("login.benefit.booking"), color: "text-amber-500" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <item.Icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-gray-700 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
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
                <h2 className="text-3xl font-bold text-gray-900">{t("login.signIn")}</h2>
                <p className="text-gray-600">
                  {isAdminAuto
                    ? t("login.adminAccess")
                    : t("login.enterCredentials")}
                </p>
              </div>

              {/* Login Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 font-semibold">{t("login.email")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type="email"
                              placeholder={t("login.emailPlaceholder")}
                              disabled={isLoading || isAdminAuto}
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
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-gray-900 font-semibold">{t("login.password")}</FormLabel>
                          <Link
                            href="/forgot-password"
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            {t("login.forgotPassword")}
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder={t("login.passwordPlaceholder")}
                              disabled={isLoading || isAdminAuto}
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

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-md"
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

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  {t("login.noAccount")}{" "}
                  <Link href="/signup" className="text-orange-600 hover:text-orange-700 font-bold">
                    {t("login.signUpNow")}
                  </Link>
                </p>
                <p className="text-sm text-gray-600">
                  {t("login.ownerPrompt")}{" "}
                  <Link href="/register-property" className="text-orange-600 hover:text-orange-700 font-bold">
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
