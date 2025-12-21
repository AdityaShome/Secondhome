import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { BlogPost } from "@/models/blog-post"

/**
 * BLOG POSTS API - Vercel Compatible
 * 
 * Fetches blog posts from:
 * 1. Database (MongoDB) - Curated and trending posts
 * 2. RSS Feeds - Real-time updates from Indian real estate blogs
 * 
 * Works on Vercel without CORS issues.
 */

// RSS Feed URLs for Indian real estate and student accommodation
// Using multiple sources to ensure we get real content
const RSS_FEEDS = [
  "https://economictimes.indiatimes.com/rssfeeds/2146842.cms", // Real Estate
  "https://www.business-standard.com/rss/real-estate-106.rss",
  "https://www.livemint.com/rss/real-estate",
  "https://www.thehindu.com/business/feeder/default.rss", // Business news
  "https://feeds.feedburner.com/ndtv/real-estate", // NDTV Real Estate
  "https://www.moneycontrol.com/rss/realestate.xml", // MoneyControl Real Estate
  "https://www.proptiger.com/blog/feed", // PropTiger Blog
  "https://www.99acres.com/blog/feed", // 99acres Blog
]

// Alternative: Use Google News RSS for real estate in India
const GOOGLE_NEWS_RSS = [
  "https://news.google.com/rss/search?q=real+estate+india&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=PG+accommodation+india&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=student+accommodation+india&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=flat+rental+india&hl=en-IN&gl=IN&ceid=IN:en",
]

// Parse RSS XML to JSON (improved parser)
async function parseRSSFeed(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 1800 }, // Cache for 30 minutes
    })

    if (!response.ok) {
      console.log(`RSS feed ${url} returned status ${response.status}`)
      return []
    }

    const xmlText = await response.text()
    
    // Handle both RSS and Atom feeds
    const items: any[] = []
    
    // Try RSS format first
    let itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    let match = itemRegex.exec(xmlText)
    
    // If no RSS items, try Atom format
    if (!match) {
      itemRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
      match = itemRegex.exec(xmlText)
    }
    
    // Reset regex
    itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    match = null

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1]
      
      const getTagContent = (tag: string) => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i")
        const match = itemXml.match(regex)
        if (!match) {
          // Try CDATA
          const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>`, "i")
          const cdataMatch = itemXml.match(cdataRegex)
          return cdataMatch ? cdataMatch[1].trim() : ""
        }
        return match[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/<[^>]+>/g, "").trim()
      }

      const title = getTagContent("title")
      const description = getTagContent("description") || getTagContent("content") || getTagContent("content:encoded") || getTagContent("summary")
      const link = getTagContent("link") || getTagContent("guid")
      const pubDate = getTagContent("pubDate") || getTagContent("published") || getTagContent("dc:date")
      const author = getTagContent("author") || getTagContent("dc:creator") || getTagContent("dc:author") || "News Source"

      // Extract image from various sources
      let image = ""
      const imageMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i) || 
                          description.match(/<img[^>]+src=["']([^"']+)["']/i) ||
                          itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
                          itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i)
      if (imageMatch) {
        image = imageMatch[1]
      }

      if (title && link && title.length > 5) {
        items.push({
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
          description: description.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").substring(0, 300),
          link: link.replace(/&amp;/g, "&"),
          pubDate,
          author: author.replace(/&amp;/g, "&"),
          image: image || "/placeholder.svg?height=400&width=600",
        })
      }
    }

    // Also try Atom format if RSS didn't work
    if (items.length === 0) {
      const atomRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
      let atomMatch
      while ((atomMatch = atomRegex.exec(xmlText)) !== null) {
        const entryXml = atomMatch[1]
        const getAtomTag = (tag: string) => {
          const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i")
          const match = entryXml.match(regex)
          return match ? match[1].replace(/<[^>]+>/g, "").trim() : ""
        }
        const title = getAtomTag("title")
        const link = getAtomTag("link") || entryXml.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || ""
        const summary = getAtomTag("summary") || getAtomTag("content")
        const published = getAtomTag("published") || getAtomTag("updated")
        
        if (title && link) {
          items.push({
            title,
            description: summary.substring(0, 300),
            link,
            pubDate: published,
            author: "News Source",
            image: "/placeholder.svg?height=400&width=600",
          })
        }
      }
    }

    return items
  } catch (error) {
    console.error(`Error parsing RSS feed ${url}:`, error)
    return []
  }
}

// Generate stable unique ID from URL (so it's consistent across fetches)
function generateUniqueId(url: string, title: string): string {
  // Create a stable hash from URL (primary) and title to ensure uniqueness
  // Using URL as primary ensures same article always gets same ID
  const str = url + title
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  // Use only hash and URL hash - no timestamp or random to ensure stability
  const urlHash = url.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  return `rss-${Math.abs(hash)}-${Math.abs(urlHash)}`
}

// Transform RSS item to blog post format
function transformRSSItem(item: any, source: string) {
  const getCategory = (title: string, description: string) => {
    const text = (title + " " + description).toLowerCase()
    
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
    if (text.includes("area") || text.includes("location") || text.includes("neighborhood")) {
      return "Location Guide"
    }
    return "Real Estate"
  }

  const category = getCategory(item.title, item.description)
  const publishedDate = item.pubDate 
    ? new Date(item.pubDate)
    : new Date()

  // Generate unique ID from URL and title
  const uniqueId = generateUniqueId(item.link || item.title, item.title)

  return {
    id: uniqueId,
    title: item.title.length > 100 ? item.title.substring(0, 100) + "..." : item.title,
    excerpt: item.description || item.title.substring(0, 150),
    image: item.image || "/placeholder.svg?height=400&width=600",
    date: publishedDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    author: item.author || source,
    category,
    source: source,
    url: item.link,
    publishedAt: publishedDate.toISOString(),
    content: item.description,
  }
}

// Fetch blog posts from database (only real user-created posts, no auto-seeding)
async function fetchBlogPostsFromDB() {
  try {
    await connectToDatabase()
    
    const posts = await BlogPost.find({
      isPublished: true,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return posts.map((post: any) => ({
      id: post._id.toString(),
      title: post.title,
      excerpt: post.excerpt || post.content?.substring(0, 200) || "",
      image: post.image || "/placeholder.svg?height=400&width=600",
      date: new Date(post.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      author: post.author || "SecondHome",
      category: post.category || "General",
      source: "SecondHome Blog",
      url: `/blog/${post._id}`,
      publishedAt: post.createdAt,
      content: post.content,
    }))
  } catch (error) {
    console.error("Error fetching blog posts from DB:", error)
    return []
  }
}

// Fetch blog posts from RSS feeds
async function fetchBlogPostsFromFeeds() {
  const allPosts: any[] = []
  const allFeeds = [...RSS_FEEDS, ...GOOGLE_NEWS_RSS]

  // Fetch from all feeds in parallel for faster results
  const feedPromises = allFeeds.map(async (feedUrl) => {
    try {
      const items = await parseRSSFeed(feedUrl)
      const sourceName = new URL(feedUrl).hostname.replace("www.", "").replace("news.google.com", "Google News")
      
      return items.map((item) => {
        // Filter for India-related and PG/flat content (more lenient for Google News)
        const text = (item.title + " " + item.description).toLowerCase()
        const isRelevant = 
          text.includes("pg") ||
          text.includes("paying guest") ||
          text.includes("flat") ||
          text.includes("apartment") ||
          text.includes("student") ||
          text.includes("rent") ||
          text.includes("rental") ||
          text.includes("accommodation") ||
          text.includes("bangalore") ||
          text.includes("mumbai") ||
          text.includes("delhi") ||
          text.includes("hyderabad") ||
          text.includes("pune") ||
          text.includes("chennai") ||
          text.includes("kolkata") ||
          text.includes("india") ||
          text.includes("indian") ||
          text.includes("housing") ||
          text.includes("property") ||
          text.includes("real estate") ||
          text.includes("residential") ||
          text.includes("college") ||
          text.includes("university") ||
          text.includes("hostel") ||
          text.includes("room") ||
          text.includes("rental market") ||
          text.includes("housing market") ||
          // For Google News, be more lenient
          (feedUrl.includes("google.com") && (text.includes("real") || text.includes("estate") || text.includes("property")))

        if (isRelevant && item.title.length > 10) {
          return transformRSSItem(item, sourceName)
        }
        return null
      }).filter(Boolean)
    } catch (error) {
      console.error(`Error fetching feed ${feedUrl}:`, error)
      return []
    }
  })

  const results = await Promise.all(feedPromises)
  results.forEach((posts) => {
    if (posts && posts.length > 0) {
      allPosts.push(...posts)
    }
  })

  return allPosts
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pageSize = parseInt(searchParams.get("pageSize") || "12")

    // Only fetch from RSS feeds - no database posts (to ensure only API content)
    const rssPosts = await fetchBlogPostsFromFeeds().catch((error) => {
      console.error("Error fetching RSS feeds:", error)
      return []
    })

    // Only use RSS posts - no hardcoded database posts
    const allPosts = rssPosts

    // Remove duplicates based on title similarity
    const uniquePosts = []
    const seenTitles = new Set<string>()
    
    for (const post of allPosts) {
      const titleKey = post.title.toLowerCase().substring(0, 50)
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey)
        uniquePosts.push(post)
      }
    }

    // Sort by date (newest first)
    uniquePosts.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime()
      const dateB = new Date(b.publishedAt).getTime()
      return dateB - dateA
    })

    // Limit to requested page size
    const articles = uniquePosts.slice(0, pageSize)

    return NextResponse.json({
      articles,
      totalResults: uniquePosts.length,
      page: 1,
      pageSize: articles.length,
      source: "Database & RSS Feeds",
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
