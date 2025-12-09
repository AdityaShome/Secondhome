import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import Newsletter from "@/models/newsletter"
import { Property } from "@/models/property"
import nodemailer from "nodemailer"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" })

export async function POST(request: NextRequest) {
  try {
    // Security: Add API key validation (optional)
    const authHeader = request.headers.get("authorization")
    const SECRET_KEY = process.env.NEWSLETTER_SECRET_KEY || "your-secret-key-123"
    
    if (authHeader !== `Bearer ${SECRET_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    // Get active subscribers
    const subscribers = await Newsletter.find({
      isActive: true,
      "preferences.weeklyDigest": true,
    })

    if (subscribers.length === 0) {
      return NextResponse.json({ message: "No active subscribers" })
    }

    // Get properties from last 7 days
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const newProperties = await Property.find({
      createdAt: { $gte: oneWeekAgo },
      approvalStatus: "approved",
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title location price type images createdAt")

    if (newProperties.length === 0) {
      return NextResponse.json({ message: "No new properties this week" })
    }

    // Generate AI content using SecondHome AI

    const propertyData = newProperties.map((p: any) => ({
      title: p.title,
      location: p.location,
      price: p.price,
      type: p.type,
    }))

    const prompt = `Create a professional, engaging weekly newsletter email for "Second Home" - a student accommodation platform.

Properties this week:
${JSON.stringify(propertyData, null, 2)}

Requirements:
- Professional yet friendly tone
- Highlight top 3-5 properties
- Include price insights and trends
- Add a compelling call-to-action
- Keep it concise (200-300 words)
- Use emojis sparingly for visual appeal
- End with a personal touch

Format as HTML with inline CSS (email-safe).`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    })
    const emailContent = completion.choices[0]?.message?.content || ""

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || process.env.HOST_EMAIL,
        pass: process.env.EMAIL_PASSWORD || process.env.HOST_EMAIL_PASSWORD,
      },
    })

    // Send emails to all subscribers
    let successCount = 0
    let failCount = 0

    for (const subscriber of subscribers) {
      try {
        const unsubscribeLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/newsletter/subscribe?token=${subscriber.unsubscribeToken}`

        await transporter.sendMail({
          from: `"Second Home" <${process.env.EMAIL_USER || process.env.HOST_EMAIL}>`,
          to: subscriber.email,
          subject: `🏠 This Week at Second Home: ${newProperties.length} New Properties!`,
          html: `
            ${emailContent}
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
              <p>You're receiving this because you subscribed to Second Home updates.</p>
              <a href="${unsubscribeLink}" style="color: #ff6b35; text-decoration: none;">Unsubscribe</a>
            </div>
          `,
        })

        // Update last email sent
        subscriber.lastEmailSent = new Date()
        await subscriber.save()

        successCount++
      } catch (emailError) {
        console.error(`Failed to send email to ${subscriber.email}:`, emailError)
        failCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Weekly newsletter sent to ${successCount} subscribers`,
      stats: {
        total: subscribers.length,
        success: successCount,
        failed: failCount,
        propertiesIncluded: newProperties.length,
      },
    })
  } catch (error: any) {
    console.error("Error sending weekly newsletter:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send newsletter" },
      { status: 500 }
    )
  }
}







