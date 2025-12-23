"use client"

import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Copy, Check, QrCode, Smartphone, Loader2, Wallet, IndianRupee, ScanLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// UPI App Icons as SVG Components - Real Logos
const GooglePayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const PhonePeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
    <rect width="24" height="24" rx="5" fill="#5F259F"/>
    <circle cx="12" cy="12" r="7" fill="none" stroke="white" strokeWidth="1.2" opacity="0.9"/>
    <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.2" opacity="0.9"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>
)

const PaytmIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
    <rect width="24" height="24" rx="5" fill="#00BAF2"/>
    <path d="M8 8h8v8H8V8zm1.5 1.5v5h5v-5h-5z" fill="white"/>
    <path d="M10.5 10.5h3v3h-3v-3z" fill="#00BAF2"/>
  </svg>
)

const MobiKwikIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
    <rect width="24" height="24" rx="5" fill="#1A237E"/>
    <path d="M7 7h10v2H7V7zm0 3h10v2H7v-2zm0 3h8v2H7v-2z" fill="white"/>
    <path d="M11 9h4v6h-4V9z" fill="#00BCD4"/>
  </svg>
)

interface UPIQRPaymentProps {
  amount: number
  merchantUPIId: string
  merchantName: string
  onPaymentComplete?: (upiId?: string) => void
  bookingId?: string
}

/**
 * Generate UPI payment string
 * Format: upi://pay?pa=<UPI_ID>&pn=<PAYEE_NAME>&am=<AMOUNT>&cu=INR&tn=<TRANSACTION_NOTE>
 */
function generateUPIString(upiId: string, payeeName: string, amount: number, note: string = ""): string {
  const params = new URLSearchParams({
    pa: upiId, // Payee address (UPI ID)
    pn: payeeName, // Payee name
    am: amount.toFixed(2), // Amount
    cu: "INR", // Currency
    tn: note || `Payment for Second Home`, // Transaction note
  })
  return `upi://pay?${params.toString()}`
}

export function UPIQRPayment({
  amount,
  merchantUPIId,
  merchantName,
  onPaymentComplete,
  bookingId,
}: UPIQRPaymentProps) {
  const [userUPIId, setUserUPIId] = useState("")
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMode, setPaymentMode] = useState<"qr" | "upi">("qr")
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "success">("pending")
  const [isPolling, setIsPolling] = useState(false)
  const { toast } = useToast()
  
  // Override merchant name to "SecondHome Official"
  const displayName = "SecondHome Official"

  const upiString = generateUPIString(
    merchantUPIId,
    displayName,
    amount,
    bookingId ? `Booking ${bookingId}` : ""
  )

  const copyUPIString = () => {
    navigator.clipboard.writeText(upiString)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "UPI payment link copied to clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUPIPayment = async () => {
    if (!userUPIId.trim()) {
      toast({
        title: "UPI ID required",
        description: "Please enter your UPI ID to proceed",
        variant: "destructive",
      })
      return
    }

    // Validate UPI ID format
    const upiIdRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
    if (!upiIdRegex.test(userUPIId.trim())) {
      toast({
        title: "Invalid UPI ID",
        description: "Please enter a valid UPI ID (e.g., yourname@paytm, yourname@ybl)",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Open UPI app with payment details
      const userUPIString = generateUPIString(
        merchantUPIId,
        displayName,
        amount,
        bookingId ? `Booking ${bookingId}` : ""
      )

      // Try to open UPI app
      window.location.href = userUPIString

      // After a delay, start polling
      setTimeout(() => {
        setIsPolling(true)
        setPaymentStatus("processing")
        toast({
          title: "Payment initiated",
          description: "Please complete the payment in your UPI app. We'll automatically detect it.",
        })
        setIsProcessing(false)
      }, 1000)
    } catch (error) {
      console.error("Error initiating UPI payment:", error)
      toast({
        title: "Error",
        description: "Failed to open UPI app. Please try scanning the QR code instead.",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }

  // Store Razorpay order ID and payment link if using Razorpay
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null)
  const [razorpayPaymentLinkId, setRazorpayPaymentLinkId] = useState<string | null>(null)
  const [razorpayQrCode, setRazorpayQrCode] = useState<string | null>(null)

  // Initialize Razorpay payment when QR is displayed or UPI ID is entered
  useEffect(() => {
    if (!bookingId || paymentStatus !== "pending" || isProcessing) {
      return
    }

    const initializeRazorpayPayment = async () => {
      try {
        // CRITICAL: ALWAYS create Razorpay Payment Link - this is the ONLY way to track payments automatically
        const response = await fetch("/api/payment/razorpay/payment-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            amount,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log("✅ Razorpay Payment Link created:", data.paymentLinkId)
          console.log("QR Code URL:", data.qrCode)
          console.log("Short URL:", data.shortUrl)
          
          // Always set payment link ID and QR code (even if generated)
          setRazorpayPaymentLinkId(data.paymentLinkId)
          
          if (data.qrCode) {
            setRazorpayQrCode(data.qrCode)
            console.log("✅ QR code set from payment link response")
          } else {
            // Generate QR code from short URL if not provided
            const generatedQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.shortUrl)}`
            setRazorpayQrCode(generatedQrCode)
            console.log("✅ QR code generated from short URL:", generatedQrCode)
          }
          
          // Start polling immediately
          setIsPolling(true)
          setPaymentStatus("processing")
          toast({
            title: "✅ Razorpay QR Code Ready",
            description: "IMPORTANT: Scan THIS QR code (Razorpay) for automatic payment detection!",
          })
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error("❌ Payment Link creation failed:", errorData)
          toast({
            title: "Payment Link Creation Failed",
            description: errorData.details || "Could not create payment link. Please try again.",
            variant: "destructive",
          })
          // Don't fallback to direct UPI - it won't be trackable!
        }
      } catch (error) {
        console.error("❌ Error initializing Razorpay:", error)
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    // Initialize when payment mode changes or QR is shown
    if (paymentMode === "qr" || (paymentMode === "upi" && userUPIId)) {
      initializeRazorpayPayment()
    }
  }, [bookingId, amount, paymentMode, paymentStatus, isProcessing, userUPIId])

  // Automatic payment status polling - IMPROVED
  useEffect(() => {
    if (!bookingId || !isPolling || paymentStatus === "success") {
      return
    }

    const checkPaymentStatus = async () => {
      try {
        // Try Razorpay verification first if order ID or payment link ID exists
        let response
        if (razorpayPaymentLinkId) {
          // Prioritize payment link ID
          console.log("Checking payment link:", razorpayPaymentLinkId)
          response = await fetch(`/api/payment/razorpay/verify?bookingId=${bookingId}&orderId=${razorpayPaymentLinkId}`)
        } else if (razorpayOrderId) {
          console.log("Checking order:", razorpayOrderId)
          response = await fetch(`/api/payment/razorpay/verify?bookingId=${bookingId}&orderId=${razorpayOrderId}`)
        } else {
          response = await fetch(`/api/payment/upi?bookingId=${bookingId}`)
        }
        
        if (response.ok) {
          const data = await response.json()
          console.log("Payment check response:", data)
          
          if (data.isPaid) {
            // Payment detected!
            setIsPolling(false)
            setPaymentStatus("processing")
            
            // Wait a moment to show processing state
            await new Promise(resolve => setTimeout(resolve, 1500))
            
            setPaymentStatus("success")
            
            toast({
              title: "Payment Detected! ✅",
              description: "Your payment has been successfully verified.",
            })
            
            // Wait before calling callback
            setTimeout(() => {
              if (onPaymentComplete) {
                onPaymentComplete(userUPIId || "qr_scan")
              }
            }, 3000)
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error)
        // Don't stop polling on error, just log it
      }
    }

    // Start polling immediately, then every 2 seconds (more frequent)
    checkPaymentStatus()
    const intervalId = setInterval(checkPaymentStatus, 2000) // Check every 2 seconds

    // Stop polling after 10 minutes (600 seconds) to avoid infinite polling
    const timeoutId = setTimeout(() => {
      setIsPolling(false)
      clearInterval(intervalId)
      if (paymentStatus !== "success") {
        toast({
          title: "Payment Verification Timeout",
          description: "Please contact support if you have completed the payment. Our team will verify manually.",
          variant: "destructive",
        })
      }
    }, 600000) // 10 minutes

    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [bookingId, isPolling, paymentStatus, userUPIId, onPaymentComplete, toast, razorpayOrderId])


  return (
    <div className="space-y-6">
      {/* Payment Mode Toggle */}
      <div className="flex gap-3 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
        <Button
          type="button"
          variant={paymentMode === "qr" ? "default" : "ghost"}
          size="lg"
          onClick={() => setPaymentMode("qr")}
          className={`flex-1 font-semibold transition-all ${
            paymentMode === "qr" 
              ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg" 
              : "hover:bg-gray-200"
          }`}
        >
          <QrCode className={`w-5 h-5 mr-2 ${paymentMode === "qr" ? "text-white" : "text-orange-500"}`} />
          Scan QR Code
        </Button>
        <Button
          type="button"
          variant={paymentMode === "upi" ? "default" : "ghost"}
          size="lg"
          onClick={() => setPaymentMode("upi")}
          className={`flex-1 font-semibold transition-all ${
            paymentMode === "upi" 
              ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg" 
              : "hover:bg-gray-200"
          }`}
        >
          <Smartphone className={`w-5 h-5 mr-2 ${paymentMode === "upi" ? "text-white" : "text-orange-500"}`} />
          Enter UPI ID
        </Button>
      </div>

      {paymentMode === "qr" ? (
        <Card className="border-2 border-orange-100">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-blue-50 pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">Scan QR Code to Pay</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-white p-0.5 shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                      <GooglePayIcon />
                    </div>
                    <div className="w-7 h-7 rounded-lg shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                      <PhonePeIcon />
                    </div>
                    <div className="w-7 h-7 rounded-lg shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                      <PaytmIcon />
                    </div>
                    <div className="w-7 h-7 rounded-lg shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                      <MobiKwikIcon />
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">GPay • PhonePe • Paytm • MobiKwik</span>
                </div>
              </div>
            </CardTitle>
            <CardDescription className="mt-2 text-sm">
              Scan this QR code with any UPI app on your phone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code - MUST use Razorpay QR for automatic detection */}
            <div className="flex flex-col items-center p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-dashed border-orange-200 shadow-sm">
              {razorpayQrCode ? (
                // Razorpay Payment Link QR Code (TRACKABLE - This is the one that works!)
                <div className="space-y-3 w-full">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 border-2 border-green-600 rounded-lg shadow-lg">
                    <p className="text-sm text-white font-bold text-center">
                      ✅ Razorpay Payment Link - Auto-Detection Enabled
                    </p>
                    <p className="text-xs text-green-100 text-center mt-1">
                      Scan THIS QR code for automatic payment detection
                    </p>
                  </div>
                  <div className="relative p-4 bg-white rounded-xl shadow-xl border-2 border-green-400 mx-auto">
                    <img 
                      src={razorpayQrCode} 
                      alt="Razorpay Payment QR Code" 
                      className="w-[220px] h-[220px] mx-auto"
                      onError={(e) => {
                        console.error("❌ Failed to load Razorpay QR code image:", razorpayQrCode)
                        toast({
                          title: "QR Code Load Error",
                          description: "Failed to load Razorpay QR code. Please refresh.",
                          variant: "destructive",
                        })
                      }}
                    />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        <ScanLine className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Loading or error state - show message
                <div className="space-y-4 w-full">
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-800 font-semibold text-center">
                      ⏳ Loading Razorpay Payment Link...
                    </p>
                    <p className="text-xs text-yellow-700 text-center mt-1">
                      Please wait while we generate a trackable payment QR code
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  </div>
                </div>
              )}
              <div className="mt-6 text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <IndianRupee className="w-5 h-5 text-orange-600" />
                  <p className="text-2xl font-bold text-gray-900">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Wallet className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-700">{merchantName}</p>
                </div>
                <p className="text-xs font-mono text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block mt-1">{merchantUPIId}</p>
              </div>
            </div>

            {/* UPI Details */}
            <div className="space-y-3 p-5 bg-gradient-to-br from-orange-50 to-blue-50 rounded-xl border border-orange-100">
              <div className="flex items-center justify-between py-2 border-b border-orange-200">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Payee Name:</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{displayName}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold text-gray-700">Amount:</span>
                </div>
                <span className="text-lg font-bold text-orange-600">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <Smartphone className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm font-bold text-blue-900">How to pay:</p>
              </div>
              <ol className="text-xs text-blue-800 space-y-2 list-none">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Open any UPI app on your phone (GPay, PhonePe, Paytm, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Tap on <strong>"Scan QR Code"</strong> in the app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>Point your camera at the QR code above</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                  <span>Enter your UPI PIN to complete payment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Payment will be <strong>automatically detected</strong> once completed</span>
                </li>
              </ol>
            </div>

            {/* Small Payment Progress Loader - Always visible when processing */}
            {paymentStatus === "processing" && (
              <div className="fixed top-4 right-4 z-[100] bg-white rounded-lg shadow-xl border-2 border-blue-200 p-3 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-white"></div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Payment Under Progress</p>
                    <p className="text-[10px] text-gray-600">Verifying...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Status Display - Full Screen */}
            {paymentStatus === "processing" && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Payment Under Progress</h3>
                      <p className="text-xs text-gray-600">Please wait while we verify your payment...</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentStatus === "success" && (
              <div className="p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl border-2 border-green-200 shadow-xl">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl animate-bounce">
                      <Check className="w-12 h-12 text-white" strokeWidth={3} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-ping">
                      <div className="w-6 h-6 bg-yellow-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">Payment Successful! 🎉</h3>
                    <p className="text-base text-gray-700">Your payment of <span className="font-bold text-green-600">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> has been confirmed</p>
                    <p className="text-sm text-gray-600 mt-2">Your booking is now confirmed. Redirecting...</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-detection message */}
            {paymentStatus === "processing" && isPolling && (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 text-center">
                    <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                    Automatically detecting payment... Please complete payment in your UPI app.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-orange-100">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-blue-50 pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">Pay via UPI ID</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-white p-0.5 shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                      <GooglePayIcon />
                    </div>
                    <div className="w-7 h-7 rounded-lg shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                      <PhonePeIcon />
                    </div>
                    <div className="w-7 h-7 rounded-lg shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                      <PaytmIcon />
                    </div>
                    <div className="w-7 h-7 rounded-lg shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                      <MobiKwikIcon />
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">GPay • PhonePe • Paytm • MobiKwik</span>
                </div>
              </div>
            </CardTitle>
            <CardDescription className="mt-2 text-sm">
              Enter your UPI ID to initiate payment directly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="userUPIId" className="flex items-center gap-2 text-base font-semibold">
                <Wallet className="w-5 h-5 text-orange-500" />
                Your UPI ID
              </Label>
              <div className="relative">
                <Input
                  id="userUPIId"
                  placeholder="yourname@paytm / yourname@ybl / yourname@upi"
                  value={userUPIId}
                  onChange={(e) => setUserUPIId(e.target.value)}
                  className="font-mono text-base py-6 pl-12 border-2 border-orange-200 focus:border-orange-500"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Smartphone className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-white p-0.5 shadow-sm border border-gray-200 flex items-center justify-center">
                    <GooglePayIcon />
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-white p-0.5 shadow-sm border border-gray-200 flex items-center justify-center">
                    <PhonePeIcon />
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-white p-0.5 shadow-sm border border-gray-200 flex items-center justify-center">
                    <PaytmIcon />
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Examples: <span className="font-mono font-semibold">yourname@paytm</span>, <span className="font-mono font-semibold">yourname@ybl</span>, <span className="font-mono font-semibold">yourname@upi</span>
                </p>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-orange-50 to-blue-50 rounded-xl border border-orange-100 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-orange-200">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Pay to:</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{displayName}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold text-gray-700">Amount:</span>
                </div>
                <span className="text-lg font-bold text-orange-600">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Small Payment Progress Loader - Always visible when processing */}
            {paymentStatus === "processing" && (
              <div className="fixed top-4 right-4 z-[100] bg-white rounded-lg shadow-xl border-2 border-blue-200 p-3 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-white"></div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Payment Under Progress</p>
                    <p className="text-[10px] text-gray-600">Verifying...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Status Display - Full Screen for UPI ID mode */}
            {paymentStatus === "processing" && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Payment Under Progress</h3>
                      <p className="text-xs text-gray-600">Please wait while we verify your payment...</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentStatus === "success" && (
              <div className="p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl border-2 border-green-200 shadow-xl">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl animate-bounce">
                      <Check className="w-12 h-12 text-white" strokeWidth={3} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-ping">
                      <div className="w-6 h-6 bg-yellow-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">Payment Successful! 🎉</h3>
                    <p className="text-base text-gray-700">Your payment of <span className="font-bold text-green-600">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> has been confirmed</p>
                    <p className="text-sm text-gray-600 mt-2">Your booking is now confirmed. Redirecting...</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {paymentStatus === "pending" && (
              <Button
                onClick={handleUPIPayment}
                disabled={isProcessing || !userUPIId.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-5 h-5 mr-2" />
                    Pay ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                )}
              </Button>
            )}

            {/* Auto-detection message for UPI ID mode */}
            {paymentStatus === "processing" && isPolling && (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 text-center">
                    <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                    Automatically detecting payment... Please complete payment in your UPI app.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

