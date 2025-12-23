"use client"

import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { SmartChatbot } from "@/components/smart-chatbot"
import { usePathname } from "next/navigation"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isNotFound, setIsNotFound] = useState(false)
  const pathname = usePathname()
  const isListingPage = pathname?.startsWith("/listings/") && pathname !== "/listings"

  useEffect(() => {
    // Check if we're on a 404 page by looking for the data attribute
    const checkNotFound = () => {
      const notFoundElement = document.querySelector('[data-not-found-page="true"]')
      setIsNotFound(!!notFoundElement)
    }

    // Check immediately
    checkNotFound()

    // Also check after a short delay to ensure DOM is ready
    const timeout = setTimeout(checkNotFound, 100)

    // Use MutationObserver to watch for changes
    const observer = new MutationObserver(checkNotFound)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [])

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {!isNotFound && <Navbar />}
        <main className="flex-grow">{children}</main>
        {!isNotFound && <Footer />}
      </div>
      {!isNotFound && !isListingPage && <SmartChatbot />}
    </>
  )
}

