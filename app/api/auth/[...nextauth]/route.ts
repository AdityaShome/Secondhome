import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { compare } from "bcryptjs"
import { getUserModel } from "@/models/user"
import { connectToDatabase } from "@/lib/mongodb"

// NEXTAUTH_SECRET will be checked at runtime, not build time
// This allows the build to succeed without environment variables

// Build providers array conditionally
const providers = [
  // Email/Password Login (always available)
  CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error("❌ Missing credentials")
            return null
          }

          // Normalize email to lowercase for consistent lookup
          const normalizedEmail = credentials.email.toLowerCase().trim()

          console.log("🔌 Connecting to MongoDB...")
          
          // Explicitly connect to MongoDB first
          await connectToDatabase()
          console.log("✅ MongoDB connected")

          // Get User model
          const User = await getUserModel()
          console.log("✅ User model obtained")

          // Find user (emails are stored normalized)
          console.log(`🔍 Searching for user with email: ${normalizedEmail}`)
          const user = await User.findOne({ 
            email: normalizedEmail
          }).lean()

          if (!user) {
            console.error(`❌ No user found with email: ${normalizedEmail}`)
            return null
          }

          // Check if user has a password (OAuth users might not have one)
          if (!user.password) {
            console.error("❌ User account has no password (likely OAuth account)")
            return null
          }

          console.log("✅ User found, validating password...")
          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.error("❌ Invalid password")
            return null
          }

          console.log("✅ Authentication successful!")
          return {
            id: user._id.toString(),
            name: user.name || "",
            email: user.email || "",
            image: user.image || null,
            role: user.role || "user",
          }
        } catch (error: any) {
          // Log detailed error for debugging
          console.error("❌ Authentication error:", {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
          })
          return null
        }
      },
    }),
]

// Add Google provider only if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

// Add Facebook provider only if credentials are available
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    })
  )
}

// Validate NEXTAUTH_SECRET in production
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
  console.error("❌ NEXTAUTH_SECRET is required in production")
}

const handler = NextAuth({
  providers,
  callbacks: {
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = user.id
          token.role = user.role || "user"
        }
        return token
      } catch (error) {
        console.error("JWT callback error:", error)
        return token
      }
    },
    async session({ session, token }) {
      try {
        if (token && session?.user) {
          session.user.id = token.id as string
          session.user.role = (token.role as string) || "user"
        }
        return session
      } catch (error) {
        console.error("Session callback error:", error)
        return session
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
})

export { handler as GET, handler as POST }
