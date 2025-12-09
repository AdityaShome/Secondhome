import { NextResponse } from "next/server"
import Groq from "groq-sdk"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { location, insights, properties, budget } = body

    const GROQ_API_KEY = process.env.GROQ_API_KEY

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    const groq = new Groq({ apiKey: GROQ_API_KEY })

    // Build detailed prompt for AI
    const prompt = `You are an AI real estate advisor for students and bachelors in India. Analyze this location and provide insights.

Location: ${location}

Area Scores (out of 100):
- Overall Bachelor Score: ${insights.scores.overall}
- Food & Dining: ${insights.scores.food} (${insights.restaurants} restaurants)
- Connectivity: ${insights.scores.connectivity} (${insights.transport} transport options)
- Safety: ${insights.scores.safety} (${insights.police} police stations)
- Night Safety: ${insights.scores.nightSafety}
- Healthcare: ${insights.scores.health} (${insights.hospitals} hospitals, ${insights.pharmacies} pharmacies)
- Convenience: ${insights.scores.convenience} (${insights.groceries} groceries, ${insights.atms} ATMs)
- Fitness: ${insights.scores.fitness} (${insights.gyms} gyms)
- Walkability: ${insights.scores.walkability}
- WiFi Availability: ${insights.scores.wifiAvailability} (${insights.cafes} cafes)

Available Properties: ${properties}
Student's Budget: ₹${budget}/month

Cost Estimate:
- Food: ₹${insights.costEstimate.food}
- Transport: ₹${insights.costEstimate.transport}
- Misc: ₹${insights.costEstimate.misc}
- Total (excl. rent): ₹${insights.costEstimate.total}

24/7 Services Available: ${insights.is24x7Available ? 'Yes' : 'No'}

Based on this data, provide:
1. A concise recommendation (2-3 sentences) about whether this location is suitable for a student/bachelor
2. List 3-4 key pros (positive aspects)
3. List 2-3 key cons (concerns or limitations)
4. Identify what type of student this location is "Best For" (e.g., "engineering students", "budget-conscious students", "fitness enthusiasts", etc.)
5. A match score (0-100) indicating how well this location suits a typical bachelor/student

Format your response as JSON with this structure:
{
  "recommendation": "Your 2-3 sentence recommendation",
  "pros": ["pro1", "pro2", "pro3", "pro4"],
  "cons": ["con1", "con2", "con3"],
  "bestFor": "Type of student this suits best",
  "matchScore": 85
}

Be honest, balanced, and practical. Consider Indian context and student lifestyle.`

    // Call AI provider
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    })

    if (!completion.choices || completion.choices.length === 0) {
      console.error("AI provider error: No response")
      
      // Fallback response
      return NextResponse.json({
        recommendation: `${location} shows a bachelor score of ${insights.scores.overall}/100, indicating ${
          insights.scores.overall >= 70 ? 'good' : 'moderate'
        } suitability for students.`,
        pros: [
          insights.scores.food >= 70 ? "Good food options available" : "Limited dining options",
          insights.scores.connectivity >= 70 ? "Well-connected area" : "Basic connectivity",
          insights.scores.safety >= 70 ? "Safe neighborhood" : "Average safety",
        ],
        cons: [
          insights.scores.overall < 70 ? "Some amenities may be limited" : "Higher cost of living",
          properties === 0 ? "Few properties available" : "High demand area",
        ],
        bestFor: "Students seeking " + (insights.scores.overall >= 70 ? "a well-rounded location" : "affordable options"),
        matchScore: Math.min(95, insights.scores.overall + 10),
      })
    }

    const aiText = completion.choices[0]?.message?.content || ""
    console.log("AI response:", aiText)

    // Parse AI response
    if (aiText) {

      // Try to extract JSON from the response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          return NextResponse.json(parsed)
        } catch (e) {
          console.error("Failed to parse JSON from AI response:", e)
        }
      }

      // If no JSON, create structured response from text
      return NextResponse.json({
        recommendation: aiText.substring(0, 300),
        pros: ["AI analysis completed"],
        cons: ["Detailed analysis available"],
        bestFor: "General students",
        matchScore: insights.scores.overall,
      })
    }

    // Fallback if AI fails
    return NextResponse.json({
      recommendation: `${location} has a bachelor score of ${insights.scores.overall}/100. ${
        insights.scores.overall >= 80 ? 'Excellent choice for students!' : 
        insights.scores.overall >= 60 ? 'Good option with decent facilities.' :
        'Consider exploring other areas for better amenities.'
      }`,
      pros: [
        insights.scores.food >= 70 && "Great food scene",
        insights.scores.connectivity >= 70 && "Excellent connectivity",
        insights.scores.safety >= 70 && "Safe area",
        insights.scores.convenience >= 70 && "Very convenient",
      ].filter(Boolean),
      cons: [
        insights.scores.food < 50 && "Limited food options",
        insights.scores.connectivity < 50 && "Poor connectivity",
        insights.scores.safety < 60 && "Safety concerns",
        properties === 0 && "No properties available",
      ].filter(Boolean),
      bestFor: insights.scores.overall >= 70 ? "Students seeking quality living" : "Budget-conscious students",
      matchScore: Math.min(95, insights.scores.overall + 5),
    })
  } catch (error) {
    console.error("AI insights error:", error)
    return NextResponse.json(
      {
        error: "Failed to get AI insights",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

