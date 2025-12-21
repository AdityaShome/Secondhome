"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Loader2, Calendar, User, ExternalLink, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface NewsArticle {
  id: string
  title: string
  excerpt: string
  image: string
  date: string
  author: string
  category: string
  source: string
  url: string
  publishedAt: string
  upvotes?: number
  comments?: number
  content?: string
}

export default function BlogPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchNews = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      // Fetch from community-based blog posts API (Reddit, forums)
      const response = await fetch("/api/blog-posts?pageSize=12")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch blog posts")
      }

      const data = await response.json()
      setArticles(data.articles || [])
      
      if (showRefreshing) {
        toast({
          title: "News Updated",
          description: "Latest articles have been loaded.",
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load news articles"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Second Home Blog</h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto text-orange-50">
            Real experiences, tips, and insights about PGs, flats, and student accommodation in India
          </p>
          <div className="mt-6">
            <Button
              onClick={() => fetchNews(true)}
              disabled={isRefreshing}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh News
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-600 text-lg">Loading latest articles...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Unable to Load News</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => fetchNews()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                Try Again
              </Button>
            </div>
            <div className="mt-8 text-gray-600">
              <p className="mb-4">Blog posts are fetched from public communities like Reddit.</p>
              <p className="text-sm">
                Content is sourced from Indian subreddits and forums about PGs, flats, and student accommodation.
              </p>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">No articles found at the moment.</p>
            <Button onClick={() => fetchNews()} variant="outline" className="mt-4">
              Refresh
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {articles.map((article) => (
                <Card
                  key={article.id}
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-gray-200"
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    <Image
                      src={article.image || "/placeholder.svg?height=400&width=600"}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=400&width=600"
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {article.category}
                      </span>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {article.date}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {article.author}
                      </span>
                    </div>
                    <CardTitle className="text-lg md:text-xl line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {article.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                      <span>Source: {article.source}</span>
                      {"upvotes" in article && article.upvotes !== undefined && (
                        <span className="flex items-center gap-1">
                          ⬆️ {article.upvotes}
                        </span>
                      )}
                      {"comments" in article && article.comments !== undefined && (
                        <span className="flex items-center gap-1">
                          💬 {article.comments}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm line-clamp-3">{article.excerpt}</p>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                      asChild
                    >
                      <Link href={`/blog/${article.id}`}>Read More</Link>
                    </Button>
                    {article.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-orange-600 hover:bg-orange-50"
                        asChild
                      >
                        <a href={article.url} target="_blank" rel="noopener noreferrer" aria-label="Open original article">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Newsletter Subscription */}
            <div className="mt-16 text-center bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-8 md:p-12 border border-orange-200">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">Subscribe to Our Newsletter</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Get the latest updates on student accommodation, real estate trends, and helpful tips delivered to your inbox.
              </p>
              <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 px-4 py-3 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6">
                  Subscribe
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
