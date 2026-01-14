import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Like } from "@/models/like"
import { Property } from "@/models/property"
import { Mess } from "@/models/mess"
import { getSession } from "@/lib/get-session"
import mongoose from "mongoose"

export async function POST(req: Request) {
  try {
    const session = await getSession()

    if (!session || !session.user || !session.user.id) {
      console.error("❌ Unauthorized: No session or user ID", {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
      })
      return NextResponse.json({ error: "Unauthorized. Please log in to like properties." }, { status: 401 })
    }

    const body = await req.json()
    const { itemType, itemId } = body

    console.log("📝 Like request:", { itemType, itemId, userId: session.user.id })

    if (!itemType || !itemId) {
      return NextResponse.json({ error: "Item type and ID are required" }, { status: 400 })
    }

    if (itemType !== "property" && itemType !== "mess") {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 })
    }

    // Validate itemId format if it's a MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      console.error("❌ Invalid itemId format:", itemId)
      return NextResponse.json({ error: "Invalid property ID format" }, { status: 400 })
    }

    // Convert to ObjectId
    const itemObjectId = new mongoose.Types.ObjectId(itemId)
    const userObjectId = new mongoose.Types.ObjectId(session.user.id)

    console.log("🔌 Connecting to MongoDB...")
    await connectToDatabase()
    console.log("✅ MongoDB connected")

    // Check if the item exists
    let item
    if (itemType === "property") {
      item = await Property.findById(itemObjectId)
    } else {
      item = await Mess.findById(itemObjectId)
    }

    if (!item) {
      return NextResponse.json({ error: `${itemType} not found` }, { status: 404 })
    }

    // Check if the user has already liked this item
    console.log("🔍 Checking for existing like...")
    const existingLike = await Like.findOne({
      user: userObjectId,
      itemType,
      itemId: itemObjectId,
    })

    if (existingLike) {
      console.log("✅ Found existing like, removing...")
      // User already liked this item, so unlike it
      await Like.findByIdAndDelete(existingLike._id)

      // Get the updated like count
      const likeCount = await Like.countDocuments({ itemType, itemId: itemObjectId })
      console.log("✅ Like removed successfully")

      return NextResponse.json({
        message: "Like removed successfully",
        liked: false,
        likeCount,
      })
    }

    // Create a new like
    console.log("❤️ Creating new like...")
    const newLike = new Like({
      user: userObjectId,
      itemType,
      itemId: itemObjectId,
      createdAt: new Date(),
    })

    try {
      await newLike.save()
      console.log("✅ Like saved successfully")
    } catch (saveError: any) {
      console.error("❌ Error saving like:", saveError)
      // If it's a duplicate key error (user already liked or old index conflict)
      if (saveError.code === 11000 || saveError.message?.includes("duplicate")) {
        console.log("🔍 Duplicate key error detected, checking for existing like...")
        
        // Try to find the existing like
        const duplicateLike = await Like.findOne({
          user: userObjectId,
          itemType,
          itemId: itemObjectId,
        })
        
        if (duplicateLike) {
          console.log("✅ Found existing like, removing...")
          await Like.findByIdAndDelete(duplicateLike._id)
          const likeCount = await Like.countDocuments({ itemType, itemId: itemObjectId })
          return NextResponse.json({
            message: "Like removed successfully",
            liked: false,
            likeCount,
          })
        } else {
          // This might be an old index conflict - try to clean up
          console.log("⚠️ Duplicate key error but no like found - might be old index issue")
          console.log("💡 Please run: node fix-like-indexes.js to fix database indexes")
          
          // Still return success to prevent UI blocking, but log the issue
          const likeCount = await Like.countDocuments({ itemType, itemId: itemObjectId })
          return NextResponse.json({
            message: "Like processing completed",
            liked: true,
            likeCount: likeCount + 1,
            warning: "Index conflict detected - please run fix script",
          })
        }
      }
      throw saveError
    }

    // Get the updated like count
    const likeCount = await Like.countDocuments({ itemType, itemId: itemObjectId })

    return NextResponse.json({
      message: "Item liked successfully",
      liked: true,
      likeCount,
    })
  } catch (error: any) {
    console.error("❌ Error in likes API:", error)
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    })
    return NextResponse.json({ 
      error: error?.message || "An error occurred while processing your request",
      details: process.env.NODE_ENV === "development" ? error?.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const itemType = url.searchParams.get("itemType")
    const itemId = url.searchParams.get("itemId")
    const userId = url.searchParams.get("userId")
    const getMyLikes = url.searchParams.get("myLikes") === "true"

    // If requesting user's own liked items
    if (getMyLikes) {
      const session = await getSession()

      if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      await connectToDatabase()

      // Convert user ID to ObjectId
      const userObjectId = new mongoose.Types.ObjectId(session.user.id)

      console.log("🔍 Fetching likes for user:", session.user.id)

      // Get all likes for the current user (don't populate here - we'll fetch manually)
      const userLikes = await Like.find({ user: userObjectId })
        .sort({ createdAt: -1 })
        .lean() // Use lean() for better performance

      console.log(`✅ Found ${userLikes.length} likes`)

      // Separate properties and messes
      const properties = []
      const messes = []

      // Fetch properties and messes in parallel
      const propertyPromises = []
      const messPromises = []

      for (const like of userLikes) {
        // Convert itemId to string for validation and use
        const itemIdStr = like.itemId.toString()
        
        if (like.itemType === "property" && mongoose.Types.ObjectId.isValid(itemIdStr)) {
          const itemObjectId = new mongoose.Types.ObjectId(itemIdStr)
          propertyPromises.push(
            Property.findById(itemObjectId)
              .populate("owner", "name email phone")
              .lean()
              .then((property) => {
                if (property && property.isApproved && !property.isRejected) {
                  return property
                }
                return null
              })
              .catch((err) => {
                console.error(`Error fetching property ${itemIdStr}:`, err)
                return null
              })
          )
        } else if (like.itemType === "mess" && mongoose.Types.ObjectId.isValid(itemIdStr)) {
          const itemObjectId = new mongoose.Types.ObjectId(itemIdStr)
          messPromises.push(
            Mess.findById(itemObjectId)
              .populate("owner", "name email phone")
              .lean()
              .then((mess) => {
                if (mess && mess.isApproved && !mess.isRejected) {
                  return mess
                }
                return null
              })
              .catch((err) => {
                console.error(`Error fetching mess ${itemIdStr}:`, err)
                return null
              })
          )
        }
      }

      // Wait for all property fetches
      const propertyResults = await Promise.all(propertyPromises)
      properties.push(...propertyResults.filter((p) => p !== null))

      // Wait for all mess fetches
      const messResults = await Promise.all(messPromises)
      messes.push(...messResults.filter((m) => m !== null))

      console.log(`✅ Returning ${properties.length} properties and ${messes.length} messes`)

      return NextResponse.json({
        properties,
        messes,
        total: properties.length + messes.length,
      }, { status: 200 })
    }

    // Original functionality - check like status for a specific item
    if (!itemType || !itemId) {
      return NextResponse.json({ error: "Item type and ID are required" }, { status: 400 })
    }

    if (itemType !== "property" && itemType !== "mess") {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 })
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid item ID format" }, { status: 400 })
    }

    await connectToDatabase()

    const itemObjectId = new mongoose.Types.ObjectId(itemId)

    // Get the like count for the item
    const likeCount = await Like.countDocuments({ itemType, itemId: itemObjectId })

    // Check if the user has liked this item (if userId is provided)
    let userLiked = false

    let effectiveUserId: string | null = userId
    if (!effectiveUserId || !mongoose.Types.ObjectId.isValid(effectiveUserId)) {
      const session = await getSession()
      effectiveUserId = session?.user?.id && mongoose.Types.ObjectId.isValid(session.user.id) ? session.user.id : null
    }

    if (effectiveUserId) {
      const userObjectId = new mongoose.Types.ObjectId(effectiveUserId)
      const userLike = await Like.findOne({
        user: userObjectId,
        itemType,
        itemId: itemObjectId,
      })
      userLiked = !!userLike
    }

    return NextResponse.json({
      likeCount,
      userLiked,
    })
  } catch (error) {
    console.error("Error getting likes:", error)
    return NextResponse.json({ error: "An error occurred while fetching likes" }, { status: 500 })
  }
}
