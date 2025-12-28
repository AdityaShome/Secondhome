import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { v2 as cloudinary } from "cloudinary"

// Configure Cloudinary - check if credentials exist
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
}

// Only configure if all credentials are present
if (cloudinaryConfig.cloud_name && cloudinaryConfig.api_key && cloudinaryConfig.api_secret) {
  cloudinary.config(cloudinaryConfig)
} else {
  console.warn("⚠️ Cloudinary credentials not fully configured. Check environment variables.")
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if Cloudinary is properly configured
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
      return NextResponse.json({ 
        error: "Image upload service not configured. Please contact support." 
      }, { status: 503 })
    }

    const formData = await req.formData()
    
    // Support both single file upload (field name: "file") and multiple files (field name: "images")
    const singleFile = formData.get("file") as File | null
    const multipleFiles = formData.getAll("images") as File[]
    
    // Check upload type (profile or property)
    const uploadType = formData.get("type") as string | null || "property"
    
    const files = singleFile ? [singleFile] : multipleFiles

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    const uploadedUrls: string[] = []

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Generate a unique filename
      const uniqueId = uuidv4()
      const originalName = file.name
      const extension = originalName.split(".").pop()
      
      // Use different folder based on upload type
      const folder = uploadType === "profile" ? "secondhome/profiles" : "secondhome/properties"
      const publicId = `${folder}/${uniqueId}`

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              public_id: publicId,
              folder: folder,
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error)
              else resolve(result)
            }
          )
          .end(buffer)
      })

      // Use the secure URL from Cloudinary
      uploadedUrls.push(result.secure_url)
    }

    // Return single URL for single file upload, or array for multiple
    if (singleFile) {
      return NextResponse.json({
        url: uploadedUrls[0],
        message: "File uploaded successfully",
      })
    }

    return NextResponse.json({
      message: "Files uploaded successfully",
      imageUrls: uploadedUrls,
    })
  } catch (error) {
    console.error("Error uploading files:", error)
    return NextResponse.json({ error: "Failed to upload files" }, { status: 500 })
  }
}
