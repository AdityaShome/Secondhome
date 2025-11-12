import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const { email, unsubscribeToken } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || process.env.HOST_EMAIL,
        pass: process.env.EMAIL_PASSWORD || process.env.HOST_EMAIL_PASSWORD,
      },
    })

    const unsubscribeLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/newsletter/subscribe?token=${unsubscribeToken}`

    await transporter.sendMail({
      from: `"Second Home" <${process.env.EMAIL_USER || process.env.HOST_EMAIL}>`,
      to: email,
      subject: "🎉 Welcome to Second Home Newsletter!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ff6b35; margin: 0;">🏠 Second Home</h1>
            <p style="color: #666; font-size: 14px; margin-top: 5px;">Your Perfect Student Accommodation</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #fff5f2 0%, #ffe8e0 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Welcome Aboard! 🎉</h2>
            <p style="color: #555; line-height: 1.6;">
              Thank you for subscribing to Second Home's newsletter! You've just taken the first step towards finding your perfect student accommodation.
            </p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #333;">What to Expect:</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li>📧 <strong>Weekly Digest</strong> - Every week's best properties delivered to your inbox</li>
              <li>⚡ <strong>Instant Alerts</strong> - Be the first to know about hot new listings</li>
              <li>💎 <strong>Exclusive Deals</strong> - Special offers just for subscribers</li>
              <li>📊 <strong>Market Insights</strong> - Rent trends and neighborhood guides</li>
            </ul>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #ff6b35; margin-bottom: 30px;">
            <p style="color: #555; margin: 0; line-height: 1.6;">
              <strong>Pro Tip:</strong> Create an account on Second Home to save properties, schedule visits, and get personalized recommendations!
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/listings" 
               style="display: inline-block; background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); 
                      color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; 
                      font-weight: bold; font-size: 16px;">
              Browse Properties
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>Questions? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_BASE_URL}/contact" style="color: #ff6b35; text-decoration: none;">Contact Page</a></p>
            <p style="margin-top: 15px;">
              <a href="${unsubscribeLink}" style="color: #999; text-decoration: none;">Unsubscribe</a>
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: "Welcome email sent",
    })
  } catch (error: any) {
    console.error("Error sending welcome email:", error)
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 }
    )
  }
}




