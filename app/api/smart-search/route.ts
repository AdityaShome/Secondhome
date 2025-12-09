import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { connectToDatabase } from "@/lib/mongodb"
import { Property } from "@/models/property"
import { Mess } from "@/models/mess"

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        suggestions: [],
        intent: null,
        error: "Query too short",
      })
    }

    // Get AI API key
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.error("GROQ_API_KEY not found in environment variables")
      // Fallback to database-only search
      return await fallbackSearch(query)
    }

    // Initialize AI provider
    const groq = new Groq({ apiKey })

    // Connect to database to get real locations
    await connectToDatabase()

    // Get all approved properties
    const properties = await Property.find({
      isApproved: true,
      isRejected: false,
    })
      .select("location city state nearbyColleges")
      .lean()

    const messes = await Mess.find({
      isApproved: true,
      isRejected: false,
    })
      .select("location city state")
      .lean()

    // Extract real locations
    const realLocations = new Set<string>()
    const realCities = new Set<string>()
    const realColleges = new Set<string>()

    properties.forEach((property: any) => {
      if (property.location) realLocations.add(property.location)
      if (property.city) realCities.add(property.city)
      if (property.nearbyColleges) {
        property.nearbyColleges.forEach((c: any) => {
          if (c && c.name) realColleges.add(c.name)
        })
      }
    })

    messes.forEach((mess: any) => {
      if (mess.location) realLocations.add(mess.location)
      if (mess.city) realCities.add(mess.city)
    })

    // Create context for AI
    const locationsList = Array.from(realCities).join(", ")
    const collegesList = Array.from(realColleges).slice(0, 20).join(", ")

    const prompt = `You are a smart location search assistant for a student accommodation platform in India.

Available Cities with Properties: ${locationsList}
Available Colleges: ${collegesList}

User Query: "${query}"

Analyze the user's query and:
1. Identify if they're searching for a city, area, or college
2. Extract the location intent
3. Suggest the best matching location from our available locations ONLY
4. If they mention a college, find the city where that college is located
5. Understand variations (e.g., "blr" = "Bangalore", "hyd" = "Hyderabad")

Return ONLY a JSON object with this exact structure:
{
  "intent": "city" or "college" or "area",
  "location": "the best matching location from available cities",
  "college": "college name if mentioned",
  "confidence": 0.0 to 1.0,
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}

IMPORTANT: Only suggest locations that exist in the Available Cities list. Do not make up locations.`

    // Call AI API
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    })
    const text = completion.choices[0]?.message?.content || ""

    // Parse AI response
    let aiData
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError)
      return await fallbackSearch(query)
    }

    // Verify suggestions exist in our database
    const verifiedSuggestions = aiData.suggestions
      .filter((suggestion: string) => {
        const suggestionLower = suggestion.toLowerCase()
        return (
          Array.from(realCities).some((city) =>
            city.toLowerCase().includes(suggestionLower)
          ) ||
          Array.from(realColleges).some((college) =>
            college.toLowerCase().includes(suggestionLower)
          )
        )
      })
      .slice(0, 5)

    // Get property counts for each suggestion
    const suggestionsWithCounts = await Promise.all(
      verifiedSuggestions.map(async (suggestion: string) => {
        const count = await Property.countDocuments({
          isApproved: true,
          isRejected: false,
          $or: [
            { location: { $regex: suggestion, $options: "i" } },
            { city: { $regex: suggestion, $options: "i" } },
            { "nearbyColleges.name": { $regex: suggestion, $options: "i" } },
          ],
        })

        return {
          value: suggestion,
          label: suggestion,
          type: aiData.intent || "location",
          count,
        }
      })
    )

    return NextResponse.json({
      intent: aiData.intent,
      location: aiData.location,
      college: aiData.college,
      confidence: aiData.confidence,
      suggestions: suggestionsWithCounts.filter((s) => s.count > 0),
    })
  } catch (error) {
    console.error("Error in smart search:", error)
    return await fallbackSearch(
      typeof request === "object"
        ? ((await request.json()) as any).query
        : ""
    )
  }
}

// Fallback search without AI
async function fallbackSearch(query: string) {
  try {
    await connectToDatabase()

    const properties = await Property.find({
      isApproved: true,
      isRejected: false,
      $or: [
        { location: { $regex: query, $options: "i" } },
        { city: { $regex: query, $options: "i" } },
        { "nearbyColleges.name": { $regex: query, $options: "i" } },
      ],
    })
      .select("location city nearbyColleges")
      .limit(5)
      .lean()

    const suggestions = new Set<string>()
    properties.forEach((property: any) => {
      if (property.city) suggestions.add(property.city)
      if (property.location) {
        const area = property.location.split(",")[0].trim()
        if (area) suggestions.add(area)
      }
    })

    const suggestionsArray = Array.from(suggestions).slice(0, 5).map((s) => ({
      value: s,
      label: s,
      type: "location",
      count: 1,
    }))

    return NextResponse.json({
      suggestions: suggestionsArray,
      intent: "location",
      location: query,
      confidence: 0.5,
    })
  } catch (error) {
    console.error("Error in fallback search:", error)
    return NextResponse.json(
      { suggestions: [], intent: null, error: "Search failed" },
      { status: 500 }
    )
  }
}

