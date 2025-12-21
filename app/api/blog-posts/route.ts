import { NextResponse } from "next/server"

/**
 * FREE COMMUNITY-BASED BLOG POSTS API
 * 
 * Fetches real posts from public communities (Reddit, forums) about:
 * - PGs (Paying Guest accommodations)
 * - Flats/Apartments
 * - Student accommodation
 * - India-specific content
 * 
 * Uses Reddit API (completely free, no API key needed for public data)
 */

// Indian city subreddits and relevant communities
const REDDIT_SUBREDDITS = [
  "bangalore",
  "mumbai",
  "delhi",
  "hyderabad",
  "pune",
  "chennai",
  "kolkata",
  "ahmedabad",
  "jaipur",
  "indian",
  "IndiaSpeaks",
  "indiasocial",
]

// Keywords to search for in Reddit posts
const SEARCH_KEYWORDS = [
  "PG",
  "paying guest",
  "flat",
  "apartment",
  "student accommodation",
  "rent",
  "rental",
  "roommate",
  "college accommodation",
  "hostel",
  "mess",
  "student housing",
]

// Reddit API endpoint (public, no auth needed for basic requests)
const REDDIT_API_BASE = "https://www.reddit.com"

// Transform Reddit post to blog format
function transformRedditPost(post: any, index: number) {
  const getCategory = (title: string, selftext: string) => {
    const text = (title + " " + selftext).toLowerCase()
    
    if (text.includes("pg") || text.includes("paying guest")) {
      return "PG Accommodation"
    }
    if (text.includes("flat") || text.includes("apartment")) {
      return "Flats & Apartments"
    }
    if (text.includes("student") || text.includes("college")) {
      return "Student Life"
    }
    if (text.includes("rent") || text.includes("rental")) {
      return "Rental Guide"
    }
    if (text.includes("budget") || text.includes("cost") || text.includes("price")) {
      return "Budget Tips"
    }
    if (text.includes("area") || text.includes("location") || text.includes("near")) {
      return "Location Guide"
    }
    if (text.includes("review") || text.includes("experience")) {
      return "Reviews & Experiences"
    }
    if (text.includes("tip") || text.includes("advice") || text.includes("guide")) {
      return "Tips & Guides"
    }
    return "Accommodation"
  }

  const title = post.data?.title || "Untitled Post"
  const selftext = post.data?.selftext || ""
  const excerpt = selftext.substring(0, 200) || title.substring(0, 150)
  const category = getCategory(title, selftext)
  const subreddit = post.data?.subreddit || "reddit"
  const author = post.data?.author || "Reddit User"
  const created = post.data?.created_utc
    ? new Date(post.data.created_utc * 1000)
    : new Date()
  
  // Get image from post
  let image = "/placeholder.svg?height=400&width=600"
  if (post.data?.preview?.images?.[0]?.source?.url) {
    image = post.data.preview.images[0].source.url.replace(/&amp;/g, "&")
  } else if (post.data?.thumbnail && post.data.thumbnail.startsWith("http")) {
    image = post.data.thumbnail
  }

  return {
    id: `reddit-${post.data?.id || index}-${Date.now()}`,
    title: title.length > 100 ? title.substring(0, 100) + "..." : title,
    excerpt: excerpt + (excerpt.length >= 200 ? "..." : ""),
    image,
    date: created.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    author: `u/${author}`,
    category,
    source: `r/${subreddit}`,
    url: `https://reddit.com${post.data?.permalink || ""}`,
    publishedAt: created.toISOString(),
    content: selftext, // Full content for detailed view
    upvotes: post.data?.ups || 0,
    comments: post.data?.num_comments || 0,
  }
}

// Fetch posts from a specific subreddit
async function fetchSubredditPosts(subreddit: string, limit: number = 25) {
  try {
    const url = `${REDDIT_API_BASE}/r/${subreddit}/hot.json?limit=${limit}`
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SecondHome/1.0 (Blog Aggregator)",
      },
      next: { revalidate: 1800 }, // Cache for 30 minutes
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.data?.children || []
  } catch (error) {
    console.error(`Error fetching from r/${subreddit}:`, error)
    return []
  }
}

// Search Reddit for specific keywords
async function searchReddit(keyword: string, limit: number = 10) {
  try {
    const url = `${REDDIT_API_BASE}/search.json?q=${encodeURIComponent(keyword)}&limit=${limit}&sort=hot&t=month`
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SecondHome/1.0 (Blog Aggregator)",
      },
      next: { revalidate: 1800 },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.data?.children || []
  } catch (error) {
    console.error(`Error searching Reddit for "${keyword}":`, error)
    return []
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pageSize = parseInt(searchParams.get("pageSize") || "12")
    const limit = Math.min(pageSize * 2, 50) // Fetch more to filter

    // Fetch posts from multiple sources
    const allPosts: any[] = []

    // 1. Fetch from city-specific subreddits
    const citySubreddits = REDDIT_SUBREDDITS.slice(0, 5) // Limit to avoid rate limits
    for (const subreddit of citySubreddits) {
      const posts = await fetchSubredditPosts(subreddit, 10)
      allPosts.push(...posts)
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    // 2. Search for specific keywords
    const searchKeywords = ["PG", "flat", "student accommodation", "rent"]
    for (const keyword of searchKeywords) {
      const posts = await searchReddit(keyword, 5)
      allPosts.push(...posts)
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    // Filter and transform posts
    const relevantPosts = allPosts
      .filter((post) => {
        if (!post.data) return false
        
        const title = (post.data.title || "").toLowerCase()
        const selftext = (post.data.selftext || "").toLowerCase()
        const combined = title + " " + selftext

        // Check if post is relevant to PGs/flats/student accommodation
        const isRelevant = SEARCH_KEYWORDS.some((keyword) =>
          combined.includes(keyword.toLowerCase())
        )

        // Check if it's India-related (city names, Indian context)
        const indiaKeywords = [
          "india",
          "indian",
          "bangalore",
          "mumbai",
          "delhi",
          "hyderabad",
          "pune",
          "chennai",
          "kolkata",
          "rs",
          "rupee",
          "inr",
          "₹",
        ]
        const isIndiaRelated = indiaKeywords.some((keyword) =>
          combined.includes(keyword.toLowerCase())
        )

        // Must have some content
        const hasContent = title.length > 10 && (selftext.length > 50 || title.length > 20)

        return isRelevant && (isIndiaRelated || title.includes("pg") || title.includes("flat")) && hasContent
      })
      .map((post, index) => transformRedditPost(post, index))
      .filter((post) => post.title && post.excerpt) // Remove invalid posts

    // Remove duplicates based on title similarity
    const uniquePosts = []
    const seenTitles = new Set<string>()
    
    for (const post of relevantPosts) {
      const titleKey = post.title.toLowerCase().substring(0, 50)
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey)
        uniquePosts.push(post)
      }
    }

    // Sort by upvotes and date (most engaging first)
    uniquePosts.sort((a, b) => {
      const scoreA = (a.upvotes || 0) + (a.comments || 0) * 2
      const scoreB = (b.upvotes || 0) + (b.comments || 0) * 2
      return scoreB - scoreA
    })

    // Limit to requested page size
    const articles = uniquePosts.slice(0, pageSize)

    return NextResponse.json({
      articles,
      totalResults: uniquePosts.length,
      page: 1,
      pageSize: articles.length,
      source: "Reddit Communities",
    })
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch blog posts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

