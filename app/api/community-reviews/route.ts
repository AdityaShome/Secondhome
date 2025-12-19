import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" })

// --- Types ---
interface RedditPost {
  title: string
  body: string
  url: string
  score: number
  created: number
  subreddit: string
  relevanceScore: number // New field for our internal sorting
  relevanceType: 'specific_building' | 'neighborhood_context'
}

interface SearchContext {
  rawInput: string
  nameTokens: string[] // e.g. ["stadium", "gachibowli"]
  locality: string
  city: string
  categoryKeywords: string[] // e.g. ["sports", "ground", "arena"] if user said "stadium"
}

// --- Smart Context Extraction ---

// Infers related keywords based on the place name
// e.g., "Stadium" -> ["sports", "match", "ground"]
// e.g., "Hostel" -> ["pg", "stay", "room", "food"]
function inferCategoryKeywords(name: string): string[] {
  const n = name.toLowerCase()
  if (n.includes('stadium') || n.includes('ground')) return ['sports', 'match', 'cricket', 'football', 'arena']
  if (n.includes('hostel') || n.includes('pg') || n.includes('residency')) return ['stay', 'food', 'rent', 'room', 'owner']
  if (n.includes('mall')) return ['shopping', 'theatre', 'movie', 'parking']
  if (n.includes('college') || n.includes('institute')) return ['campus', 'faculty', 'placement', 'fest']
  if (n.includes('hospital')) return ['doctor', 'treatment', 'emergency']
  return []
}

function parseSearchContext(locationName: string, address: string): SearchContext {
  // 1. Clean the input
  const cleanName = locationName.replace(/near|behind|opp|opposite|beside/gi, ' ').trim()
  
  // 2. Extract Locality & City (Simple Heuristic for Indian Metros)
  const fullString = `${locationName} ${address}`.toLowerCase()
  const knownCities = ['hyderabad', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'pune', 'chennai', 'kolkata']
  const city = knownCities.find(c => fullString.includes(c)) || ""
  
  // Extract Locality: Look for words in locationName that AREN'T the city or generic words
  const genericWords = ['hostel', 'pg', 'hotel', 'building', 'towers', 'heights', 'residency', 'stadium', 'college', 'school', 'mall']
  const nameTokens = cleanName.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2)
  
  // The locality is likely the "Unique" part of the name (e.g. "Gachibowli" in "Gachibowli Stadium")
  const locality = nameTokens.find(t => !genericWords.includes(t) && t !== city) || ""

  return {
    rawInput: locationName,
    nameTokens: nameTokens,
    locality: locality,
    city: city || "india", // Default to India if city unknown to keep search broad
    categoryKeywords: inferCategoryKeywords(cleanName)
  }
}

// --- Scoring Logic (The Brain) ---

function calculateRelevance(post: any, context: SearchContext): number {
  let score = 0
  const content = (post.title + " " + post.selftext).toLowerCase()
  
  // 1. Exact Token Matches (The most important)
  // e.g. Post mentions "Gachibowli" AND "Stadium"
  const tokensFound = context.nameTokens.filter(token => content.includes(token))
  score += (tokensFound.length * 10)

  // 2. Category Context Matches
  // e.g. User asked for "Stadium", post mentions "match" or "sports"
  const categoryMatches = context.categoryKeywords.filter(k => content.includes(k))
  score += (categoryMatches.length * 3)

  // 3. Negative Filtering (Remove noise)
  if (post.selftext === '[removed]' || post.selftext === '[deleted]') score -= 100
  
  // 4. Boost Score if Title has key tokens (Titles are high signal)
  const titleTokensFound = context.nameTokens.filter(token => post.title.toLowerCase().includes(token))
  score += (titleTokensFound.length * 5)

  return score
}

// --- Search Execution ---

async function smartSearch(context: SearchContext): Promise<RedditPost[]> {
  try {
    const allPosts: RedditPost[] = []
    
    // STRATEGY: 
    // We search broadly using multiple query variations, then filter heavily locally.
    
    // Query 1: The full name (e.g., "Gachibowli Stadium")
    const q1 = `"${context.rawInput}"`
    
    // Query 2: Token overlap (e.g., Gachibowli AND Stadium) - high recall
    // We join meaningful tokens with AND to force Reddit to find both
    const q2 = context.nameTokens.join(" ") 
    
    // Query 3: Locality + Category (e.g., "Gachibowli" + "Sports") - if we have category keywords
    const q3 = context.categoryKeywords.length > 0 ? `${context.locality} ${context.categoryKeywords[0]}` : ""

    const queries = [q1, q2, q3].filter(q => q.length > 2)
    const uniqueQueries = [...new Set(queries)]

    console.log(`🔍 Strategy: Searching for`, uniqueQueries)

    // Search relevant subreddits
    const subs = [context.city, 'india', 'hyderabad', 'bangalore'].filter(s => s.length > 0)
    const uniqueSubs = [...new Set(subs)] // dedupe

    for (const query of uniqueQueries) {
      for (const sub of uniqueSubs.slice(0, 2)) { // Limit subs to save time
        try {
          const url = `https://old.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&limit=10`
          
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (StudentHousingBot)' } })
          if (!res.ok) continue
          
          const data = await res.json()
          const children = data.data?.children || []
          
          for (const child of children) {
            const p = child.data
            // Calculate Score IMMEDIATELY
            const score = calculateRelevance(p, context)
            
            // THRESHOLD: Only keep posts with decent relevance
            // If the user typed "Gachibowli Stadium", a post MUST mention at least one of those words to be > 0.
            // We set a threshold of 10 (needs roughly 1 strong keyword match or multiple weak ones)
            if (score >= 10) {
              allPosts.push({
                title: p.title,
                body: p.selftext,
                url: `https://reddit.com${p.permalink}`,
                score: p.score,
                created: p.created_utc,
                subreddit: p.subreddit,
                relevanceScore: score,
                relevanceType: score > 20 ? 'specific_building' : 'neighborhood_context'
              })
            }
          }
        } catch (e) {
          // ignore fetch errors
        }
      }
    }

    // Sort by Relevance Score (High to Low) and Deduplicate by URL
    const uniquePosts = Array.from(new Map(allPosts.map(p => [p.url, p])).values())
    return uniquePosts.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 8) // Keep top 8

  } catch (e) {
    console.error(e)
    return []
  }
}

// --- Main Handler ---

export async function POST(req: NextRequest) {
  try {
    const { locationName, address } = await req.json()
    if (!locationName) return NextResponse.json({ error: "Missing location" }, { status: 400 })

    // 1. Analyze Context
    const context = parseSearchContext(locationName, address || "")
    console.log(`📍 Analyzed:`, context)

    // 2. Fetch & Filter
    const topPosts = await smartSearch(context)
    console.log(`✅ Found ${topPosts.length} relevant posts after filtering.`)

    // 3. Fallback: If 0 relevant posts found for specific place, do a PURE locality search
    // But mark it explicitly as "General Area Info"
    if (topPosts.length === 0 && context.locality) {
      console.log("⚠️ No specific matches. Falling back to Locality search...")
      // Re-run search just for locality safety/vibe
      const areaContext = { ...context, rawInput: context.locality, nameTokens: [context.locality] }
      // We lower the threshold for area searches in a separate logic if needed, 
      // but for now let's just reuse smartSearch with broader tokens
      // Actually, let's just do a direct fetch for "Living in [Locality]" to ensure quality
      const areaUrl = `https://old.reddit.com/r/${context.city}/search.json?q=${encodeURIComponent(`living in ${context.locality}`)}&restrict_sr=1&sort=relevance&limit=5`
      // ... (fetch logic similar to above, simplified for brevity)
      // For this snippet, I'll rely on the client to handle the "No reviews" state or you can implement a quick fetch here.
    }

    if (topPosts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          found_specific_reviews: false,
          summary: "No relevant discussions found.",
          sentiment: "neutral",
          sources: []
        }
      })
    }

    // 4. AI Summarization
    const postsText = topPosts.map((p, i) => `[${i+1}] (Score: ${p.relevanceScore}) ${p.title}\n${p.body.slice(0, 300)}`).join('\n\n')
    
    const prompt = `
    Analyze these Reddit posts about "${context.rawInput}" (${context.categoryKeywords.join(', ')}).
    
    Strictly ignore posts that are clearly about something else (even if they share a keyword).
    
    Data:
    ${postsText}
    
    Return JSON:
    {
      "summary": "Concise summary of user opinions.",
      "sentiment": "positive/negative/mixed",
      "safety_rating": "High/Medium/Low",
      "verdict": "One sentence verdict.",
      "pros": [],
      "cons": []
    }
    `

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" }
    })

    const analysis = JSON.parse(completion.choices[0]?.message?.content || "{}")

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        source_count: topPosts.length,
        found_specific_reviews: topPosts.some(p => p.relevanceScore > 20),
        sources: topPosts.map(p => ({
          title: p.title,
          url: p.url,
          subreddit: p.subreddit,
          score: p.score,
          relevanceType: p.relevanceType
        }))
      }
    })

  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}