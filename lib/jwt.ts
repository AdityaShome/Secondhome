import { SignJWT, jwtVerify } from "jose"

// JWT secret - use NEXTAUTH_SECRET if available, otherwise use a fallback
const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "your-secret-key-change-in-production"
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET)

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "7d" // 7 days
const REFRESH_TOKEN_EXPIRY = "30d" // 30 days

export interface JWTPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

/**
 * Generate an access token (short-lived)
 */
export async function generateAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET_KEY)

  return token
}

/**
 * Generate a refresh token (long-lived)
 */
export async function generateRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET_KEY)

  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY, {
      algorithms: ["HS256"],
    })

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    }
  } catch (error) {
    throw new Error("Invalid or expired token")
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(" ")
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null
  }
  
  return parts[1]
}

