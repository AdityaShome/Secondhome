import { NextResponse } from "next/server"
import { getSecMatchProfileModel } from "@/models/SecMatchProfile"
import { getSecMatchLikeModel } from "@/models/SecMatchLike"

/**
 * GET /api/secmatch/stats
 * Returns live platform-wide counts for the SecMatch landing page.
 * No auth required — public endpoint.
 * Graceful: always returns 200, never crashes the page.
 */
export async function GET() {
  let totalProfiles = 0
  let mutualCount = 0
  let cityCount = 0

  try {
    const Profile = await getSecMatchProfileModel()
    totalProfiles = await Profile.countDocuments({ isActive: true }).maxTimeMS(5000)
  } catch (e) {
    console.error("SecMatch stats — profile count failed:", e)
  }

  try {
    const Like = await getSecMatchLikeModel()
    const result = await Like.aggregate([
      { $match: { action: "like" } },
      {
        $lookup: {
          from: "secmatchlikes",
          let: { from: "$fromUserId", to: "$toUserId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$fromUserId", "$$to"] },
                    { $eq: ["$toUserId", "$$from"] },
                    { $eq: ["$action", "like"] },
                  ],
                },
              },
            },
          ],
          as: "reverse",
        },
      },
      { $match: { reverse: { $ne: [] } } },
      { $count: "total" },
    ]).option({ maxTimeMS: 5000 })
    mutualCount = result[0]?.total ?? 0
  } catch (e) {
    console.error("SecMatch stats — mutual count failed:", e)
  }

  try {
    const Profile = await getSecMatchProfileModel()
    const result = await Profile.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$preferredLocation" } },
      { $count: "total" },
    ]).option({ maxTimeMS: 5000 })
    cityCount = result[0]?.total ?? 0
  } catch (e) {
    console.error("SecMatch stats — city count failed:", e)
  }

  return NextResponse.json({
    totalProfiles,
    totalMutualMatches: mutualCount,
    citiesCovered: cityCount,
    stats: [
      {
        value: totalProfiles >= 1000 ? `${(totalProfiles / 1000).toFixed(1)}k+` : `${totalProfiles}+`,
        label: "Active Profiles",
      },
      {
        value: mutualCount >= 1000 ? `${(mutualCount / 1000).toFixed(1)}k+` : `${mutualCount}+`,
        label: "Matches Made",
      },
      {
        value: `${cityCount}+`,
        label: "Cities Covered",
      },
    ],
  })
}
