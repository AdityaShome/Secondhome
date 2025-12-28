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
    // Extract credentials for logging and error messages
    let cloudName = ""
    let apiKey = ""
    let apiSecret = ""

    // First try to use CLOUDINARY_URL if available (preferred method)
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({
        cloudinary_url: process.env.CLOUDINARY_URL,
        signature_algorithm: 'sha256', // Explicitly set to SHA-256
      })
      // Extract credentials from URL for logging
      try {
        const urlMatch = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/)
        if (urlMatch) {
          apiKey = urlMatch[1]
          apiSecret = urlMatch[2]
          cloudName = urlMatch[3]
        }
      } catch (e) {
        // If parsing fails, use individual env vars as fallback
        cloudName = process.env.CLOUDINARY_CLOUD_NAME || ""
        apiKey = process.env.CLOUDINARY_API_KEY || ""
        apiSecret = process.env.CLOUDINARY_API_SECRET || ""
      }
      console.log("✅ Cloudinary configured via CLOUDINARY_URL")
    } else {
      // Fallback to individual credentials
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
      cloudName = cloudinaryConfig.cloud_name?.trim() || ""
      apiKey = cloudinaryConfig.api_key?.trim() || ""
      apiSecret = cloudinaryConfig.api_secret?.trim() || ""

      // Verify credentials format (API secrets can vary in length, typically 27-28 characters)
      if (apiSecret.length < 20 || apiSecret.length > 50) {
        console.error("❌ API Secret length seems incorrect. Got:", apiSecret.length)
        return NextResponse.json({ 
          error: "Cloudinary API Secret has incorrect length. Please verify your credentials.",
          details: `API Secret length is ${apiSecret.length}. Please check your .env.local file.`
        }, { status: 400 })
      }

      // Configure Cloudinary with explicit signature algorithm
      // Some accounts require SHA-256 instead of default SHA-1
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        signature_algorithm: 'sha256', // Explicitly set to SHA-256
      })
    }

    // Log configuration (without exposing secret)
    console.log("✅ Cloudinary configured:", {
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret_length: apiSecret.length,
      api_secret_first_char: apiSecret.charAt(0),
      api_secret_last_char: apiSecret.charAt(apiSecret.length - 1),
      configured_via: process.env.CLOUDINARY_URL ? "CLOUDINARY_URL" : "individual_vars",
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

      // Method 1: Try upload_stream with folder only (no public_id to avoid signature issues)
      try {
        result = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: folder,
              resource_type: "auto",
              // Don't include public_id here - it causes signature issues
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

        // Method 2: Try base64 upload with folder only
        try {
          const base64String = buffer.toString('base64')
          const dataUri = `data:${file.type || 'image/jpeg'};base64,${base64String}`
          
          result = await cloudinary.uploader.upload(dataUri, {
            folder: folder,
            resource_type: "auto",
            // Don't include public_id - it causes signature issues
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
            // All methods failed - this means the API secret is definitely wrong
            console.error("❌ All upload methods failed - API Secret is incorrect:", {
              method1: uploadError?.message,
              method2: error2?.message,
              method3: error3?.message,
              cloud_name: cloudName,
              api_key: apiKey,
            })
            
            // Provide very specific error message
            throw new Error(
              `CLOUDINARY_API_SECRET is incorrect. ` +
              `The secret '${apiSecret.substring(0, 5)}...${apiSecret.substring(apiSecret.length - 3)}' ` +
              `does not match Cloud Name '${cloudName}' and API Key '${apiKey}'. ` +
              `Please go to https://console.cloudinary.com/settings/api-keys and copy the EXACT API Secret for this account.`
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
  } catch (error: any) {
    console.error("Error uploading files:", error)
    
    // Provide specific error messages
    const errorMessage = error?.message || "Failed to upload files"
    
    // Check for signature errors
    if (errorMessage.includes("Invalid Signature") || errorMessage.includes("signature")) {
      return NextResponse.json({ 
        error: "Cloudinary authentication failed. Please verify your API credentials (Cloud Name, API Key, and API Secret) match in your Cloudinary dashboard.",
        details: "The API secret doesn't match your Cloud Name and API Key. Please check https://console.cloudinary.com/settings/api-keys"
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error?.details || "Please check your Cloudinary configuration and try again."
    }, { status: 500 })
  }
}
