"use client"

import Image from "next/image"
import { CheckCircle2, Wifi, Video, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface VerifiedBadgeProps {
  property: {
    verificationStatus?: "pending" | "verified" | "rejected"
    executiveVisit?: {
      checks?: {
        wifiTested?: boolean
        wifiSpeed?: string
        rawVideoCheck?: boolean
      }
    }
  }
  size?: "sm" | "md" | "lg"
  showDetails?: boolean
  className?: string
}

export function VerifiedBadge({ property, size = "md", showDetails = false, className }: VerifiedBadgeProps) {
  const isVerified = property.verificationStatus === "verified"
  const isPending = property.verificationStatus === "pending"
  const checks = property.executiveVisit?.checks

  if (!isVerified && !isPending) {
    return null
  }

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }

  if (isVerified) {
    return (
      <div className={cn("relative inline-block", className)}>
        {/* Official Verified Badge Image */}
        <Image
          src="/sechome_verification.png"
          alt="Verified by Second Home"
          width={size === "sm" ? 64 : size === "md" ? 96 : 128}
          height={size === "sm" ? 64 : size === "md" ? 96 : 128}
          className={cn("object-contain", sizeClasses[size])}
          priority
        />
        
        {/* Show check details if available and requested */}
        {showDetails && checks && (
          <div className="mt-2 space-y-1 text-xs">
            {checks.wifiTested && checks.wifiSpeed && (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="h-3 w-3" />
                <span>WiFi: {checks.wifiSpeed}</span>
              </div>
            )}
            {checks.rawVideoCheck && (
              <div className="flex items-center gap-1 text-green-600">
                <Video className="h-3 w-3" />
                <span>Raw Video Checked</span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (isPending) {
    return (
      <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100 border border-yellow-300", className)}>
        <Shield className="h-4 w-4 text-yellow-600 animate-pulse" />
        <span className="text-xs font-medium text-yellow-700">Verification Pending</span>
      </div>
    )
  }

  return null
}



