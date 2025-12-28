import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"
import { getImagesFromDriveFolder } from "@/lib/google-drive"

/**
 * GET - Fetch images from Google Drive for a property
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get("propertyId")
    const folderId = searchParams.get("folderId")

    if (!propertyId && !folderId) {
      return NextResponse.json(
        { error: "Property ID or folder ID is required" },
        { status: 400 }
      )
    }

    let driveFolderId = folderId

    // If propertyId provided, get folderId from property
    if (propertyId && !folderId) {
      await connectToDatabase()
      const property = await Property.findById(propertyId).select("driveFolderId").lean()

      if (!property) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 })
      }

      if (!property.driveFolderId) {
        return NextResponse.json(
          { error: "Property does not have Drive folder" },
          { status: 404 }
        )
      }

      driveFolderId = property.driveFolderId
    }

    if (!driveFolderId) {
      return NextResponse.json(
        { error: "Drive folder ID not found" },
        { status: 404 }
      )
    }

    // Fetch images from Drive
    const images = await getImagesFromDriveFolder(driveFolderId)

    return NextResponse.json({
      success: true,
      images,
      folderId: driveFolderId,
    })
  } catch (error) {
    console.error("Error fetching Drive images:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch images from Drive",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


