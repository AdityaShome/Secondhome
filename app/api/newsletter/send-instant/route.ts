import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import Newsletter from "@/models/newsletter"
import nodemailer from "nodemailer"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" })

export async function POST(request: NextRequest) {
  try {
    const { propertyData, type = "new_property" } = await request.json()

    if (!propertyData) {
      return NextResponse.json({ error: "Property data required" }, { status: 400 })
    }

    await connectToDatabase()

    // Get subscribers who opted for instant updates
    const subscribers = await Newsletter.find({
      isActive: true,
      "preferences.instantUpdates": true,
    })

    if (subscribers.length === 0) {
      return NextResponse.json({ message: "No subscribers for instant updates" })
    }

    // Generate AI content using SecondHome AI

    const prompt = `Create an EXCITING instant alert email for "Second Home" about a new property listing.

Property Details:
Title: ${propertyData.title}
Location: ${propertyData.location}
Price: ₹${propertyData.price}/month
Type: ${propertyData.type}
${propertyData.description ? `Description: ${propertyData.description}` : ""}

Requirements:
- URGENT and EXCITING tone (this is hot news!)
- Highlight unique features
- Create FOMO (limited availability)
- Strong call-to-action: "View Now" or "Book Your Visit"
- Short and punchy (150-200 words)
- Use emojis for excitement 🔥⚡✨
- Mobile-friendly HTML

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

    // Send emails
    let successCount = 0
    let failCount = 0

    const propertyLink = `${process.env.NEXT_PUBLIC_BASE_URL}/listings/${propertyData._id}`

    for (const subscriber of subscribers) {
      try {
        const unsubscribeLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/newsletter/subscribe?token=${subscriber.unsubscribeToken}`

        await transporter.sendMail({
          from: `"Second Home" <${process.env.EMAIL_USER || process.env.HOST_EMAIL}>`,
          to: subscriber.email,
          subject: `🔥 NEW! ${propertyData.title} - ${propertyData.location}`,
          html: `
            ${emailContent}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${propertyLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); 
                        color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; 
                        font-weight: bold; font-size: 16px;">
                View Property Now
              </a>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
              <p>You're receiving instant alerts because you subscribed to Second Home updates.</p>
              <a href="${unsubscribeLink}" style="color: #ff6b35; text-decoration: none;">Unsubscribe from instant alerts</a>
            </div>
          `,
        })

        successCount++
      } catch (emailError) {
        console.error(`Failed to send email to ${subscriber.email}:`, emailError)
        failCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Instant alert sent to ${successCount} subscribers`,
      stats: {
        total: subscribers.length,
        success: successCount,
        failed: failCount,
      },
    })
  } catch (error: any) {
    console.error("Error sending instant update:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send instant update" },
      { status: 500 }
    )
  }
}







