import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserModel } from "@/models/user"
import { Booking } from "@/models/booking"
import { Property } from "@/models/property"

export async function GET() {
  try {
    await connectToDatabase()

    // Get Property Owners count (users with role "owner")
    const User = await getUserModel()
    const propertyOwnersCount = await User.countDocuments({ role: "owner" })

    // Get Student Bookings count (all bookings or confirmed bookings)
    // For annual bookings, we can count bookings from the last year
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    const totalBookings = await Booking.countDocuments({})
    const annualBookings = await Booking.countDocuments({
      createdAt: { $gte: oneYearAgo }
    })

    // Get Success Rate (percentage of approved properties)
    const totalProperties = await Property.countDocuments({})
    const approvedProperties = await Property.countDocuments({
      isApproved: true,
      isRejected: false
    })
    
    const successRate = totalProperties > 0 
      ? Math.round((approvedProperties / totalProperties) * 100)
      : 0

    // Format numbers for display (without + sign)
    const formatNumber = (num: number) => {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`
      }
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`
      }
      return num.toString()
    }

    return NextResponse.json({
      propertyOwners: propertyOwnersCount,
      propertyOwnersFormatted: formatNumber(propertyOwnersCount),
      studentBookings: annualBookings || totalBookings, // Use annual if available, else total
      studentBookingsFormatted: formatNumber(annualBookings || totalBookings),
      successRate: successRate,
      successRateFormatted: `${successRate}%`,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    // Return default values on error
    return NextResponse.json({
      propertyOwners: 0,
      propertyOwnersFormatted: "0",
      studentBookings: 0,
      studentBookingsFormatted: "0",
      successRate: 0,
      successRateFormatted: "0%",
    })
  }
}

