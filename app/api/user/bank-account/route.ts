import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserModel } from "@/models/user"

/**
 * GET - Fetch user's bank account details
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") // For fetching other user's UPI (property owner)

    await connectToDatabase()
    const User = await getUserModel()

    // If userId is provided and user is admin, allow fetching other user's bank account
    // Otherwise, fetch current user's bank account
    let targetUserId = session.user.id
    if (userId && (session.user.role === "admin" || session.user.role === "owner")) {
      targetUserId = userId
    }

    const user = await User.findById(targetUserId).select("bankAccount name email").lean()

    // If user doesn't have bank account, check environment variables as fallback
    let bankAccount = user?.bankAccount
    if (!bankAccount) {
      // Check for bank account in environment variables (for platform-wide merchant account)
      const envUPIId = process.env.MERCHANT_UPI_ID
      const envAccountName = process.env.MERCHANT_ACCOUNT_NAME || "Second Home"
      
      if (envUPIId) {
        bankAccount = {
          upiId: envUPIId,
          accountHolderName: envAccountName,
          accountNumber: process.env.MERCHANT_ACCOUNT_NUMBER || "",
          ifscCode: process.env.MERCHANT_IFSC_CODE || "",
          bankName: process.env.MERCHANT_BANK_NAME || "",
        }
      }
    }

    return NextResponse.json({
      bankAccount: bankAccount || null,
      // Return masked account number for security (only if viewing own account)
      maskedAccountNumber: targetUserId === session.user.id && bankAccount?.accountNumber
        ? `****${bankAccount.accountNumber.slice(-4)}`
        : null,
    })
  } catch (error) {
    console.error("Error fetching bank account:", error)
    return NextResponse.json(
      { error: "An error occurred while fetching bank account" },
      { status: 500 }
    )
  }
}

/**
 * POST/PUT - Update user's bank account details
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { accountNumber, ifscCode, accountHolderName, bankName, upiId } = body

    // Validate required fields
    if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
      return NextResponse.json(
        { error: "Account number, IFSC code, account holder name, and bank name are required" },
        { status: 400 }
      )
    }

    // Validate IFSC code format (11 characters, alphanumeric)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid IFSC code format. Should be like ABCD0123456" },
        { status: 400 }
      )
    }

    await connectToDatabase()
    const User = await getUserModel()

    // Generate UPI ID from account if not provided
    // Format: accountHolderName@bankname (simplified)
    let generatedUPIId = upiId
    if (!generatedUPIId) {
      const bankCode = ifscCode.substring(0, 4).toLowerCase()
      const namePart = accountHolderName
        .toLowerCase()
        .replace(/\s+/g, "")
        .substring(0, 10)
      generatedUPIId = `${namePart}@${bankCode}`
    }

    // Validate UPI ID format if provided
    if (generatedUPIId) {
      const upiIdRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
      if (!upiIdRegex.test(generatedUPIId)) {
        return NextResponse.json(
          { error: "Invalid UPI ID format. Should be like yourname@paytm" },
          { status: 400 }
        )
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        bankAccount: {
          accountNumber,
          ifscCode: ifscCode.toUpperCase(),
          accountHolderName,
          bankName,
          upiId: generatedUPIId,
        },
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password")

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Bank account updated successfully",
      bankAccount: updatedUser.bankAccount,
      maskedAccountNumber: `****${accountNumber.slice(-4)}`,
    })
  } catch (error) {
    console.error("Error updating bank account:", error)
    return NextResponse.json(
      { error: "An error occurred while updating bank account" },
      { status: 500 }
    )
  }
}

