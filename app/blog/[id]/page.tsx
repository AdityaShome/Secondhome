"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, User, Tag, Facebook, Twitter, Linkedin, ExternalLink, Loader2 } from "lucide-react"
import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"

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
  content?: string
}

export default function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const articleId = resolvedParams.id
  const articleUrl = searchParams.get("url") || ""

  useEffect(() => {
    const fetchArticle = async () => {
      setIsLoading(true)
      try {
        // Check if it's a database post (MongoDB ObjectId format)
        if (articleId && articleId.length === 24 && /^[0-9a-fA-F]{24}$/.test(articleId)) {
          // It's a database post, fetch from database
          const response = await fetch(`/api/blog-posts/${articleId}`)
          if (response.ok) {
            const data = await response.json()
            setArticle(data)
            setIsLoading(false)
            return
          }
        }

        // If we have the article URL from query params, try to find by URL first
        if (articleUrl && articleUrl.trim() !== "") {
          const response = await fetch("/api/blog-posts?pageSize=500")
          if (response.ok) {
            const data = await response.json()
            const foundArticle = data.articles?.find((a: NewsArticle) => 
              a.url === decodeURIComponent(articleUrl) || a.id === articleId
            )
            if (foundArticle) {
              setArticle(foundArticle)
              setIsLoading(false)
              return
            }
          }
        }

        // Try to find by ID
        const findResponse = await fetch(`/api/blog-posts/find?id=${encodeURIComponent(articleId)}`)
        if (findResponse.ok) {
          const foundArticle = await findResponse.json()
          setArticle(foundArticle)
        } else {
          // Fallback: try fetching with large page size and search by ID or URL
          const response = await fetch("/api/blog-posts?pageSize=500")
          if (response.ok) {
            const data = await response.json()
            const foundArticle = data.articles?.find((a: NewsArticle) => 
              a.id === articleId || (articleUrl && a.url === decodeURIComponent(articleUrl))
            )
            if (foundArticle) {
              setArticle(foundArticle)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching article:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchArticle()
  }, [articleId, articleUrl])

  // If it's an external article and we have the URL, show redirect option
  if (!isLoading && article?.url && (article.url.startsWith("http") || article.url.startsWith("https"))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">View Full Article</h2>
          <p className="text-gray-600 mb-6">
            This article is from an external source. Click below to read the full content.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.open(article.url, "_blank")}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Article
            </Button>
            <Button variant="outline" onClick={() => router.push("/blog")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const post = article

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading article...</p>
        </div>
      </div>
    )
  }

  if (!post || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Blog Post Not Found</h1>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link href="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const hasContent = "content" in post && post.content

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-16">
        <div className="container mx-auto px-4">
          <Link
            href="/blog"
            className="inline-flex items-center text-white/90 hover:text-white hover:underline mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-orange-50">
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              <span>{post.date}</span>
            </div>
            <div className="flex items-center">
              <User className="mr-1 h-4 w-4" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center">
              <Tag className="mr-1 h-4 w-4" />
              <span>{post.category}</span>
            </div>
            {"source" in post && post.source && (
              <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
                {post.source}
              </div>
            )}
            {"upvotes" in post && post.upvotes !== undefined && (
              <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
                {post.upvotes} upvotes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Featured Image */}
          <div className="relative h-64 md:h-96 mb-8 rounded-lg overflow-hidden shadow-lg">
            <Image
              src={post.image || "/placeholder.svg?height=600&width=1200"}
              alt={post.title}
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=600&width=1200"
              }}
            />
          </div>

          {/* Article Content */}
          <Card className="mb-8 border-gray-200">
            <CardHeader>
              <CardTitle className="text-2xl mb-4">{post.title}</CardTitle>
              <p className="text-gray-600 text-lg leading-relaxed">{post.excerpt}</p>
            </CardHeader>
            <CardContent>
              {post.content ? (
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{post.content}</div>
                  {post.url && post.url.startsWith("http") && (
                    <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <p className="text-gray-700 mb-4 font-semibold">Read the full article:</p>
                      <Button
                        asChild
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <a href={post.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Full Article
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{post.excerpt}</p>
                  {post.url && post.url.startsWith("http") && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                      <p className="text-gray-700 mb-4">To read the full article, visit the original source:</p>
                      <Button
                        asChild
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <a href={post.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Full Article
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {post.category && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Category</h3>
              <div className="flex flex-wrap gap-2">
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                  {post.category}
                </span>
              </div>
            </div>
          )}

          {/* Social Share */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Share this article</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50">
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button variant="outline" size="sm" className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50">
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button variant="outline" size="sm" className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
