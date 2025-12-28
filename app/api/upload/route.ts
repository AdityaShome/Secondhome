import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { v2 as cloudinary } from "cloudinary"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Configure Cloudinary inside the function to ensure env vars are loaded
    const cloudinaryConfig = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    }

    // Check if Cloudinary is properly configured
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
      console.error("❌ Cloudinary credentials missing:", {
        hasCloudName: !!cloudinaryConfig.cloud_name,
        hasApiKey: !!cloudinaryConfig.api_key,
        hasApiSecret: !!cloudinaryConfig.api_secret,
      })
      return NextResponse.json({ 
        error: "Image upload service not configured. Please contact support." 
      }, { status: 503 })
    }

    // Configure Cloudinary with credentials - do this fresh each time
    const cloudName = cloudinaryConfig.cloud_name?.trim() || ""
    const apiKey = cloudinaryConfig.api_key?.trim() || ""
    const apiSecret = cloudinaryConfig.api_secret?.trim() || ""

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    })

    // Log configuration (without exposing secret)
    console.log("✅ Cloudinary configured:", {
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret_length: apiSecret.length,
      api_secret_first_char: apiSecret.charAt(0),
      api_secret_last_char: apiSecret.charAt(apiSecret.length - 1),
    })

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
      
      // Use different folder based on upload type
      const folder = uploadType === "profile" ? "secondhome/profiles" : "secondhome/properties"
      const publicId = `${folder}/${uniqueId}`

      // Try multiple upload methods to handle signature errors
      let result: any = null
      let uploadError: any = null

      // Method 1: Try upload_stream first
      try {
        result = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              public_id: publicId,
              resource_type: "auto",
            },
            (error, result) => {
              if (error) {
                reject(error)
              } else {
                resolve(result)
              }
            }
          )
          uploadStream.end(buffer)
        })
        console.log("✅ Upload successful (method 1 - stream):", result?.public_id)
      } catch (error: any) {
        uploadError = error
        console.log("⚠️ Method 1 (stream) failed, trying method 2...", error.message)

        // Method 2: Try base64 upload
        try {
          const base64String = buffer.toString('base64')
          const dataUri = `data:${file.type || 'image/jpeg'};base64,${base64String}`
          
          result = await cloudinary.uploader.upload(dataUri, {
            public_id: publicId,
            resource_type: "auto",
          })
          console.log("✅ Upload successful (method 2 - base64):", result?.public_id)
        } catch (error2: any) {
          console.log("⚠️ Method 2 (base64) failed, trying method 3...", error2.message)

          // Method 3: Try without public_id (let Cloudinary generate it)
          try {
            const base64String = buffer.toString('base64')
            const dataUri = `data:${file.type || 'image/jpeg'};base64,${base64String}`
            
            result = await cloudinary.uploader.upload(dataUri, {
              folder: folder,
              resource_type: "auto",
            })
            console.log("✅ Upload successful (method 3 - no public_id):", result?.public_id)
          } catch (error3: any) {
            // All methods failed
            console.error("❌ All upload methods failed:", {
              method1: uploadError?.message,
              method2: error2?.message,
              method3: error3?.message,
            })
            throw new Error(
              `Upload failed: ${error3?.message || uploadError?.message || 'Unknown error'}. ` +
              `Please verify your Cloudinary API credentials are correct.`
            )
          }
        }
      }

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
