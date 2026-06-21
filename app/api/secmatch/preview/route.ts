import { NextResponse } from "next/server"
import { getSecMatchProfileModel } from "@/models/SecMatchProfile"

/**
 * GET /api/secmatch/preview?gender=male|female
 * Returns a small set of REAL profiles for the public landing page preview.
 * Sensitive fields (phone, userId) are stripped.
 * No auth required — public endpoint.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const gender = searchParams.get("gender") // "male" | "female" | null

    const Profile = await getSecMatchProfileModel()

    const query: Record<string, any> = { isActive: true }
    if (gender === "male" || gender === "female") {
      query.gender = gender
    }

    // Return up to 4 recent active profiles, stripping sensitive data
    const profiles = await Profile.find(query)
      .sort({ createdAt: -1 })
      .limit(4)
      .select(
        "name age gender college course year interests accommodationType preferredLocation budgetMin budgetMax bio sleepSchedule cleanlinessLevel cookingHabits createdAt"
        // Explicitly NOT selecting: phone, userId, isSubscribed, subscriptionExpiry
      )
      .lean()

    // Safe transform — never expose phone or userId
    const safe = profiles.map((p: any) => ({
      id: p._id.toString(),
      name: p.name ? p.name.split(" ")[0] + " " + (p.name.split(" ")[1]?.[0] ?? "") + "." : "Student",
      age: p.age,
      gender: p.gender,
      college: p.college,
      course: p.course,
      year: p.year,
      interests: (p.interests || []).slice(0, 5),
      accommodationType: p.accommodationType,
      preferredLocation: p.preferredLocation,
      budget: `₹${(p.budgetMin || 0).toLocaleString("en-IN")} – ₹${(p.budgetMax || 0).toLocaleString("en-IN")}`,
      bio: p.bio,
      sleepSchedule: p.sleepSchedule,
      cleanlinessLevel: p.cleanlinessLevel,
      cookingHabits: p.cookingHabits,
      joinedAgo: getTimeAgo(p.createdAt),
    }))

    return NextResponse.json({ profiles: safe })
  } catch (err) {
    console.error("SecMatch preview error:", err)
    return NextResponse.json({ profiles: [] }, { status: 200 }) // Graceful empty on error
  }
}

function getTimeAgo(date: Date): string {
  if (!date) return ""
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Joined today"
  if (days === 1) return "Joined yesterday"
  if (days < 7) return `Joined ${days} days ago`
  if (days < 30) return `Joined ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`
  return `Joined ${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`
}
