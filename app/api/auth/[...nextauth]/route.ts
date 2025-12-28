import NextAuth from "next-auth"
import type { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { compare } from "bcryptjs"
import { getUserModel } from "@/models/user"
import { connectToDatabase } from "@/lib/mongodb"

// NEXTAUTH_SECRET will be checked at runtime, not build time
// This allows the build to succeed without environment variables

// Build providers array conditionally
const providers: AuthOptions['providers'] = [
  // Email/Password Login (always available)
  CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("❌ Missing credentials")
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
              name: user.name || (profile as any)?.name || "User",
              email: email,
              image: user.image || (profile as any)?.picture || null,
              emailVerified: new Date(), // OAuth emails are pre-verified
              role: "user",
              provider: account.provider, // Store which OAuth provider was used
              // No password for OAuth users
            })
            existingUser = newUser.toObject()
            console.log("New OAuth user created:", existingUser._id)
          } else {
            console.log("Existing user found for OAuth login:", existingUser._id)
            
            // Check if existing user has a password (was created via email/password)
            if (existingUser.password) {
              console.error(`❌ Account with email ${email} already exists with password authentication`)
              // Prevent OAuth login - user must use their password
              throw new Error("An account already exists with this email. Please sign in with your email and password instead.")
            }
            
            // If no password, it's an OAuth account - update image if Google/Facebook provides one
            const oauthImage = user.image || (profile as any)?.picture
            if (oauthImage) {
              // Update image if it's different or if user doesn't have one
              if (!existingUser.image || existingUser.image !== oauthImage) {
                await User.updateOne(
                  { _id: existingUser._id },
                  { $set: { image: oauthImage, emailVerified: new Date() } }
                )
                console.log("Updated OAuth user image:", oauthImage)
                // Update existingUser object with new image
                existingUser.image = oauthImage
              }
            }
          }

          // Update the user object with database info (use database image if available, otherwise OAuth image)
          user.id = existingUser._id.toString()
          user.role = existingUser.role || "user"
          // Prioritize database image (which may have been just updated), then OAuth image
          user.image = existingUser.image || user.image || (profile as any)?.picture || null
          
          return true
        }

        return true
      } catch (error) {
        console.error("SignIn callback error:", error)
        return false
      }
    },
    async jwt({ token, user, trigger }) {
      try {
        if (user) {
          token.id = user.id
          token.role = user.role || "user"
          // Store image from user (from Google/Facebook OAuth or database)
          token.image = user.image || null
        }
        
        // If session is being updated (e.g., after profile picture change), fetch fresh user data
        if (trigger === "update") {
          try {
            await connectToDatabase()
            const User = await getUserModel()
            const dbUser = await User.findById(token.id).select("image").lean()
            if (dbUser) {
              token.image = dbUser.image || null
            }
          } catch (error) {
            console.error("Failed to fetch user image in JWT callback:", error)
          }
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
          
          // Always fetch fresh image from database to ensure it's up to date
          if (token.id) {
            try {
              await connectToDatabase()
              const User = await getUserModel()
              const dbUser = await User.findById(token.id).select("image").lean()
              if (dbUser?.image) {
                session.user.image = dbUser.image
              } else {
                session.user.image = null
              }
            } catch (error) {
              console.error("Failed to fetch user image in session callback:", error)
              // Fallback to token image if database fetch fails
              session.user.image = (token.image as string) || null
            }
          } else {
            session.user.image = (token.image as string) || null
          }
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
})

export { handler as GET, handler as POST }
