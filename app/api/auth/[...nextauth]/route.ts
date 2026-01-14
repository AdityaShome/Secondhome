import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-options"

// Keep this route as the single source of truth for NextAuth.
// This ensures OAuth (Google/Facebook) users are created/loaded from MongoDB,
// and `session.user.id` is always a MongoDB ObjectId string (required by likes/favorites).
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
