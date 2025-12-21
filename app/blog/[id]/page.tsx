"use client"

import { CardFooter } from "@/components/ui/card"
import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, User, Tag, Facebook, Twitter, Linkedin, ExternalLink, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// Sample blog posts data (static content)
const blogPosts = {
  "1": {
    id: "1",
    title: "How to Find the Perfect PG Accommodation Near Your College",
    content: `
      <p>Finding the right PG accommodation as a student can be a daunting task, especially if you're moving to a new city. Your accommodation will be your home away from home for the next few years, so it's important to make the right choice. Here are some tips to help you find the perfect PG that feels like home:</p>
      
      <h2>1. Location is Key</h2>
      <p>The proximity to your college should be your primary consideration. Look for accommodations that are within walking distance or have good public transport connectivity to your college. This will save you time and money on commuting.</p>
      
      <h2>2. Budget Considerations</h2>
      <p>Determine your budget before starting your search. Remember to factor in additional costs like security deposit, maintenance charges, and utility bills. Be realistic about what you can afford on a monthly basis.</p>
      
      <h2>3. Facilities and Amenities</h2>
      <p>Make a list of must-have amenities based on your lifestyle and preferences. Common amenities to consider include:</p>
      <ul>
        <li>Wi-Fi connectivity</li>
        <li>Meals provided (frequency and quality)</li>
        <li>Laundry services</li>
        <li>Power backup</li>
        <li>Security measures</li>
        <li>Attached bathroom or shared</li>
        <li>Furniture and appliances provided</li>
        <li>Common areas for studying and socializing</li>
      </ul>
      
      <h2>4. Visit Before Deciding</h2>
      <p>Always visit the PG in person before making a decision. This gives you a chance to assess the cleanliness, meet other residents, check the condition of facilities, and get a feel for the neighborhood.</p>
      
      <h2>5. Check the House Rules</h2>
      <p>Every PG has its own set of rules regarding visitors, curfew times, noise levels, etc. Make sure you're comfortable with these rules before committing.</p>
      
      <h2>6. Talk to Current Residents</h2>
      <p>If possible, speak with current residents to get honest feedback about the PG, the owner/manager, and the overall living experience.</p>
      
      <h2>7. Check Reviews Online</h2>
      <p>Look for reviews and ratings online to get a better understanding of the PG's reputation. Platforms like Second Home provide verified reviews from actual residents.</p>
      
      <h2>8. Understand the Agreement Terms</h2>
      <p>Read the rental agreement carefully before signing. Pay attention to the notice period, deposit refund policy, and any hidden charges.</p>
      
      <h2>9. Consider the Neighborhood</h2>
      <p>Evaluate the neighborhood for safety, convenience, and accessibility to essential services like grocery stores, medical facilities, and ATMs.</p>
      
      <h2>10. Trust Your Instincts</h2>
      <p>Finally, trust your gut feeling. If something doesn't feel right about a place, it's better to keep looking rather than regret your decision later.</p>
      
      <p>Finding the perfect PG accommodation takes time and effort, but it's worth it for your comfort and peace of mind during your college years. Use platforms like Second Home to streamline your search and find verified accommodations that meet your requirements.</p>
    `,
    image: "/placeholder.svg?height=600&width=1200",
    date: "April 2, 2025",
    author: "Rahul Sharma",
    category: "Accommodation Tips",
    tags: ["PG Accommodation", "Student Housing", "College Life", "Rental Tips"],
  },
}

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

export default function BlogPostPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [newsArticle, setNewsArticle] = useState<NewsArticle | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const staticPost = blogPosts[params.id as keyof typeof blogPosts]

  // Check if it's a community article (starts with "reddit-" or "news-")
  const isNewsArticle = params.id.startsWith("reddit-") || params.id.startsWith("news-")

  useEffect(() => {
    if (isNewsArticle) {
      // Fetch the article from the blog posts API (Reddit)
      setIsLoading(true)
      fetch("/api/blog-posts?pageSize=100")
        .then((res) => res.json())
        .then((data) => {
          const article = data.articles?.find((a: NewsArticle) => a.id === params.id)
          if (article) {
            setNewsArticle(article)
          }
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
        })
    }
  }, [params.id, isNewsArticle])

  // If it's a news article and we have the URL, redirect to the original source
  if (isNewsArticle && newsArticle?.url) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Redirecting to Article</h2>
          <p className="text-gray-600 mb-6">
            You're being redirected to the original article source to read the full content.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.open(newsArticle.url, "_blank")}
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

  const post = staticPost || newsArticle

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

  if (!post) {
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
                ⬆️ {post.upvotes} upvotes
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
              {hasContent ? (
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{post.content}</div>
                  {"url" in post && post.url && post.url !== "#" && (
                    <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <p className="text-gray-700 mb-4 font-semibold">Read the full discussion on Reddit:</p>
                      <Button
                        asChild
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <a href={post.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on Reddit
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{post.excerpt}</p>
                  {"url" in post && post.url && post.url !== "#" && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                      <p className="text-gray-700 mb-4">To read the full discussion, visit the original post:</p>
                      <Button
                        asChild
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <a href={post.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on Reddit
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {"tags" in post && post.tags && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
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
