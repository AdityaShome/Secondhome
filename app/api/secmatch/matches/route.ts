import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getSession } from "@/lib/get-session"
import { getSecMatchProfileModel } from "@/models/SecMatchProfile"
import { getSecMatchLikeModel } from "@/models/SecMatchLike"

// ─── AI Compatibility Scoring Algorithm ────────────────────────────────────
function calculateCompatibilityScore(userProfile: any, candidate: any): number {
  let score = 0
  let maxScore = 0

  // ── 1. Location Match (40 pts max) ──────────────────────────
  maxScore += 40
  const userLoc = userProfile.preferredLocation?.toLowerCase().trim() || ""
  const candLoc = candidate.preferredLocation?.toLowerCase().trim() || ""
  if (userLoc && candLoc) {
    if (userLoc === candLoc) {
      score += 40
    } else if (userLoc.includes(candLoc) || candLoc.includes(userLoc)) {
      score += 25
    } else {
      // Check city-level match (first word)
      const userCity = userLoc.split(" ")[0]
      const candCity = candLoc.split(" ")[0]
      if (userCity === candCity) score += 15
    }
  }

  // ── 2. Interests Match (30 pts max) ────────────────────────
  maxScore += 30
  const userInterests = new Set((userProfile.interests || []).map((i: string) => i.toLowerCase()))
  const candInterests = new Set((candidate.interests || []).map((i: string) => i.toLowerCase()))
  let sharedInterests = 0
  userInterests.forEach((interest) => {
    if (candInterests.has(interest)) sharedInterests++
  })
  const interestScore = Math.min(sharedInterests * 5, 30)
  score += interestScore

  // ── 3. Budget Compatibility (20 pts max) ────────────────────
  maxScore += 20
  const userMin = userProfile.budgetMin || 0
  const userMax = userProfile.budgetMax || Infinity
  const candMin = candidate.budgetMin || 0
  const candMax = candidate.budgetMax || Infinity
  // Check overlap
  const overlapMin = Math.max(userMin, candMin)
  const overlapMax = Math.min(userMax, candMax)
  if (overlapMax >= overlapMin) {
    const overlapRange = overlapMax - overlapMin
    const userRange = userMax - userMin || 1
    const candRange = candMax - candMin || 1
    const overlapRatio = overlapRange / Math.max(userRange, candRange)
    score += Math.round(overlapRatio * 20)
  }

  // ── 4. Sleep Schedule (10 pts max) ──────────────────────────
  maxScore += 10
  if (userProfile.sleepSchedule && candidate.sleepSchedule) {
    if (userProfile.sleepSchedule === candidate.sleepSchedule) {
      score += 10
    } else if (
      userProfile.sleepSchedule === "flexible" ||
      candidate.sleepSchedule === "flexible"
    ) {
      score += 6
    }
  }

  // ── 5. Cleanliness Level (10 pts max) ───────────────────────
  maxScore += 10
  if (userProfile.cleanlinessLevel && candidate.cleanlinessLevel) {
    const diff = Math.abs(userProfile.cleanlinessLevel - candidate.cleanlinessLevel)
    score += Math.max(0, 10 - diff * 3)
  }

  // ── 6. Accommodation Type (15 pts max) ──────────────────────
  maxScore += 15
  if (userProfile.accommodationType === candidate.accommodationType) {
    score += 15
  } else if (
    userProfile.accommodationType === "Both" ||
    candidate.accommodationType === "Both"
  ) {
    score += 10
  }

  // ── 7. Lifestyle Preferences (15 pts max) ───────────────────
  maxScore += 15
  let lifestyleScore = 0
  if (userProfile.smokingPreference === candidate.smokingPreference) lifestyleScore += 5
  else if (userProfile.smokingPreference === "doesnt_matter" || candidate.smokingPreference === "doesnt_matter") lifestyleScore += 3
  if (userProfile.drinkingPreference === candidate.drinkingPreference) lifestyleScore += 5
  else if (userProfile.drinkingPreference === "doesnt_matter" || candidate.drinkingPreference === "doesnt_matter") lifestyleScore += 3
  if (userProfile.cookingHabits === candidate.cookingHabits) lifestyleScore += 3
  if (userProfile.petFriendly === candidate.hasPets) lifestyleScore += 2
  score += Math.min(lifestyleScore, 15)

  // ── 8. Same College Bonus (10 pts) ──────────────────────────
  maxScore += 10
  if (
    userProfile.college &&
    candidate.college &&
    userProfile.college.toLowerCase().trim() === candidate.college.toLowerCase().trim()
  ) {
    score += 10
  }

  // ── Normalize to percentage ──────────────────────────────────
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  return Math.min(percentage, 100)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()
    const SecMatchProfile = await getSecMatchProfileModel()
    const SecMatchLike = await getSecMatchLikeModel()

    // Get current user profile
    const myProfile = await SecMatchProfile.findOne({ userId: session.user.id }).lean()
    if (!myProfile) {
      return NextResponse.json({ error: "Profile not found. Please create your SecMatch profile first." }, { status: 404 })
    }

    // Get all IDs the user has already acted on
    const actedOn = await SecMatchLike.find({ fromUserId: session.user.id }).lean()
    const actedOnIds = new Set(actedOn.map((l: any) => l.toUserId))

    // Find candidates: MUST be same gender, active, not self, not already acted on
    const candidates = await SecMatchProfile.find({
      userId: { $ne: session.user.id, $nin: Array.from(actedOnIds) },
      gender: (myProfile as any).gender, // STRICT gender filter: no cross-gender matching
      isActive: true,
    })
      .limit(50)
      .lean()

    // Score each candidate
    const scored = candidates
      .map((candidate: any) => ({
        ...candidate,
        compatibilityScore: calculateCompatibilityScore(myProfile, candidate),
        sharedInterests: (myProfile as any).interests?.filter((i: string) =>
          candidate.interests?.includes(i)
        ) || [],
      }))
      .sort((a: any, b: any) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 10) // Top 10 matches

    // Find mutual matches
    const myLikes = await SecMatchLike.find({
      fromUserId: session.user.id,
      action: "like",
    }).lean()
    const myLikedIds = new Set(myLikes.map((l: any) => l.toUserId))

    const theirLikes = await SecMatchLike.find({
      toUserId: session.user.id,
      action: "like",
    }).lean()
    const theirLikedIds = new Set(theirLikes.map((l: any) => l.fromUserId))

    // Mutuals: both liked each other
    const mutualMatches = await SecMatchProfile.find({
      userId: {
        $in: Array.from(myLikedIds).filter((id) => theirLikedIds.has(id)),
      },
    }).lean()

    return NextResponse.json({
      matches: scored,
      mutualMatches,
      myProfile,
    })
  } catch (error) {
    console.error("Error fetching SecMatch matches:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
