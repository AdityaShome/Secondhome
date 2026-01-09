"use client"

import { useState, useEffect, useRef } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

interface LikeButtonProps {
  itemType: "property" | "mess"
  itemId: string
  className?: string
  size?: "sm" | "md" | "lg"
  appearance?: "default" | "overlay"
}

export function LikeButton({ itemType, itemId, className = "", size = "md", appearance = "default" }: LikeButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Size mappings
  const sizeMap = {
    sm: {
      button: "h-8 w-8",
      icon: "h-4 w-4",
      text: "text-xs",
    },
    md: {
      button: "h-10 w-10",
      icon: "h-5 w-5",
      text: "text-sm",
    },
    lg: {
      button: "h-12 w-12",
      icon: "h-6 w-6",
      text: "text-base",
    },
  }

  useEffect(() => {
    const fetchLikeStatus = async () => {
      try {
        const response = await fetch(
          `/api/likes?itemType=${itemType}&itemId=${itemId}${user ? `&userId=${user.id}` : ""}`,
        )

        if (!response.ok) throw new Error("Failed to fetch like status")

        const data = await response.json()
        setLiked(data.userLiked)
        setLikeCount(data.likeCount)
      } catch (error) {
        console.error("Error fetching like status:", error)
      }
    }

    fetchLikeStatus()
  }, [itemType, itemId, user])

  const handleMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false)
    }, 300)
  }

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to like this item",
        variant: "destructive",
      })

      const redirectPath = `${pathname || "/"}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)
      return
    }

    setIsLoading(true)
    setIsAnimating(true)

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemType,
          itemId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Failed to process like (${response.status})`)
      }

      const data = await response.json()
      setLiked(data.liked)
      setLikeCount(data.likeCount)

      // Show success toast
      if (data.liked) {
        toast({
          title: "Saved!",
          description: "Added to your favorites.",
        })
      } else {
        toast({
          title: "Removed",
          description: "Removed from your favorites.",
        })
      }

      // Show confetti animation if liked
      if (data.liked && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2

        // Create confetti effect
        for (let i = 0; i < 30; i++) {
          const particle = document.createElement("div")
          particle.className = "absolute rounded-full pointer-events-none"
          particle.style.width = `${Math.random() * 8 + 4}px`
          particle.style.height = particle.style.width
          particle.style.background = `hsl(${Math.random() * 40 + 340}, 100%, ${Math.random() * 30 + 60}%)`
          particle.style.position = "fixed"
          particle.style.zIndex = "9999"
          particle.style.left = `${x}px`
          particle.style.top = `${y}px`
          document.body.appendChild(particle)

          const angle = Math.random() * Math.PI * 2
          const velocity = Math.random() * 6 + 3
          const tx = x + Math.cos(angle) * (Math.random() * 100 + 50)
          const ty = y + Math.sin(angle) * (Math.random() * 100 + 50)

          const animation = particle.animate(
            [
              { transform: "translate(0, 0) scale(1)", opacity: 1 },
              { transform: `translate(${tx - x}px, ${ty - y}px) scale(0)`, opacity: 0 },
            ],
            {
              duration: Math.random() * 1000 + 500,
              easing: "cubic-bezier(0.1, 0.8, 0.2, 1)",
            },
          )

          animation.onfinish = () => {
            particle.remove()
          }
        }
      }
    } catch (error) {
      console.error("Error liking item:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to process your like. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      // Revert the optimistic update
      setLiked((prev) => !prev)
    } finally {
      setIsLoading(false)

      // Reset animation state after animation completes
      setTimeout(() => {
        setIsAnimating(false)
      }, 1000)
    }
  }

  return (
    <div
      className={`flex items-center gap-1.5 relative ${
        appearance === "overlay" ? "rounded-full bg-white/85 backdrop-blur-sm shadow-sm px-1 py-1" : ""
      } ${className}`}
    >
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className={`relative rounded-full ${sizeMap[size].button} flex-shrink-0 p-0 shadow-none ${
          appearance === "overlay"
            ? liked
              ? "bg-red-50/80 hover:bg-red-100/80"
              : "bg-transparent hover:bg-white/60"
            : liked
              ? "bg-red-50 hover:bg-red-100"
              : "bg-transparent hover:bg-gray-100"
        }`}
        onClick={handleLike}
        disabled={isLoading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={liked ? "Unlike" : "Like"}
      >
        <Heart
          className={`${sizeMap[size].icon} ${
            liked ? "fill-red-500 text-red-500" : "text-gray-600"
          } transition-colors duration-300`}
        />
        <AnimatePresence>
          {isAnimating && liked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Heart className={`${sizeMap[size].icon} fill-red-500 text-red-500`} />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50"
          >
            {liked ? "Unlike" : "Like"}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.span
        key={likeCount}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${sizeMap[size].text} font-medium whitespace-nowrap ${appearance === "overlay" ? "text-gray-900" : "text-gray-700"}`}
      >
        {likeCount}
      </motion.span>
    </div>
  )
}
