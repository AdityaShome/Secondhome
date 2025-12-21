"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Calendar,
  Home,
  CreditCard,
  Gift,
  MessageSquare,
  Star,
  AlertCircle,
  Filter,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  _id: string
  type: "booking" | "property" | "offer" | "review" | "system" | "payment" | "message"
  title: string
  message: string
  link?: string
  icon?: string
  image?: string
  read: boolean
  priority: "low" | "medium" | "high"
  metadata?: any
  createdAt: string
}

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
}

const typeIcons = {
  booking: Calendar,
  property: Home,
  offer: Gift,
  review: Star,
  system: AlertCircle,
  payment: CreditCard,
  message: MessageSquare,
}

const typeColors = {
  booking: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  property: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  offer: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  review: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  system: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  payment: "bg-green-500/10 text-green-600 border-green-500/30",
  message: "bg-orange-500/10 text-orange-600 border-orange-500/30",
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [typeFilter, setTypeFilter] = useState<string>("")
  const router = useRouter()
  const { toast } = useToast()

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.append("filter", filter)
      if (typeFilter) params.append("type", typeFilter)

      const response = await fetch(`/api/notifications?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch notifications")

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [filter, typeFilter, toast])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [isOpen, fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      })

      if (!response.ok) throw new Error("Failed to mark as read")

      const data = await response.json()
      setUnreadCount(data.unreadCount || 0)
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      if (!response.ok) throw new Error("Failed to mark all as read")

      const data = await response.json()
      setUnreadCount(data.unreadCount || 0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    } catch (error) {
      console.error("Error marking all as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive",
      })
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete")

      const data = await response.json()
      setUnreadCount(data.unreadCount || 0)
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId))
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      })
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id)
    }

    if (notification.link) {
      router.push(notification.link)
      onClose()
    }
  }

  const IconComponent = typeIcons.booking

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full max-w-md bg-white backdrop-blur-xl border-l border-gray-200 shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                    {unreadCount > 0 && (
                      <p className="text-sm text-orange-600 font-medium">{unreadCount} unread</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-gray-600 hover:text-gray-900 hover:bg-orange-50"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </Button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                  className={`text-xs transition-colors ${
                    filter === "all"
                      ? "bg-orange-500 hover:bg-orange-600 text-white hover:text-white"
                      : "border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  }`}
                >
                  All
                </Button>
                <Button
                  variant={filter === "unread" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("unread")}
                  className={`text-xs transition-colors ${
                    filter === "unread"
                      ? "bg-orange-500 hover:bg-orange-600 text-white hover:text-white"
                      : "border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  }`}
                >
                  Unread
                </Button>
                <Button
                  variant={filter === "read" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("read")}
                  className={`text-xs transition-colors ${
                    filter === "read"
                      ? "bg-orange-500 hover:bg-orange-600 text-white hover:text-white"
                      : "border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  }`}
                >
                  Read
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs ml-auto border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors"
                  >
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-100 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-orange-500" />
                  </div>
                  <p className="text-gray-900 text-lg font-semibold mb-2">No notifications</p>
                  <p className="text-gray-600 text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <AnimatePresence>
                    {notifications.map((notification) => {
                      const IconComponent = typeIcons[notification.type] || Bell
                      const typeColor = typeColors[notification.type] || typeColors.system

                      return (
                        <motion.div
                          key={notification._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          onClick={() => handleNotificationClick(notification)}
                          className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                            notification.read
                              ? "bg-white border-gray-200 hover:border-orange-200 hover:bg-orange-50/50"
                              : "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300 hover:border-orange-400 shadow-md shadow-orange-100"
                          }`}
                        >
                          {/* Unread indicator */}
                          {!notification.read && (
                            <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
                          )}

                          <div className="flex gap-4">
                            {/* Icon */}
                            <div
                              className={`w-12 h-12 rounded-xl ${typeColor} flex items-center justify-center flex-shrink-0`}
                            >
                              <IconComponent className="w-6 h-6" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className={`font-semibold text-sm ${
                                  notification.read ? "text-gray-700" : "text-gray-900"
                                }`}>{notification.title}</h3>
                                <div className="flex items-center gap-2">
                                  {notification.priority === "high" && (
                                    <Badge className="text-[10px] px-1.5 py-0 bg-red-500 text-white">
                                      High
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteNotification(notification._id)
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-500" />
                                  </Button>
                                </div>
                              </div>
                              <p className={`text-sm mb-2 line-clamp-2 ${
                                notification.read ? "text-gray-600" : "text-gray-700"
                              }`}>{notification.message}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                className="w-full border-orange-300 text-gray-700 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600"
                onClick={() => router.push("/dashboard?tab=notifications")}
              >
                View All Notifications
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

