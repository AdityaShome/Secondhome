import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { connectToDatabase } from "@/lib/mongodb"
import { OTP } from "@/models/otp"

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const { email, type = "registration" } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim()

    // Validate SMTP credentials (check both naming conventions)
    const emailUser = process.env.EMAIL_USER || process.env.HOST_EMAIL
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.HOST_EMAIL_PASSWORD
    
    if (!emailUser || !emailPassword) {
      console.error("❌ SMTP credentials not configured")
      console.error("Missing:", !emailUser ? "EMAIL_USER/HOST_EMAIL" : "EMAIL_PASSWORD/HOST_EMAIL_PASSWORD")
      return NextResponse.json(
        { error: "Email service not configured. Please contact support." },
        { status: 500 }
      )
    }

    await connectToDatabase()

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Delete any existing OTP for this email (check both normalized and original)
    await OTP.deleteMany({ 
      $or: [
        { email: normalizedEmail },
        { email: email }
      ],
      type 
    })

    // Save OTP to database with normalized email
    await OTP.create({
      email: normalizedEmail,
      otp,
      type,
      expiresAt,
    })

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPassword.replace(/\s/g, ''), // Remove any spaces
      },
    })

    // Email content
    const mailOptions = {
      from: `"Second Home" <${emailUser}>`,
      to: normalizedEmail,
      subject: type === "registration" 
        ? "🔐 Verify Your Email - Second Home Property Owner Registration"
        : "🔐 Your Login OTP - Second Home",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
              .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: #f5f5f5; border: 2px dashed #ff6b35; padding: 30px; text-align: center; border-radius: 8px; margin: 20px 0; }
              .otp-code { font-size: 48px; font-weight: bold; color: #ff6b35; letter-spacing: 10px; font-family: 'Courier New', monospace; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏠 Second Home</h1>
                <p>${type === "registration" ? "Property Owner Registration" : "Secure Login"}</p>
              </div>
              <div class="content">
                <h2>${type === "registration" ? "Welcome to Second Home!" : "Login Verification"}</h2>
                <p>${type === "registration" ? "Thank you for registering as a property owner on Second Home. To complete your registration, please verify your email address using the OTP below:" : "For your security, please use the OTP below to sign in:"}</p>
                
                <div class="otp-box">
                  <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Your Verification Code:</div>
                  <div class="otp-code">${otp}</div>
                  <div style="font-size: 12px; color: #888; margin-top: 10px;">Valid for 10 minutes</div>
                </div>

                <div class="warning">
                  <strong>⚠️ Security Notice:</strong><br>
                  Never share this OTP with anyone. Second Home staff will never ask for your OTP.
                </div>

                <p style="color: #666; font-size: 14px;">
                  If you didn't request this ${type === "registration" ? "registration" : "login"}, please ignore this email.
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Second Home. All rights reserved.</p>
                <p>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    // Send email
    await transporter.sendMail(mailOptions)

    console.log(`✅ OTP sent to ${normalizedEmail}`)

    return NextResponse.json({ 
      message: "OTP sent successfully",
      expiresIn: 600 // 10 minutes in seconds
    })
  } catch (error) {
    console.error("❌ Error sending OTP:", error)
    return NextResponse.json(
      { 
        error: "Failed to send OTP",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

