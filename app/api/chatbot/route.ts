import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"
import { Mess } from "@/models/mess"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { Notification } from "@/models/notification"
import { getUserModel } from "@/models/user"

export async function POST(request: Request) {
  try {
    const { message, conversationHistory, userContext } = await request.json()
    
    // Get user session for personalized context
    const session = await getServerSession(authOptions)

    if (!message || message.trim().length === 0) {
      return NextResponse.json({
        response: "Please ask me something!",
        error: "Empty message",
      })
    }

    // Get AI API key
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.error("GROQ_API_KEY not found")
      return NextResponse.json({
        response: "Hi! I'm currently learning. You can browse our properties at /listings or contact us at /contact. How can I help you find your perfect accommodation? 😊",
        error: "API key missing",
      })
    }

    // Connect to database and fetch real data
    await connectToDatabase()

    // Get user's browsing history if logged in
    let userBrowsingHistory = ""
    let userPreferences = ""
    let recentPropertiesViewed: any[] = []
    
    if (session?.user?.id) {
      try {
        // Get user's recent property views from notifications (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const propertyViews = await Notification.find({
          user: session.user.id,
          type: "property",
          "metadata.propertyId": { $exists: true },
          createdAt: { $gte: oneDayAgo },
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()

        if (propertyViews.length > 0) {
          const propertyIds = propertyViews
            .map((n: any) => n.metadata?.propertyId)
            .filter((id: any) => id && typeof id === 'string')
          
          if (propertyIds.length > 0) {
            recentPropertiesViewed = await Property.find({
              _id: { $in: propertyIds },
            })
              .select("title location city price type gender amenities rating")
              .lean()

            if (recentPropertiesViewed.length > 0) {
              userBrowsingHistory = `USER'S RECENT BROWSING ACTIVITY (Last 24 hours):
${recentPropertiesViewed.map((p: any, i: number) => 
  `${i + 1}. ${p.title} - ${p.location}, ${p.city} - ₹${p.price}/month - ${p.type} - ${p.gender}`
).join("\n")}

This user has been actively looking at these properties. Use this context to understand their preferences and provide personalized recommendations.`
            }
          }
        }

        // Get user's favorites if available
        const User = await getUserModel()
        const user = await User.findById(session.user.id).select("favorites").lean()
        if (user?.favorites && user.favorites.length > 0) {
          const favoriteProperties = await Property.find({
            _id: { $in: user.favorites },
          })
            .select("title location city price type")
            .lean()
          
          if (favoriteProperties.length > 0) {
            userPreferences = `USER'S SAVED FAVORITES:
${favoriteProperties.map((p: any) => `- ${p.title} in ${p.location}, ${p.city} (₹${p.price}/month)`).join("\n")}

The user has saved these properties, indicating strong interest.`
          }
        }
      } catch (error) {
        console.error("Error fetching user browsing history:", error)
        // Continue without user context if there's an error
      }
    }

    // Fetch all approved properties
    const properties = await Property.find({
      isApproved: true,
      isRejected: false,
    })
      .select("title location city price type gender amenities rating reviews nearbyColleges")
      .lean()
      .limit(100)

    const messes = await Mess.find({
      isApproved: true,
      isRejected: false,
    })
      .select("name location city price mealTypes rating")
      .lean()
      .limit(50)

    // Get unique cities
    const cities = [...new Set([
      ...properties.map((p: any) => p.city).filter(Boolean),
      ...messes.map((m: any) => m.city).filter(Boolean)
    ])]

    // Get unique colleges
    const colleges = new Set<string>()
    properties.forEach((p: any) => {
      if (p.nearbyColleges) {
        p.nearbyColleges.forEach((c: any) => {
          if (c && c.name) colleges.add(c.name)
        })
      }
    })

    // Calculate statistics
    const stats = {
      totalProperties: properties.length,
      totalMesses: messes.length,
      totalCities: cities.length,
      pgCount: properties.filter((p: any) => p.type === "PG").length,
      flatCount: properties.filter((p: any) => p.type === "Flat").length,
      hostelCount: properties.filter((p: any) => p.type === "Hostel").length,
      avgPrice: Math.round(
        properties.reduce((sum: number, p: any) => sum + (p.price || 0), 0) / properties.length
      ),
      minPrice: Math.min(...properties.map((p: any) => p.price || 0).filter(p => p > 0)),
      maxPrice: Math.max(...properties.map((p: any) => p.price || 0)),
      topRatedProperties: properties
        .filter((p: any) => p.rating > 0)
        .sort((a: any, b: any) => b.rating - a.rating)
        .slice(0, 5)
        .map((p: any) => ({
          title: p.title,
          location: p.location,
          price: p.price,
          rating: p.rating,
        })),
    }

    // Group properties by price range
    const budgetRanges = {
      under5k: properties.filter((p: any) => p.price < 5000).length,
      "5k-10k": properties.filter((p: any) => p.price >= 5000 && p.price < 10000).length,
      "10k-15k": properties.filter((p: any) => p.price >= 10000 && p.price < 15000).length,
      "15k-20k": properties.filter((p: any) => p.price >= 15000 && p.price < 20000).length,
      above20k: properties.filter((p: any) => p.price >= 20000).length,
    }

    // Group by gender
    const genderStats = {
      boys: properties.filter((p: any) => p.gender === "Male").length,
      girls: properties.filter((p: any) => p.gender === "Female").length,
      unisex: properties.filter((p: any) => p.gender === "Unisex").length,
    }

    // Detect if user wants executive chat
    const wantsExecutive = /executive|human|agent|talk to someone|speak with|connect with|help me|frustrated|angry|complaint|issue|problem/i.test(message)
    
    // Create comprehensive context for AI
    const systemContext = `You are SecondHome AI Assistant, a friendly and helpful chatbot for SecondHome - India's #1 student accommodation platform.

YOUR IDENTITY:
- You are part of SecondHome website (https://secondhome.com)
- You help students find PGs, Flats, Hostels, and Messes near their colleges
- You have access to REAL-TIME data from our database
- You ONLY answer questions about SecondHome and student accommodations
- You DO NOT answer general questions unrelated to accommodations
${session?.user ? `- Current user: ${session.user.name || session.user.email} (logged in)` : "- Current user: Guest (not logged in)"}

REAL-TIME DATABASE STATISTICS:
- Total Properties Listed: ${stats.totalProperties}
- Total Messes: ${stats.totalMesses}
- Cities We Serve: ${stats.totalCities}
- PGs Available: ${stats.pgCount}
- Flats Available: ${stats.flatCount}
- Hostels Available: ${stats.hostelCount}
- Average Price: ₹${stats.avgPrice}/month
- Price Range: ₹${stats.minPrice} - ₹${stats.maxPrice}

AVAILABLE CITIES:
${cities.slice(0, 20).join(", ")}

TOP COLLEGES WE SERVE:
${Array.from(colleges).slice(0, 20).join(", ")}

BUDGET-WISE BREAKDOWN:
- Under ₹5,000: ${budgetRanges.under5k} properties
- ₹5,000 - ₹10,000: ${budgetRanges["5k-10k"]} properties
- ₹10,000 - ₹15,000: ${budgetRanges["10k-15k"]} properties
- ₹15,000 - ₹20,000: ${budgetRanges["15k-20k"]} properties
- Above ₹20,000: ${budgetRanges.above20k} properties

GENDER-WISE AVAILABILITY:
- Boys PG/Hostels: ${genderStats.boys}
- Girls PG/Hostels: ${genderStats.girls}
- Co-living/Unisex: ${genderStats.unisex}

TOP RATED PROPERTIES:
${stats.topRatedProperties.map((p, i) => `${i + 1}. ${p.title} - ${p.location} - ₹${p.price}/month - ⭐${p.rating}`).join("\n")}

${userBrowsingHistory ? `\n${userBrowsingHistory}\n` : ""}
${userPreferences ? `\n${userPreferences}\n` : ""}
${userContext ? `\nADDITIONAL USER CONTEXT:\n${userContext}\n` : ""}

HOW TO RESPOND:
1. Be conversational, friendly, and helpful
2. Use the REAL data provided above - NO MADE UP INFORMATION
3. When suggesting properties, reference actual listings
4. Provide specific numbers and statistics
5. Guide users to explore more on the website
6. If asked about something not related to accommodations, politely redirect
7. Use emojis sparingly and professionally (🏠, 🎓, 💰, ⭐, 📍)
8. Format prices in Indian Rupees (₹)
9. FORMAT YOUR RESPONSES: Use bullet points (•) for multiple items, properties, or features. Break long responses into clear, readable points. Each property, feature, or key information should be on its own bullet point.
10. Keep responses concise but informative
11. Always end with a helpful suggestion or question
12. PERSONALIZATION: If the user has viewed properties recently, reference them and suggest similar ones. Understand their preferences from browsing history.
13. FRUSTRATION DETECTION: If the user seems frustrated, angry, or asks to "talk to someone", "connect with executive", or "speak with human", acknowledge their need and offer to connect them with an executive. Say: "I understand you'd like to speak with one of our executives. I can connect you right away! Would you like me to do that?"
14. EXECUTIVE CHAT: When user requests executive chat, be helpful and offer to escalate. Don't try to solve complex issues yourself if they ask for human help.

EXAMPLE GOOD RESPONSES:
User: "Show me PGs under 10k"
You: "Great! Here's what I found:
• We have ${budgetRanges.under5k + budgetRanges["5k-10k"]} properties under ₹10,000/month
• Most affordable options start at ₹${stats.minPrice}/month
• You can filter by city and preferences on our listings page
Which city are you looking in? 🏠"

User: "What's the weather?"
You: "I specialize in student accommodations only! 😊 But I can help you find the perfect PG, flat, or hostel near your college. What are you looking for?"

Remember: You are a REAL-TIME assistant with access to actual database. Use the data provided!`

    // Initialize AI provider
    const groq = new Groq({ apiKey })

    // Build conversation history
    const conversationContext = conversationHistory
      ? conversationHistory.map((msg: any) => 
          `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        ).join("\n")
      : ""

    // Create the prompt
    const fullPrompt = `${systemContext}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ""}

USER'S CURRENT MESSAGE: "${message}"
${wantsExecutive ? "\n⚠️ USER IS REQUESTING TO SPEAK WITH AN EXECUTIVE/HUMAN. Acknowledge this and offer to connect them." : ""}

Respond as SecondHome AI Assistant (keep it under 150 words):`

    // Generate response
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: fullPrompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    })
    const text = completion.choices[0]?.message?.content || ""

    // Log for debugging
    console.log(`Chatbot Query: "${message}" -> Response length: ${text.length} chars`)

    return NextResponse.json({
      response: text,
      stats: {
        totalProperties: stats.totalProperties,
        citiesServed: stats.totalCities,
      },
      wantsExecutive,
      recentPropertiesViewed: recentPropertiesViewed.slice(0, 5).map((p: any) => ({
        id: p._id.toString(),
        title: p.title,
        location: p.location,
        city: p.city,
        price: p.price,
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Chatbot error:", error)
    return NextResponse.json(
      {
        response: "I'm having trouble right now. Please try asking something else or refresh the page! 😊",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}



