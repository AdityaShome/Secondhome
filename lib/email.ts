export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function buildEmailRegex(normalizedEmail: string): RegExp {
  const escaped = escapeRegExp(normalizedEmail)
  return new RegExp(`^${escaped}$`, "i")
}

/**
 * Finds a user by email with a safe fallback for legacy mixed-case rows.
 *
 * Behavior:
 * 1) Try exact match on normalized email (fast path)
 * 2) If not found, try case-insensitive exact match (legacy support)
 * 3) If multiple rows match case-insensitively, returns `multiple: true`
 */
export async function findUserByEmailLoose<T extends { email: string }>(
  User: {
    findOne: (query: any) => { lean: () => Promise<any> }
    find: (query: any) => { limit: (n: number) => { lean: () => Promise<any[]> } }
  },
  email: string
): Promise<
  | { normalizedEmail: string; user: any; multiple: false }
  | { normalizedEmail: string; user: null; multiple: false }
  | { normalizedEmail: string; user: null; multiple: true }
> {
  const normalizedEmail = normalizeEmail(email)

  const direct = await User.findOne({ email: normalizedEmail }).lean()
  if (direct) {
    return { normalizedEmail, user: direct, multiple: false }
  }

  const regex = buildEmailRegex(normalizedEmail)
  const matches = await User.find({ email: regex }).limit(2).lean()

  if (matches.length === 1) {
    return { normalizedEmail, user: matches[0], multiple: false }
  }

  if (matches.length > 1) {
    return { normalizedEmail, user: null, multiple: true }
  }

  return { normalizedEmail, user: null, multiple: false }
}
