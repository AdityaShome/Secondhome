"use client"

import React, { useState, useEffect } from "react"
import { 
  X, ExternalLink, TrendingUp, TrendingDown, AlertTriangle, 
  Lightbulb, MessageSquare, CheckCircle, XCircle, Maximize2, 
  Minimize2, Shield, MapPin, Info, Minus 
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface CommunityReviewsModalProps {
  isOpen: boolean
  onClose: () => void
  locationName: string
  address?: string
  type?: string
}

type ViewState = 'modal' | 'sidebar' | 'minimized'

interface ReviewAnalysis {
  summary: string
  sentiment: "positive" | "negative" | "mixed" | "neutral"
  safety_rating?: "High" | "Medium" | "Low"
  verdict?: string
  found_specific_reviews?: boolean
  context_used?: {
    building: string
    area: string
    city: string
  }
  keyPoints?: string[]
  warnings?: string[]
  recommendations?: string[]
  prosCons?: {
    pros: string[]
    cons: string[]
  }
  source_count: number
  sources: Array<{
    subreddit: string
    url: string
    score: number
    title: string
    relevanceType?: 'specific_building' | 'neighborhood_context'
  }>
}

export default function CommunityReviewsModal({
  isOpen,
  onClose,
  locationName,
  address,
  type
}: CommunityReviewsModalProps) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewState, setViewState] = useState<ViewState>('modal')
  
  // Controls if the bottom-right widget is just a small header (true) or the full list (false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const fetchReviews = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/community-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationName, address, type })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch reviews")
      }
      
      setAnalysis(data.data)
    } catch (err) {
      console.error('❌ Error fetching reviews:', err)
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setAnalysis(null)
      setError(null)
      setViewState('minimized') 
      setIsCollapsed(false)
      fetchReviews()
    }
  }, [isOpen, locationName])

  const getContainerClasses = () => {
    switch (viewState) {
      case 'sidebar':
        return 'fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[700px] rounded-l-xl border-l border-gray-200 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] !translate-x-0 !translate-y-0 !top-0 !left-auto'
      
      case 'minimized':
        if (isCollapsed) {
           // Small pill state
           return 'fixed !bottom-4 !right-4 !top-auto !left-auto w-[320px] h-14 rounded-xl shadow-xl border border-orange-200 bg-white'
        }
        // Expanded "Chat Widget" style state
        // Added flex flex-col explicitly here to ensure layout works
        return 'fixed !bottom-0 !right-0 md:!bottom-4 md:!right-4 !top-auto !left-auto w-full md:w-[400px] max-h-[85vh] md:max-h-[600px] rounded-t-2xl rounded-b-none md:rounded-2xl shadow-2xl border border-orange-200 bg-white flex flex-col'
      
      case 'modal':
      default:
        return 'fixed top-1/2 left-1/2 w-[95vw] max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border border-gray-100 flex flex-col'
    }
  }

  const variants = {
    modal: { opacity: 1, x: "-50%", y: "-50%", scale: 1 },
    sidebar: { opacity: 1, x: 0, y: 0, scale: 1 },
    minimized: { opacity: 1, x: 0, y: 0, scale: 1 },
    hidden: { opacity: 0, scale: 0.9 }
  }

  // Helper functions for colors/icons...
  const getSafetyColor = (rating?: string) => {
    switch (rating?.toLowerCase()) {
      case "high": return "text-green-700 bg-green-100 border-green-200"
      case "medium": return "text-yellow-700 bg-yellow-100 border-yellow-200"
      case "low": return "text-red-700 bg-red-100 border-red-200"
      default: return "text-gray-700 bg-gray-100 border-gray-200"
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600 bg-green-50"
      case "negative": return "text-red-600 bg-red-50"
      case "mixed": return "text-yellow-600 bg-yellow-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return <TrendingUp className="w-5 h-5" />
      case "negative": return <TrendingDown className="w-5 h-5" />
      case "mixed": return <AlertTriangle className="w-5 h-5" />
      default: return <MessageSquare className="w-5 h-5" />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay - only show for modal view */}
          {viewState === 'modal' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100000]"
              onClick={() => setViewState('minimized')}
            />
          )}
          
          <motion.div
            layout 
            initial="hidden"
            animate={viewState}
            exit="hidden"
            variants={variants}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            // Added 'flex flex-col' to the base classes ensuring it always behaves as a flex container
            className={`z-[100001] overflow-hidden flex flex-col transition-all duration-300 bg-white ${getContainerClasses()}`}
          >
          {/* Header */}
          <div 
            className={`bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between flex-shrink-0 cursor-pointer ${isCollapsed ? 'h-full' : ''}`}
            onClick={() => viewState === 'minimized' && setIsCollapsed(!isCollapsed)}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-bold text-sm truncate leading-tight">
                  Community Reviews
                </h2>
                <div className="flex items-center gap-1 text-orange-100 text-xs truncate">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{locationName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-2">
              {viewState === 'minimized' ? (
                  <>
                    {/* No maximize button needed */}
                  </>
              ) : (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewState('minimized'); setIsCollapsed(false); }}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                    title="Minimize to Corner"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setViewState(viewState === 'sidebar' ? 'modal' : 'sidebar'); 
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                    title={viewState === 'sidebar' ? "Center Modal" : "Expand to Sidebar"}
                  >
                    {viewState === 'sidebar' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="p-1.5 hover:bg-red-500/20 hover:text-red-100 rounded-lg text-white transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SCROLL FIX:
            1. Added 'flex-1' to take up remaining space.
            2. Added 'min-h-0' (CRITICAL) to allow flex child to shrink below its content size and trigger scroll.
            3. Added 'overflow-y-auto' for the scrollbar.
          */}
          {(!isCollapsed) && (
            <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 font-medium text-sm">Analyzing discussions...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                  <p className="text-red-800 font-semibold mb-2">Unavailable</p>
                  <p className="text-red-600 text-xs">{error}</p>
                  <button onClick={fetchReviews} className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
                    Try Again
                  </button>
                </div>
              )}

              {analysis && !loading && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  
                  {!analysis.found_specific_reviews && analysis.context_used && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-blue-800 text-sm">General Area Insights</p>
                        <p className="text-blue-700 text-xs mt-1 leading-relaxed">
                          Exact reviews for <span className="font-semibold">{analysis.context_used.building}</span> weren't found. 
                          Showing insights for <span className="font-semibold">{analysis.context_used.area}</span> to help you gauge the vibe.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getSentimentColor(analysis.sentiment)}`}>
                      {getSentimentIcon(analysis.sentiment)}
                      <span className="font-semibold capitalize text-sm">{analysis.sentiment} Vibe</span>
                    </div>

                    {analysis.safety_rating && (
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${getSafetyColor(analysis.safety_rating)}`}>
                        <Shield className="w-3.5 h-3.5" />
                        <span className="font-semibold capitalize text-sm">Safety: {analysis.safety_rating}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <MessageSquare className="w-4 h-4 text-orange-600" />
                      Community Consensus
                    </h3>
                    <p className="text-gray-700 leading-relaxed text-sm">{analysis.summary}</p>
                    
                    {analysis.verdict && (
                      <div className="mt-4 pt-3 border-t border-orange-100">
                        <p className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">The Verdict</p>
                        <p className="text-sm font-medium text-gray-800 italic">"{analysis.verdict}"</p>
                      </div>
                    )}
                  </div>

                  {analysis.prosCons && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {analysis.prosCons.pros?.length > 0 && (
                        <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
                          <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2 text-xs uppercase tracking-wide">
                            <CheckCircle className="w-4 h-4" />
                            Pros
                          </h3>
                          <ul className="space-y-2">
                            {analysis.prosCons.pros.map((pro, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-green-800 leading-snug">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysis.prosCons.cons?.length > 0 && (
                        <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                          <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2 text-xs uppercase tracking-wide">
                            <XCircle className="w-4 h-4" />
                            Cons
                          </h3>
                          <ul className="space-y-2">
                            {analysis.prosCons.cons.map((con, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-red-800 leading-snug">
                                <span className="text-red-600 mt-0.5">•</span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-sm">
                        <Lightbulb className="w-4 h-4 text-indigo-600" />
                        Tips for Students
                      </h3>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-indigo-800">
                            <span className="text-indigo-600 font-bold">→</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.sources && analysis.sources.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">
                        Analyzed {analysis.sources.length} discussions
                      </p>
                      <div className="space-y-2">
                        {analysis.sources.slice(0, 3).map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 rounded-lg transition-colors group"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-[10px] font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 group-hover:border-orange-200 group-hover:text-orange-600">
                                r/{source.subreddit}
                              </span>
                              <span className="text-xs text-gray-700 truncate group-hover:text-orange-700">
                                {source.title}
                              </span>
                            </div>
                            <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-orange-500 flex-shrink-0 ml-2" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}