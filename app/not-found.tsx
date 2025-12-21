"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, Search } from "lucide-react"
import { motion } from "framer-motion"

export default function NotFound() {
  return (
    <div 
      data-not-found-page="true"
      className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex items-center justify-center p-4"
    >
      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8"
        >
          {/* 404 Image */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="relative w-full max-w-2xl h-96 md:h-[500px]">
              <Image
                src="/pagenotfound.png"
                alt="Page Not Found"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              Oops! Page Not Found
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              The page you're looking for seems to have wandered off. Don't worry, let's get you back on track!
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button
              asChild
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
            >
              <Link href="/" className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Go to Homepage
              </Link>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-gray-300 hover:border-orange-500 text-gray-700 hover:text-orange-600 font-semibold px-8 py-6 text-lg shadow-md hover:shadow-lg transition-all"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-gray-300 hover:border-orange-500 text-gray-700 hover:text-orange-600 font-semibold px-8 py-6 text-lg shadow-md hover:shadow-lg transition-all"
            >
              <Link href="/listings" className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Browse Properties
              </Link>
            </Button>
          </motion.div>

          {/* Helpful Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="pt-8 border-t border-gray-200"
          >
            <p className="text-sm text-gray-500 mb-4">Popular Pages:</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link
                href="/listings"
                className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
              >
                PGs & Flats
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                href="/verified"
                className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
              >
                Verified Properties
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                href="/messes"
                className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
              >
                Messes
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                href="/map"
                className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
              >
                Map View
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                href="/about"
                className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
              >
                About
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                href="/contact"
                className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
              >
                Contact
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}


