/**
 * Helper functions for property images
 * Handles both Drive images and regular image URLs
 */

export interface PropertyImage {
  url: string
  thumbnailUrl?: string
  webViewLink?: string
}

/**
 * Get image URLs from a property
 * Prioritizes Drive images if available, falls back to regular images array
 */
export function getPropertyImages(property: any): PropertyImage[] {
  // If property has Drive images, use those
  if (property.driveImageLinks && property.driveImageLinks.length > 0) {
    return property.driveImageLinks.map((img: any) => ({
      url: img.thumbnailLink || img.webViewLink,
      thumbnailUrl: img.thumbnailLink,
      webViewLink: img.webViewLink,
    }))
  }

  // Fallback to regular images array
  if (property.images && property.images.length > 0) {
    return property.images.map((url: string) => ({
      url,
      thumbnailUrl: url,
    }))
  }

  // Default placeholder
  return [{ url: "/placeholder.jpg" }]
}

/**
 * Get the primary image URL for a property
 */
export function getPrimaryImageUrl(property: any): string {
  const images = getPropertyImages(property)
  return images[0]?.url || "/placeholder.jpg"
}

/**
 * Check if property uses Drive images
 */
export function usesDriveImages(property: any): boolean {
  return !!(property.driveFolderId && property.driveImageLinks && property.driveImageLinks.length > 0)
}


