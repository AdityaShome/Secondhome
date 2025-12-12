import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" })

interface RedditPost {
  title: string
  body: string
  url: string
  score: number
  created: number
  subreddit: string
}

async function searchReddit(query: string, exactLocationName: string): Promise<RedditPost[]> {
  try {
    console.log(`🔍 Starting EXACT Reddit search for: "${query}"`)
    console.log(`🎯 Must contain: "${exactLocationName}"`)
    
    const posts: RedditPost[] = []
    
    // Only search in relevant subreddits - focus on Indian cities and student communities
    const relevantSubreddits = ['hyderabad', 'bangalore', 'mumbai', 'delhi', 'pune', 'chennai', 'IndianStudents', 'Indian_Academia']
    
    // Use exact phrase matching with quotes (Reddit dorking)
    const searchTerm = query
    
    console.log('📝 Exact phrase search:', searchTerm)
      // Try Old Reddit JSON endpoint (more reliable)
      for (const subreddit of relevantSubreddits.slice(0, 3)) {
        try {
          const searchUrl = `https://old.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchTerm)}&restrict_sr=1&sort=top&t=all&limit=10`
          console.log(`  🌐 Trying: r/${subreddit}`)
          
          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            const subredditPosts = data.data?.children
              ?.filter((child: any) => child.data.selftext && child.data.selftext.length > 100)
              ?.map((child: any) => ({
                title: child.data.title,
                body: child.data.selftext,
                url: `https://reddit.com${child.data.permalink}`,
                score: child.data.score,
                created: child.data.created_utc,
                subreddit: child.data.subreddit
              })) || []
            
            console.log(`    ✅ Found ${subredditPosts.length} posts in r/${subreddit}`)
            posts.push(...subredditPosts)
          } else {
            console.log(`    ❌ Failed: ${response.status}`)
          }
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (err) {
          console.error(`    ⚠️ Error in r/${subreddit}:`, err instanceof Error ? err.message : err)
        }
      }
    
    // STRICT FILTERING: Only keep posts that actually mention the location name
    const locationKeywords = exactLocationName.toLowerCase().split(' ').filter(w => w.length > 3)
    const relevantPosts = posts.filter(post => {
      const content = (post.title + ' ' + post.body).toLowerCase()
      // Post must contain at least 2 keywords from the location name
      const matchCount = locationKeywords.filter(keyword => content.includes(keyword)).length
      return matchCount >= Math.min(2, locationKeywords.length)
    })
    
    console.log(`🎯 Filtered ${posts.length} posts → ${relevantPosts.length} relevant posts`)
    
    // Remove duplicates
    const uniquePosts = Array.from(
      new Map(relevantPosts.map(post => [post.url, post])).values()
    ).filter(post => post.body.length > 100 && post.score >= 0)
    
    console.log(`✨ Final: ${uniquePosts.length} relevant unique posts`)
    
    // If no relevant posts found, return empty array (better than wrong data)
    if (uniquePosts.length === 0) {
      console.log('⚠️ No relevant posts found for exact location')
      return []
    }
    
    // Sort by score and recency
    return uniquePosts
      .sort((a, b) => {
        const scoreWeight = 0.7
        const recencyWeight = 0.3
        const aScore = scoreWeight * a.score + recencyWeight * (a.created / 100000)
        const bScore = scoreWeight * b.score + recencyWeight * (b.created / 100000)
        return bScore - aScore
      })
      .slice(0, 10)
      
  } catch (error) {
    console.error("❌ Fatal error searching Reddit:", error)
    return []
  }
}

async function summarizeWithGroq(posts: RedditPost[], locationName: string) {
  try {
    if (posts.length === 0) {
      return {
        summary: "No community reviews found for this location.",
        sentiment: "neutral",
        keyPoints: [],
        warnings: [],
        recommendations: []
      }
    }

    const postsText = posts.map((post, idx) => 
      `[${idx + 1}] From r/${post.subreddit} (${post.score} upvotes):\nTitle: ${post.title}\n${post.body.substring(0, 500)}...\nSource: ${post.url}`
    ).join('\n\n---\n\n')
    
    const prompt = `You are analyzing authentic community reviews about "${locationName}" from Reddit discussions. 

Here are the reviews found:

${postsText}

Please provide a comprehensive analysis in the following JSON format:

{
  "summary": "A 2-3 sentence overall summary of what people are saying",
  "sentiment": "positive/negative/mixed/neutral",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "warnings": ["any red flags or concerns mentioned"],
  "recommendations": ["helpful suggestions from the community"],
  "prosCons": {
    "pros": ["positive aspect 1", "positive aspect 2"],
    "cons": ["negative aspect 1", "negative aspect 2"]
  }
}

Focus on:
- Authenticity and genuine experiences
- Safety concerns
- Value for money
- Living conditions
- Management/landlord behavior
- Hidden issues not mentioned in official listings

Be honest and highlight any red flags. These reviews help students make informed decisions.`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 2000,
    })
    
    const response = completion.choices[0]?.message?.content || ""
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0])
      return {
        ...analysis,
        reviewCount: posts.length,
        sources: posts.map(p => ({
          subreddit: p.subreddit,
          url: p.url,
          score: p.score,
          title: p.title
        }))
      }
    }
    
    throw new Error("Failed to parse AI response")
    
  } catch (error) {
    console.error("Error with Groq analysis:", error)
    
    // Fallback: return raw posts
    return {
      summary: `Found ${posts.length} community discussions about this location.`,
      sentiment: "neutral",
      reviewCount: posts.length,
      sources: posts.map(p => ({
        subreddit: p.subreddit,
        url: p.url,
        score: p.score,
        title: p.title,
        preview: p.body.substring(0, 200)
      })),
      rawMode: true
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { locationName, address, type } = await req.json()
    
    if (!locationName) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      )
    }
    
    // Extract locality/area from address (more specific than city)
    const addressParts = (address || '').split(',').map(s => s.trim()).filter(Boolean)
    const locality = addressParts[0] || '' // First part is usually the locality/area
    const city = addressParts[addressParts.length - 1] || '' // Last part is usually the city
    
    // Build VERY focused search queries with exact phrase matching (Reddit dorking)
    // Only search for exact property name OR specific area accommodation
    const searchQueries = [
      `"${locationName}"`, // Exact property name in quotes (Reddit dorking)
      `"${locationName}" ${locality}`, // Property name + area
      `"${locationName}" review OR experience`, // Property name with review keywords
    ].filter(q => q.trim() && q.length > 3)
    
    console.log(`🎯 EXACT search queries (dorking):`, searchQueries)
    
    // Try each search query until we get relevant results
    let redditPosts: RedditPost[] = []
    for (const query of searchQueries) {
      redditPosts = await searchReddit(query, locationName)
      console.log(`Query "${query}" found ${redditPosts.length} RELEVANT posts`)
      if (redditPosts.length >= 2) break // Stop if we found at least 2 relevant results
    }
    
    console.log(`✅ Total found: ${redditPosts.length} VERIFIED relevant Reddit posts`)
    
    // DON'T show anything if we have no relevant results - better than showing wrong info
    if (redditPosts.length === 0) {
      console.log('⚠️ No exact matches found - returning empty results')
      return NextResponse.json({
        success: true,
        locationName,
        analysis: {
          summary: "No specific community reviews found for this exact location on Reddit.",
          sentiment: "neutral",
          reviewCount: 0,
          keyPoints: [],
          warnings: [],
          recommendations: [],
          sources: []
        },
        timestamp: new Date().toISOString()
      })
    }
    
    // Summarize with Groq only if we have relevant posts
    const analysis = await summarizeWithGroq(redditPosts, locationName)
    
    return NextResponse.json({
      success: true,
      locationName,
      analysis,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Error in community reviews API:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch community reviews",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
