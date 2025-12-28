import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { uploadPropertyImages } from "@/lib/google-drive"

/**
 * Upload property images to Google Drive
 * This endpoint receives images and uploads them to Drive, then returns Drive links
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const files = formData.getAll("images") as File[]
    const propertyName = formData.get("propertyName") as string
    const propertyType = formData.get("propertyType") as "PG" | "Flat"

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    if (!propertyName || !propertyType) {
      return NextResponse.json(
        { error: "Property name and type are required" },
        { status: 400 }
      )
    }

    // Convert files to buffers
    const imageBuffers = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        return {
          file: buffer,
          fileName: file.name,
          mimeType: file.type,
        }
      })
    )

    // Upload to Google Drive
    const driveResult = await uploadPropertyImages(
      imageBuffers,
      propertyName,
      propertyType
    )

    return NextResponse.json({
      success: true,
      folderId: driveResult.folderId,
      folderLink: driveResult.folderLink,
      imageLinks: driveResult.imageLinks,
      // For backward compatibility, also return thumbnail links as image URLs
      imageUrls: driveResult.imageLinks.map((img) => img.thumbnailLink),
    })
  } catch (error) {
    console.error("Error uploading to Google Drive:", error)
    return NextResponse.json(
      {
        error: "Failed to upload images to Google Drive",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


