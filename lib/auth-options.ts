import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { connectToDatabase } from "@/lib/mongodb"
import { compare } from "bcryptjs"
import { getUserModel } from "@/models/user"
import { findUserByEmailLoose, normalizeEmail } from "@/lib/email"

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
        const normalizedEmail = normalizeEmail(credentials.email)

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
          const lookup = await findUserByEmailLoose(User as any, normalizedEmail)

          if (lookup.multiple) {
            console.error("❌ Multiple users found for email (case-insensitive match)")
            throw new Error("Multiple accounts detected for this email. Please contact support.")
          }

          const user = lookup.user

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
          
          const email = user.email ? normalizeEmail(user.email) : ""
          if (!email) {
            console.error("No email provided by OAuth provider")
            return false
          }

          // Check if user exists (robust to legacy mixed-case email rows)
          const lookup = await findUserByEmailLoose(User as any, email)

          if (lookup.multiple) {
            console.error(`❌ Multiple users found for OAuth email ${email}`)
            throw new Error(
              "Multiple accounts detected for this email. Please contact support to merge your accounts."
            )
          }

          let existingUser = lookup.user

          if (!existingUser) {
            // Create new user for OAuth sign-in
            console.log(`Creating new user from ${account.provider} OAuth:`, email)
            const newUser = await User.create({
              name: user.name || profile?.name || "User",
              email: email,
              image: user.image || profile?.picture || null,
              emailVerified: new Date(), // OAuth emails are pre-verified
              role: "user",
              provider: account.provider, // Store which OAuth provider was used
              // No password for OAuth users
            })
            existingUser = newUser.toObject()
            console.log("New OAuth user created:", existingUser._id)
          } else {
            console.log("Existing user found for OAuth login:", existingUser._id)

            const update: Record<string, any> = {}

            // Keep the DB image in sync if it's missing
            if (!existingUser.image && (user.image || (profile as any)?.picture)) {
              update.image = user.image || (profile as any)?.picture
            }

            // Mark email as verified on successful OAuth sign-in
            if (!existingUser.emailVerified) {
              update.emailVerified = new Date()
            }

            // Backfill a missing name
            if (!existingUser.name && (user.name || profile?.name)) {
              update.name = user.name || profile?.name
            }

            if (Object.keys(update).length > 0) {
              await User.updateOne({ _id: existingUser._id }, { $set: update })
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
    async jwt({ token, user, trigger }) {
      try {
        if (user) {
          token.id = user.id
          token.role = user.role || "user"
        }

        // Robust fallback: some OAuth sessions can end up without token.id.
        // If we have an email, resolve the user from DB and backfill token.id.
        if (!token.id && token.email) {
          try {
            await connectToDatabase()
            const User = await getUserModel()
            const normalizedEmail = token.email.toLowerCase().trim()
            const dbUser = await User.findOne({ email: normalizedEmail }).select("_id role").lean()
            if (dbUser?._id) {
              token.id = dbUser._id.toString()
              token.role = (dbUser as any).role || token.role || "user"
            }
          } catch (error) {
            console.error("Failed to backfill token.id from email:", error)
          }
        }
        
        // If session is being updated (e.g., via update()), refresh role from database
        if (trigger === "update" && token.id) {
          try {
            await connectToDatabase()
            const User = await getUserModel()
            const dbUser = await User.findById(token.id).select("role").lean()
            if (dbUser) {
              token.role = dbUser.role || "user"
            }
          } catch (error) {
            console.error("Failed to refresh user role:", error)
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
          
          // Fetch user image from database
          if (token.id) {
            try {
              await connectToDatabase()
              const User = await getUserModel()
              const dbUser = await User.findById(token.id).select("image").lean()
              if (dbUser?.image) {
                session.user.image = dbUser.image
              }
            } catch (error) {
              console.error("Failed to fetch user image:", error)
            }
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
  trustHost: true, // Trust the host header in production
}
