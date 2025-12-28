import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { Favorite } from "@/models/favorite"

// GET - Fetch all favorites for logged-in user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    const favorites = await Favorite.find({ user: session.user.id })
      .populate("property")
      .sort({ createdAt: -1 })

    // Return array of property IDs
    const favoritePropertyIds = favorites.map((fav) => fav.property?._id?.toString()).filter(Boolean)

    return NextResponse.json({
      success: true,
      favorites: favoritePropertyIds,
      count: favoritePropertyIds.length,
    })
  } catch (error) {
    console.error("❌ Error fetching favorites:", error)
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    )
  }
}

// POST - Add a property to favorites
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Please login to add favorites" }, { status: 401 })
    }

    const { propertyId } = await req.json()

    if (!propertyId) {
      return NextResponse.json({ error: "Property ID is required" }, { status: 400 })
    }

    await connectToDatabase()

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      user: session.user.id,
      property: propertyId,
    })

    if (existingFavorite) {
      return NextResponse.json(
        { message: "Property already in favorites", alreadyExists: true },
        { status: 200 }
      )
    }

    // Create new favorite
    const favorite = await Favorite.create({
      user: session.user.id,
      property: propertyId,
    })

    console.log(`✅ User ${session.user.email} added property ${propertyId} to favorites`)

    // Create notification for saved property (silently, don't block on error)
    try {
      const Property = (await import("@/models/property")).default
      const property = await Property.findById(propertyId).select("title location images").lean()
      
      if (property) {
        const Notification = (await import("@/models/notification")).default
        await Notification.create({
          user: session.user.id,
          type: "property",
          title: "Property Saved",
          message: `You saved ${property.title || "a property"} in ${property.location || "an area"} to your favorites.`,
          link: `/listings/${propertyId}`,
          image: property.images?.[0] || null,
          priority: "low",
          read: false,
          metadata: {
            propertyId: propertyId,
            action: "saved",
          },
        })
      }
    } catch (notifError) {
      // Silently fail - notification creation shouldn't block favorite creation
      console.log("Failed to create notification for saved property:", notifError)
    }

    return NextResponse.json({
      success: true,
      message: "Added to favorites",
      favorite: favorite._id,
    })
  } catch (error: any) {
    console.error("❌ Error adding to favorites:", error)
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { message: "Property already in favorites", alreadyExists: true },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: "Failed to add to favorites" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a property from favorites
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get("propertyId")

    if (!propertyId) {
      return NextResponse.json({ error: "Property ID is required" }, { status: 400 })
    }

    await connectToDatabase()

    const result = await Favorite.findOneAndDelete({
      user: session.user.id,
      property: propertyId,
    })

    if (!result) {
      return NextResponse.json(
        { message: "Favorite not found" },
        { status: 404 }
      )
    }

    console.log(`✅ User ${session.user.email} removed property ${propertyId} from favorites`)

    return NextResponse.json({
      success: true,
      message: "Removed from favorites",
    })
  } catch (error) {
    console.error("❌ Error removing from favorites:", error)
    return NextResponse.json(
      { error: "Failed to remove from favorites" },
      { status: 500 }
    )
  }
}

