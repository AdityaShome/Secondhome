/**
 * Google Drive API Service
 * Handles uploading property images to Google Drive
 */

import { google } from "googleapis"
import { Readable } from "stream"

// Google Drive folder IDs
const PG_FOLDER_ID = "1cyjbZTD47pjVS8_wJxhHROCAUQMCOEzd"
const FLAT_FOLDER_ID = "1cyjbZTD47pjVS8_wJxhHROCAUQMCOEzd" // Same folder for now, can be changed

interface UploadImageOptions {
  file: Buffer | File
  fileName: string
  folderId: string
  mimeType: string
}

/**
 * Initialize Google Drive API client
 */
async function getDriveClient() {
  try {
    // Service account credentials from environment
    // Can be either a JSON string or path to JSON file
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS
    
    if (!credentials) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_CREDENTIALS not found in environment variables. Please add your Google Service Account JSON credentials.")
    }

    let credentialsObj
    try {
      // Try parsing as JSON string first
      credentialsObj = typeof credentials === "string" ? JSON.parse(credentials) : credentials
    } catch (parseError) {
      // If parsing fails, it might be a file path
      try {
        const fs = await import("fs")
        const path = await import("path")
        const credPath = path.resolve(process.cwd(), credentials)
        const credFile = fs.readFileSync(credPath, "utf8")
        credentialsObj = JSON.parse(credFile)
      } catch (fileError) {
        throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS. It must be valid JSON or a path to a JSON file.")
      }
    }

    // Validate required fields
    if (!credentialsObj.client_email || !credentialsObj.private_key) {
      throw new Error("Invalid service account credentials. Must include 'client_email' and 'private_key'.")
    }

    const auth = new google.auth.GoogleAuth({
      credentials: credentialsObj,
      scopes: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
      ],
    })

    const authClient = await auth.getClient()
    const drive = google.drive({ version: "v3", auth: authClient as any })

    return drive
  } catch (error) {
    console.error("Error initializing Google Drive client:", error)
    throw error
  }
}

/**
 * Create a folder in Google Drive
 */
export async function createDriveFolder(folderName: string, parentFolderId: string): Promise<string> {
  try {
    const drive = await getDriveClient()

    // Check if folder already exists
    const existingFolders = await drive.files.list({
      q: `name='${folderName}' and '${parentFolderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
    })

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      return existingFolders.data.files[0].id!
    }

    // Create new folder
    const folderResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id, name, webViewLink",
    })

    if (!folderResponse.data.id) {
      throw new Error("Failed to create folder: No ID returned")
    }

    // Make folder accessible (anyone with link can view)
    await drive.permissions.create({
      fileId: folderResponse.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    })

    return folderResponse.data.id
  } catch (error) {
    console.error("Error creating Drive folder:", error)
    throw error
  }
}

/**
 * Upload a single image to Google Drive
 */
export async function uploadImageToDrive(
  file: Buffer,
  fileName: string,
  folderId: string,
  mimeType: string = "image/jpeg"
): Promise<{ fileId: string; webViewLink: string; thumbnailLink?: string }> {
  try {
    const drive = await getDriveClient()

    // Convert buffer to stream
    const bufferStream = new Readable()
    bufferStream.push(file)
    bufferStream.push(null)

    // Upload file
    const fileResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: bufferStream,
      },
      fields: "id, name, webViewLink, thumbnailLink",
    })

    if (!fileResponse.data.id) {
      throw new Error("Failed to upload file: No ID returned")
    }

    // Make file accessible (anyone with link can view)
    await drive.permissions.create({
      fileId: fileResponse.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    })

    // Get direct image link (for embedding)
    const imageLink = `https://drive.google.com/uc?export=view&id=${fileResponse.data.id}`

    return {
      fileId: fileResponse.data.id!,
      webViewLink: fileResponse.data.webViewLink || `https://drive.google.com/file/d/${fileResponse.data.id}/view`,
      thumbnailLink: imageLink,
    }
  } catch (error) {
    console.error("Error uploading image to Drive:", error)
    throw error
  }
}

/**
 * Upload multiple property images to Google Drive
 * Creates a folder with property name and uploads all images there
 */
export async function uploadPropertyImages(
  images: Array<{ file: Buffer; fileName: string; mimeType?: string }>,
  propertyName: string,
  propertyType: "PG" | "Flat"
): Promise<{
  folderId: string
  folderLink: string
  imageLinks: Array<{ fileId: string; thumbnailLink: string; webViewLink: string }>
}> {
  try {
    // Sanitize property name for folder name
    const sanitizedName = propertyName
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50) // Limit folder name length

    // Get appropriate parent folder
    const parentFolderId = propertyType === "PG" ? PG_FOLDER_ID : FLAT_FOLDER_ID

    // Create folder for this property
    const folderId = await createDriveFolder(sanitizedName, parentFolderId)

    // Get folder link
    const drive = await getDriveClient()
    const folderInfo = await drive.files.get({
      fileId: folderId,
      fields: "webViewLink",
    })
    const folderLink = folderInfo.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`

    // Upload all images
    const imageLinks = await Promise.all(
      images.map(async (image, index) => {
        const fileName = `${sanitizedName}_${index + 1}.${image.fileName.split(".").pop() || "jpg"}`
        return await uploadImageToDrive(
          image.file,
          fileName,
          folderId,
          image.mimeType || "image/jpeg"
        )
      })
    )

    return {
      folderId,
      folderLink,
      imageLinks,
    }
  } catch (error) {
    console.error("Error uploading property images to Drive:", error)
    throw error
  }
}

/**
 * Get all images from a Drive folder
 */
export async function getImagesFromDriveFolder(folderId: string): Promise<Array<{
  fileId: string
  name: string
  thumbnailLink: string
  webViewLink: string
}>> {
  try {
    const drive = await getDriveClient()

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
      fields: "files(id, name, webViewLink, thumbnailLink)",
      orderBy: "name",
    })

    if (!response.data.files) {
      return []
    }

    return response.data.files.map((file) => ({
      fileId: file.id!,
      name: file.name || "",
      thumbnailLink: `https://drive.google.com/uc?export=view&id=${file.id}`,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    }))
  } catch (error) {
    console.error("Error fetching images from Drive folder:", error)
    throw error
  }
}

