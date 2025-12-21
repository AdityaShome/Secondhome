"use client"

import type React from "react"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Home,
  Menu,
  X,
  Search,
  Bell,
  LayoutDashboard,
  Calendar,
  Building2,
  Heart,
  Settings,
  HelpCircle,
  Trash2,
  LogOut,
  Plus,
  User,
  ListChecks,
  MapPin,
  UtensilsCrossed,
  Info,
  Mail,
  ChevronDown,
  Shield,
} from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SmartSearchModal } from "@/components/smart-search-modal"
import { NotificationPanel } from "@/components/notification-panel"
import { useLanguage } from "@/providers/language-provider"

export default function Navbar() {
  const { t } = useLanguage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
    setIsSearchOpen(false)
  }, [pathname])

  // Fetch unread notification count
  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        try {
          const response = await fetch("/api/notifications?filter=unread&limit=1", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          })
          
          if (response.ok) {
            try {
              const data = await response.json()
              setUnreadCount(data.unreadCount || 0)
            } catch (jsonError) {
              console.error("Error parsing notification response:", jsonError)
              setUnreadCount(0)
            }
          } else {
            // If response is not ok, set count to 0
            setUnreadCount(0)
          }
        } catch (error: any) {
          // Handle network errors gracefully
          if (error.name === "TypeError" && error.message === "Failed to fetch") {
            // Network error - silently fail and set count to 0
            setUnreadCount(0)
          } else {
            console.error("Error fetching unread count:", error)
            setUnreadCount(0)
          }
        }
      }

      fetchUnreadCount()
      // Poll for new notifications every 60 seconds
      const interval = setInterval(fetchUnreadCount, 60000)
      return () => clearInterval(interval)
    } else {
      // Reset count when user logs out
      setUnreadCount(0)
    }
  }, [user])

  const navLinks = [
    { href: "/listings", label: t("nav.listings"), icon: Building2 },
    { href: "/verified", label: t("nav.verified"), icon: Shield },
    { href: "/messes", label: t("nav.messes"), icon: UtensilsCrossed },
    { href: "/map", label: t("nav.map"), icon: MapPin },
    { href: "/about", label: t("nav.about"), icon: Info },
    { href: "/contact", label: t("nav.contact"), icon: Mail },
  ]

  const handleLogout = async () => {
    await logout()
    toast({
      title: "Logged out successfully",
      description: "Come back soon!",
    })
    router.push("/")
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      })

      if (response.ok) {
        await logout()
        toast({
          title: "Account deleted",
          description: "Your account has been permanently deleted.",
        })
        router.push("/")
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete account",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 ${
          isScrolled
            ? "bg-white shadow-md"
            : "bg-white border-b border-gray-200"
        }`}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Second <span className="text-orange-500">Home</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-700 hover:text-orange-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className="rounded-full hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-all"
            >
              <Search className="h-5 w-5" />
            </Button>

            {user ? (
              <>
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  onClick={() => setIsNotificationOpen(true)}
                  className="relative rounded-full hover:bg-gray-100 text-gray-700"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 rounded-full hover:bg-gray-100 px-3 py-2"
                    >
                      <Avatar className="h-8 w-8 border-2 border-orange-200">
                        <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                        <AvatarFallback className="bg-orange-500 text-white font-bold text-sm">
                          {user.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:block text-sm font-semibold text-gray-900 max-w-[100px] truncate">
                        {user.name?.split(" ")[0] || "User"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 bg-white border border-gray-200 shadow-xl z-[100000]">
                    {/* User Info */}
                    <DropdownMenuLabel className="p-4 pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-orange-200">
                          <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                          <AvatarFallback className="bg-orange-500 text-white font-bold text-lg">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-600 truncate">{user.email}</p>
                          {user.role && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                              {user.role === "admin" ? "Admin" : user.role === "owner" ? "Property Owner" : "Student"}
                            </span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-200" />

                    {/* Menu Items */}
                    <DropdownMenuItem asChild className="text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Link href="/profile" className="flex items-center gap-3 w-full px-4 py-2">
                        <User className="h-4 w-4 text-gray-600" />
                        <span>My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Link href="/profile?tab=overview" className="flex items-center gap-3 w-full px-4 py-2">
                        <LayoutDashboard className="h-4 w-4 text-gray-600" />
                        <span>{t("nav.dashboard")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Link href="/profile?tab=bookings" className="flex items-center gap-3 w-full px-4 py-2">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span>{t("nav.bookings")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Link href="/favorites" className="flex items-center gap-3 w-full px-4 py-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>{t("nav.favorites")}</span>
                      </Link>
                    </DropdownMenuItem>

                    {(user.role === "owner" || user.role === "admin") && (
                      <>
                        <DropdownMenuSeparator className="bg-gray-200" />
                        <DropdownMenuItem asChild className="text-gray-700 hover:bg-gray-50 cursor-pointer">
                          <Link href="/profile?tab=properties" className="flex items-center gap-3 w-full px-4 py-2">
                            <Building2 className="h-4 w-4 text-gray-600" />
                            <span>{t("nav.myProperties")}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="text-gray-700 hover:bg-gray-50 cursor-pointer">
                          <Link href="/list-property" className="flex items-center gap-3 w-full px-4 py-2">
                            <Plus className="h-4 w-4 text-gray-600" />
                            <span>{t("nav.listProperty")}</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    {user.role === "admin" && (
                      <>
                        <DropdownMenuSeparator className="bg-gray-200" />
                        <DropdownMenuItem asChild className="text-gray-700 hover:bg-gray-50 cursor-pointer">
                          <Link href="/profile?tab=admin" className="flex items-center gap-3 w-full px-4 py-2">
                            <ListChecks className="h-4 w-4 text-gray-600" />
                            <span>{t("nav.admin")}</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator className="bg-gray-200" />
                    <DropdownMenuItem asChild className="text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Link href="/profile?tab=settings" className="flex items-center gap-3 w-full px-4 py-2">
                        <Settings className="h-4 w-4 text-gray-600" />
                        <span>{t("nav.settings")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Link href="/faq" className="flex items-center gap-3 w-full px-4 py-2">
                        <HelpCircle className="h-4 w-4 text-gray-600" />
                        <span>{t("nav.help")}</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-gray-200" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-gray-700 hover:bg-gray-50 cursor-pointer px-4 py-2"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <LogOut className="h-4 w-4 text-gray-600" />
                        <span>{t("nav.logout")}</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 hover:bg-red-50 cursor-pointer px-4 py-2"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Trash2 className="h-4 w-4" />
                        <span>{t("nav.deleteAccount")}</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="ghost"
                  asChild
                  className="text-gray-700 hover:text-orange-600 hover:bg-gray-50 font-semibold"
                >
                  <Link href="/login">{t("nav.login")}</Link>
                </Button>
                <Button
                  asChild
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  <Link href="/signup">{t("nav.signup")}</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-all"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-5 w-5 text-gray-700" /> : <Menu className="h-5 w-5 text-gray-700" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="container px-4 py-4 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-orange-50 text-orange-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                )
              })}
              {!user && (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    {t("nav.signup")}
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Search Modal */}
      <SmartSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Notification Panel */}
      {user && (
        <NotificationPanel
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          unreadCount={unreadCount}
          onUnreadCountChange={setUnreadCount}
        />
      )}

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white border border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This action cannot be undone. This will permanently delete your account and remove all your data from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? t("nav.deleteAccount") + "..." : t("nav.deleteAccount")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
