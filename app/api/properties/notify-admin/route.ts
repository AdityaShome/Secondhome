import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(req: Request) {
  try {
    const { propertyId, propertyTitle, ownerName, ownerEmail, aiReview } = await req.json()

    // Check if email credentials are configured
    const emailUser = process.env.EMAIL_USER || process.env.HOST_EMAIL
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.HOST_EMAIL_PASSWORD

    if (!emailUser || !emailPassword) {
      console.log("⚠️ Email credentials not configured. Property saved but notification not sent.")
      console.log("📧 Admin email would be sent to: srijitd248@gmail.com")
      console.log(`📋 Property: ${propertyTitle} by ${ownerName}`)
      console.log(`🆔 Property ID: ${propertyId}`)
      
      return NextResponse.json({ 
        message: "Property saved successfully. Email notification skipped (credentials not configured)",
        propertyId,
        adminEmail: "srijitd248@gmail.com"
      })
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPassword.replace(/\s/g, ''), // Remove any spaces
      },
    })

    // Email content with AI Review details
    const aiReviewHTML = aiReview ? `
      <div class="property-details" style="background: ${aiReview.score >= 70 ? '#d4edda' : aiReview.score >= 50 ? '#fff3cd' : '#f8d7da'}; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">🤖 AI Verification Results</h3>
        <div class="detail-row">
          <span class="label">AI Score:</span> <strong style="font-size: 18px;">${aiReview.score}/100</strong>
        </div>
        <div class="detail-row">
          <span class="label">Confidence:</span> ${aiReview.confidence}%
        </div>
        <div class="detail-row">
          <span class="label">Recommendation:</span> <strong>${aiReview.recommendation}</strong>
        </div>
        <div class="detail-row">
          <span class="label">Reason:</span> ${aiReview.reason}
        </div>
        ${aiReview.redFlags && aiReview.redFlags.length > 0 ? `
          <div class="detail-row">
            <span class="label">⚠️ Red Flags:</span>
            <ul style="margin: 5px 0;">
              ${aiReview.redFlags.map((flag: string) => `<li>${flag}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    ` : ''

    const mailOptions = {
      from: `"Second Home" <${emailUser}>`,
      to: "srijitd248@gmail.com", // Admin email (your email)
      subject: `🏠 ${aiReview ? (aiReview.score >= 70 ? '✅' : '⚠️') : ''} New Property Listing - ${propertyTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
              .header { background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
              .property-details { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; color: #FF6B35; }
              .button { display: inline-block; padding: 12px 30px; background: #FF6B35; color: white !important; text-decoration: none; border-radius: 25px; margin: 10px 5px; }
              .button.approve { background: #28a745; }
              .button.reject { background: #dc3545; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏠 New Property Submission</h1>
                <p>Manual verification required</p>
              </div>
              <div class="content">
                ${aiReviewHTML}
                
                <div class="property-details">
                  <h3 style="margin-top: 0;">📋 Property Details</h3>
                  <div class="detail-row">
                    <span class="label">Property Title:</span> ${propertyTitle}
                  </div>
                  <div class="detail-row">
                    <span class="label">Owner Name:</span> ${ownerName}
                  </div>
                  <div class="detail-row">
                    <span class="label">Owner Email:</span> ${ownerEmail}
                  </div>
                  <div class="detail-row">
                    <span class="label">Property ID:</span> ${propertyId}
                  </div>
                  <div class="detail-row">
                    <span class="label">Submitted:</span> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </div>
                </div>

                <p><strong>Action Required:</strong> This property listing requires your manual approval before it can go live on Second Home.</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://secondhome-eight.vercel.app/admin/properties" class="button">
                    📋 Go to Admin Panel
                  </a>
                  <a href="https://secondhome-eight.vercel.app/listings/${propertyId}" class="button">
                    👁️ Preview Property
                  </a>
                </div>

                <p style="color: #888; font-size: 14px; text-align: center;">
                  <strong>💡 Quick Actions:</strong><br/>
                  Login to your admin panel to approve or reject this listing
                </p>
              </div>
              <div class="footer">
                <p><strong>Second Home</strong> - Student Accommodation Platform</p>
                <p>📧 srijitd248@gmail.com | 🌐 secondhome-eight.vercel.app</p>
                <p style="font-size: 11px;">This is an automated notification for property listings requiring manual verification.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    // Send email
    await transporter.sendMail(mailOptions)

    console.log("✅ Admin notification email sent to: srijitd248@gmail.com")
    console.log(`📧 Subject: New Property Listing - ${propertyTitle}`)

    return NextResponse.json({ 
      message: "Admin notification sent successfully to srijitd248@gmail.com",
      adminEmail: "srijitd248@gmail.com",
      propertyId
    })
  } catch (error) {
    console.error("❌ Error sending admin notification:", error)
    console.log("📧 Failed to notify: srijitd248@gmail.com")
    console.log(`📋 Property: ${propertyTitle} (ID: ${propertyId})`)
    
    return NextResponse.json(
      { 
        error: "Failed to send email notification", 
        details: error instanceof Error ? error.message : "Unknown error",
        note: "Property was saved successfully. Only email notification failed.",
        adminEmail: "srijitd248@gmail.com"
      },
      { status: 500 }
    )
  }
}

