import { NextResponse } from "next/server"

/**
 * FREE NEWS API OPTIONS:
 * 
 * 1. NewsAPI.org (Currently Used)
 *    - Free: 100 requests/day, development only
 *    - Sign up: https://newsapi.org/
 *    - Set env: NEWS_API_KEY=your_key
 * 
 * 2. GNews API (Alternative - More Free Requests)
 *    - Free: 100 requests/day, production allowed
 *    - Sign up: https://gnews.io/
 *    - Set env: GNEWS_API_KEY=your_key
 * 
 * 3. Mediastack (Alternative)
 *    - Free: 100 requests/month
 *    - Sign up: https://mediastack.com/
 *    - Set env: MEDIASTACK_API_KEY=your_key
 */

// NewsAPI.org endpoint
const NEWS_API_URL = "https://newsapi.org/v2/everything"

// Keywords relevant to student accommodation, real estate, education
const RELEVANT_KEYWORDS = [
  "student accommodation",
  "student housing",
  "real estate",
  "rental property",
  "college housing",
  "student living",
  "property rental",
  "education",
  "student life",
  "housing market",
  "rental market",
  "property investment",
  "student budget",
  "accommodation",
]

export async function GET(request: Request) {
  try {
    // Try NewsAPI.org first (free tier: 100 requests/day)
    let apiKey = process.env.NEWS_API_KEY
    let apiProvider = "newsapi"
    let apiUrl = NEWS_API_URL

    // Fallback to GNews API if NewsAPI key not available (also free: 100 requests/day)
    if (!apiKey) {
      apiKey = process.env.GNEWS_API_KEY
      apiProvider = "gnews"
      apiUrl = "https://gnews.io/api/v4/search"
    }

    if (!apiKey) {
      console.error("No news API key found. Please set NEWS_API_KEY or GNEWS_API_KEY in environment variables")
      return NextResponse.json(
        { 
          error: "News API key not configured",
          message: "Please add NEWS_API_KEY or GNEWS_API_KEY to your .env.local file. Get free API keys from https://newsapi.org/ or https://gnews.io/",
          setupInstructions: {
            newsapi: "1. Visit https://newsapi.org/ and sign up (free)\n2. Get your API key\n3. Add NEWS_API_KEY=your_key to .env.local\n4. Free tier: 100 requests/day (development only)",
            gnews: "1. Visit https://gnews.io/ and sign up (free)\n2. Get your API key\n3. Add GNEWS_API_KEY=your_key to .env.local\n4. Free tier: 100 requests/day (production allowed)"
          }
        },
        { status: 500 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "12")
    const query = searchParams.get("q") || RELEVANT_KEYWORDS.join(" OR ")

    // Calculate date range (last 30 days)
    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30)

    // Build API URL based on provider
    let finalApiUrl: string
    
    if (apiProvider === "gnews") {
      // GNews API format
      const gnewsUrl = new URL(apiUrl)
      gnewsUrl.searchParams.append("q", query)
      gnewsUrl.searchParams.append("token", apiKey)
      gnewsUrl.searchParams.append("lang", "en")
      gnewsUrl.searchParams.append("max", pageSize.toString())
      finalApiUrl = gnewsUrl.toString()
    } else {
      // NewsAPI.org format
      const newsApiUrl = new URL(apiUrl)
      newsApiUrl.searchParams.append("q", query)
      newsApiUrl.searchParams.append("apiKey", apiKey)
      newsApiUrl.searchParams.append("language", "en")
      newsApiUrl.searchParams.append("sortBy", "publishedAt")
      newsApiUrl.searchParams.append("page", page.toString())
      newsApiUrl.searchParams.append("pageSize", pageSize.toString())
      newsApiUrl.searchParams.append("from", fromDate.toISOString().split("T")[0])
      newsApiUrl.searchParams.append("to", toDate.toISOString().split("T")[0])
      finalApiUrl = newsApiUrl.toString()
    }

    // Fetch news from API
    const response = await fetch(finalApiUrl, {
      headers: {
        "User-Agent": "SecondHome/1.0",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour to reduce API calls
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("NewsAPI error:", errorData)
      return NextResponse.json(
        { error: "Failed to fetch news", details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Handle different API response formats
    let articlesData = []
    if (apiProvider === "gnews") {
      articlesData = data.articles || []
    } else {
      articlesData = data.articles || []
    }

    // Transform articles to match blog post format
    const articles = articlesData.map((article: any, index: number) => {
      // Extract relevant category from article content or source
      const getCategory = (article: any) => {
        const title = (article.title || "").toLowerCase()
        const description = (article.description || "").toLowerCase()

        if (title.includes("student") || description.includes("student")) {
          return "Student Life"
        }
        if (title.includes("rental") || description.includes("rental") || title.includes("property")) {
          return "Real Estate"
        }
        if (title.includes("education") || description.includes("education") || title.includes("college")) {
          return "Education"
        }
        if (title.includes("budget") || description.includes("budget") || title.includes("finance")) {
          return "Finance"
        }
        if (title.includes("food") || description.includes("food") || title.includes("mess")) {
          return "Food & Nutrition"
        }
        return "General"
      }

      // Handle different API field names
      const publishedAt = article.publishedAt || article.publishedAt || article.published_date
      const imageUrl = article.urlToImage || article.image || article.urlToImage
      const sourceName = article.source?.name || article.source || "Unknown"
      
      return {
        id: `news-${index}-${Date.now()}`,
        title: article.title || "Untitled Article",
        excerpt: article.description || article.content?.substring(0, 150) || article.content?.substring(0, 150) || "No description available.",
        image: imageUrl || "/placeholder.svg?height=400&width=600",
        date: publishedAt
          ? new Date(publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "Unknown date",
        author: article.author || sourceName || "News Source",
        category: getCategory(article),
        source: sourceName,
        url: article.url || article.link || "#",
        publishedAt: publishedAt,
      }
    })

    return NextResponse.json({
      articles,
      totalResults: data.totalResults || 0,
      page,
      pageSize,
    })
  } catch (error) {
    console.error("Error fetching news:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

