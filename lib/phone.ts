export function normalizePhoneNumber(phone: string): string {
  // Keep leading + if present, strip everything else to digits.
  let normalized = phone.trim().replace(/[^\d+]/g, "")

  if (!normalized) return normalized

  // If it doesn't start with +, assume India (+91) for 10-digit numbers.
  if (!normalized.startsWith("+")) {
    if (normalized.startsWith("91") && normalized.length === 12) {
      normalized = "+" + normalized
    } else if (normalized.length === 10) {
      normalized = "+91" + normalized
    } else if (normalized.length > 10) {
      normalized = "+" + normalized
    }
  }

  return normalized
}

export function isValidE164(phone: string): boolean {
  return /^\+\d{10,15}$/.test(phone)
}
