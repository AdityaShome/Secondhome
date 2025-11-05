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

          console.log("🔌 Connecting to MongoDB...")
          
          // Explicitly connect to MongoDB first
          await connectToDatabase()
          console.log("✅ MongoDB connected")

          // Get User model
          const User = await getUserModel()
          console.log("✅ User model obtained")

          // Find user
          console.log(`🔍 Searching for user with email: ${credentials.email}`)
          const user = await User.findOne({ email: credentials.email }).lean()

          if (!user) {
            console.error("❌ No user found with this email")
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
        } catch (error) {
          // Log error and return null
          // This prevents errors from bubbling up
          console.error("❌ Authentication error:", error)
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
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key",
  debug: process.env.NODE_ENV === "development",
})

export { handler as GET, handler as POST }
