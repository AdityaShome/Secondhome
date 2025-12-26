import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { connectToDatabase } from "@/lib/mongodb"
import { compare } from "bcryptjs"
import { getUserModel } from "@/models/user"

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password Login (always available)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        // Normalize email to lowercase for consistent lookup
        const normalizedEmail = credentials.email.toLowerCase().trim()

        // Check for admin credentials from environment variables
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
        const adminPassword = process.env.ADMIN_PASSWORD

        console.log("🔍 Admin check:", { 
          normalizedEmail, 
          adminEmail, 
          hasAdminPassword: !!adminPassword,
          emailMatch: normalizedEmail === adminEmail,
          passwordMatch: credentials.password === adminPassword
        })

        if (adminEmail && adminPassword && normalizedEmail === adminEmail && credentials.password === adminPassword) {
          console.log("✅ Admin authentication successful!")
          return {
            id: "000000000000000000000001",
            name: "Admin",
            email: adminEmail,
            image: null,
            role: "admin",
          }
        }

        try {
          console.log("🔌 Connecting to MongoDB...")
          
          // Explicitly connect to MongoDB first with timeout
          await Promise.race([
            connectToDatabase(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Database connection timeout")), 10000)
            )
          ])
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
            throw new Error("Invalid email or password")
          }

          // Check if user has a password (OAuth users might not have one)
          if (!user.password) {
            console.error("❌ User account has no password (likely OAuth account)")
            throw new Error("This account was created with social login. Please use Google or Facebook to sign in.")
          }

          console.log("✅ User found, validating password...")
          
          // Ensure password is a string
          if (typeof user.password !== "string" || user.password.length === 0) {
            console.error("❌ User password is invalid or missing")
            throw new Error("Invalid email or password")
          }
          
          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.error("❌ Invalid password")
            throw new Error("Invalid email or password")
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
            email: normalizedEmail,
          })
          // Re-throw to let NextAuth handle it properly
          throw error
        }
      },
    }),
    // Add Google provider only if credentials are available
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Add Facebook provider only if credentials are available
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Allow credentials provider (regular email/password login)
        if (account?.provider === "credentials") {
          return true
        }

        // Handle OAuth providers (Google, Facebook, etc.)
        if (account?.provider === "google" || account?.provider === "facebook") {
          await connectToDatabase()
          const User = await getUserModel()
          
          const email = user.email?.toLowerCase().trim()
          if (!email) {
            console.error("No email provided by OAuth provider")
            return false
          }

          // Check if user exists
          let existingUser = await User.findOne({ email }).lean()

          if (!existingUser) {
            // Create new user for OAuth sign-in
            console.log(`Creating new user from ${account.provider} OAuth:`, email)
            const newUser = await User.create({
              name: user.name || profile?.name || "User",
              email: email,
              image: user.image || profile?.picture || null,
              emailVerified: new Date(), // OAuth emails are pre-verified
              role: "user",
              // No password for OAuth users
            })
            existingUser = newUser.toObject()
            console.log("New OAuth user created:", existingUser._id)
          } else {
            console.log("Existing user found for OAuth login:", existingUser._id)
            // Update user image if not set
            if (!existingUser.image && user.image) {
              await User.updateOne(
                { _id: existingUser._id },
                { $set: { image: user.image, emailVerified: new Date() } }
              )
            }
          }

          // Update the user object with database info
          user.id = existingUser._id.toString()
          user.role = existingUser.role || "user"
          
          return true
        }

        return true
      } catch (error) {
        console.error("SignIn callback error:", error)
        return false
      }
    },
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
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  trustHost: true, // Trust the host header in production
}
