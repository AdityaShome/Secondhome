"use client"

import type React from "react"
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

type User = {
  id: string
  name: string
  email: string
  image?: string
  role: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchInterval={0}
      refetchOnWindowFocus={true}
    >
      <AuthProviderContent>{children}</AuthProviderContent>
    </SessionProvider>
  )
}

function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (status === "loading") {
      setLoading(true)
      return
    }

    if (session?.user) {
      setUser({
        id: session.user.id as string,
        name: session.user.name as string,
        email: session.user.email as string,
        image: session.user.image as string | undefined,
        role: (session.user as any).role || "user",
      })
    } else {
      setUser(null)
    }

    setLoading(false)
  }, [session, status])

  // Listen for session updates (e.g., when profile picture changes)
  useEffect(() => {
    const handleSessionUpdate = () => {
      updateSession()
    }
    
    window.addEventListener('session-update', handleSessionUpdate)
    return () => {
      window.removeEventListener('session-update', handleSessionUpdate)
    }
  }, [updateSession])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      console.log("🔐 Attempting login for:", email)
      
      const result = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
      })

      console.log("🔐 Login result:", { ok: result?.ok, error: result?.error })

      if (result?.error) {
        const errorMessage = result.error === "CredentialsSignin" 
          ? "Invalid email or password. Please check your credentials and try again."
          : result.error === "Configuration"
          ? "Authentication service error. Please try again later."
          : result.error.includes("Database")
          ? "Database connection error. Please try again."
          : "Login failed. Please check your email and password."
        
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive",
        })
        return
      }

      if (result?.ok) {
        // Wait a bit for session to be established
        await new Promise(resolve => setTimeout(resolve, 500))
        
        toast({
          title: "Login successful",
          description: "Welcome back to Second Home!",
        })
        
        // Refresh router to get updated session
        router.refresh()
        setTimeout(() => {
          router.push("/")
        }, 200)
      }
    } catch (error: any) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: error?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      setLoading(true)
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Registration failed",
          description: data.error || "An error occurred during registration",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Registration successful",
        description: "You can now log in with your credentials",
      })

      router.push("/login")
    } catch (error) {
      console.error("Registration error:", error)
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut({ redirect: false })
      router.push("/")
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
