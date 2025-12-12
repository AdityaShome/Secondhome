"use client"

import React, { useState } from "react"
import { X, ExternalLink, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, MessageSquare, CheckCircle, XCircle, Maximize2, Minimize2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface CommunityReviewsModalProps {
  isOpen: boolean
  onClose: () => void
  locationName: string
  address?: string
  type?: string
}

interface ReviewAnalysis {
  summary: string
  sentiment: "positive" | "negative" | "mixed" | "neutral"
  keyPoints: string[]
  warnings: string[]
  recommendations: string[]
  prosCons?: {
    pros: string[]
    cons: string[]
  }
  reviewCount: number
  sources: Array<{
    subreddit: string
    url: string
    score: number
    title: string
    preview?: string
  }>
  rawMode?: boolean
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
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchReviews = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📡 Fetching community reviews for:', locationName)
      const response = await fetch("/api/community-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationName, address, type })
      })
      
      const data = await response.json()
      console.log('📦 Received data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch reviews")
      }
      
      setAnalysis(data.analysis)
    } catch (err) {
      console.error('❌ Error fetching reviews:', err)
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (isOpen) {
      // Reset state when location changes
      setAnalysis(null)
      setError(null)
      fetchReviews()
    }
  }, [isOpen, locationName])

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, x: isExpanded ? 100 : 0, scale: isExpanded ? 1 : 0.95, y: isExpanded ? 0 : 20 }}
            animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, x: isExpanded ? 100 : 0, scale: isExpanded ? 1 : 0.95, y: isExpanded ? 0 : 20 }}
            className={`fixed bg-white shadow-2xl z-[100001] overflow-hidden flex flex-col transition-all duration-300 ${
              isExpanded 
                ? 'top-0 right-0 bottom-0 w-full md:w-[600px] lg:w-[700px] rounded-none' 
                : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl max-h-[90vh] rounded-2xl'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 flex items-start justify-between flex-shrink-0">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-bold text-white">Community Reviews</h2>
                </div>
                <p className="text-orange-100 text-sm">
                  Authentic insights from Reddit communities (AI-powered by Groq)
                </p>
                <p className="text-white font-semibold mt-2 truncate">{locationName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title={isExpanded ? "Minimize" : "Expand to sidebar"}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-5 h-5 text-white" />
                  ) : (
                    <Maximize2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 font-medium">Searching Reddit communities...</p>
                  <p className="text-gray-400 text-sm mt-1">Analyzing authentic reviews</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <p className="text-red-800 font-semibold mb-2">Error Loading Reviews</p>
                  <p className="text-red-600 text-sm">{error}</p>
                  <button
                    onClick={fetchReviews}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {analysis && !loading && (
                <div className="space-y-6">
                  {/* Sentiment Badge */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getSentimentColor(analysis.sentiment)}`}>
                    {getSentimentIcon(analysis.sentiment)}
                    <span className="font-semibold capitalize">{analysis.sentiment} Sentiment</span>
                    <span className="text-sm opacity-75">• {analysis.reviewCount} discussions found</span>
                  </div>

                  {/* Summary */}
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-orange-600" />
                      Summary
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                    {analysis.reviewCount === 0 && (
                      <div className="mt-4 text-sm text-gray-600 bg-white/70 p-4 rounded-lg border border-orange-200">
                        <p className="font-medium mb-2">💡 No specific reviews found, but you can:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Search for "{locationName}" directly on <a href={`https://www.reddit.com/search/?q=${encodeURIComponent(locationName)}`} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">Reddit</a></li>
                          <li>Check student groups and local community forums</li>
                          <li>Visit the location to get firsthand experience</li>
                          <li>Read reviews from verified tenants on our platform</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Pros & Cons */}
                  {analysis.prosCons && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Pros */}
                      {analysis.prosCons.pros.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                          <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            Positives
                          </h3>
                          <ul className="space-y-2">
                            {analysis.prosCons.pros.map((pro, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Cons */}
                      {analysis.prosCons.cons.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                          <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                            <XCircle className="w-5 h-5" />
                            Concerns
                          </h3>
                          <ul className="space-y-2">
                            {analysis.prosCons.cons.map((con, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-red-800">
                                <span className="text-red-600 mt-0.5">⚠</span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key Points */}
                  {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                      <h3 className="font-bold text-gray-900 mb-3">Key Insights</h3>
                      <ul className="space-y-2">
                        {analysis.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {analysis.warnings && analysis.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5">
                      <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Red Flags & Warnings
                      </h3>
                      <ul className="space-y-2">
                        {analysis.warnings.map((warning, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-yellow-800">
                            <span className="text-yellow-600">⚠️</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                      <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-orange-600" />
                        Community Tips
                      </h3>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-orange-800">
                            <span className="text-orange-600">💡</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sources */}
                  {analysis.sources && analysis.sources.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <ExternalLink className="w-5 h-5" />
                      Sources ({analysis.sources.length})
                    </h3>
                    <div className="space-y-3">
                      {analysis.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-white border border-gray-200 hover:border-orange-300 rounded-lg p-4 transition-all hover:shadow-md group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                                  r/{source.subreddit}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {source.score} upvotes
                                </span>
                              </div>
                              <p className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-orange-600">
                                {source.title}
                              </p>
                              {source.preview && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {source.preview}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-600 flex-shrink-0" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Disclaimer */}
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-xs text-gray-600">
                    <strong className="text-gray-900">Disclaimer:</strong> These reviews are sourced from public Reddit discussions and analyzed by AI. 
                    While we strive for accuracy, always verify important details and conduct your own research before making decisions.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
