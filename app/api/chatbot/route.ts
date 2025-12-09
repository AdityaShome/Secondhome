import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"
import { Mess } from "@/models/mess"

export async function POST(request: Request) {
  try {
    const { message, conversationHistory } = await request.json()

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

    // Create comprehensive context for AI
    const systemContext = `You are SecondHome AI Assistant, a friendly and helpful chatbot for SecondHome - India's #1 student accommodation platform.

YOUR IDENTITY:
- You are part of SecondHome website (https://secondhome.com)
- You help students find PGs, Flats, Hostels, and Messes near their colleges
- You have access to REAL-TIME data from our database
- You ONLY answer questions about SecondHome and student accommodations
- You DO NOT answer general questions unrelated to accommodations

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

HOW TO RESPOND:
1. Be conversational, friendly, and helpful
2. Use the REAL data provided above - NO MADE UP INFORMATION
3. When suggesting properties, reference actual listings
4. Provide specific numbers and statistics
5. Guide users to explore more on the website
6. If asked about something not related to accommodations, politely redirect
7. Use emojis sparingly and professionally (🏠, 🎓, 💰, ⭐, 📍)
8. Format prices in Indian Rupees (₹)
9. Keep responses concise but informative (2-4 sentences ideal)
10. Always end with a helpful suggestion or question

EXAMPLE GOOD RESPONSES:
User: "Show me PGs under 10k"
You: "Great! We have ${budgetRanges.under5k + budgetRanges["5k-10k"]} properties under ₹10,000/month. The most affordable options start at ₹${stats.minPrice}. You can filter by city and preferences on our listings page. Which city are you looking in? 🏠"

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



