"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CreditCard, Wallet, BanknoteIcon as Bank, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { UPIQRPayment } from "@/components/upi-qr-payment"

declare global {
  interface Window {
    paypal?: any
  }
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  amount: number
  propertyName: string
  propertyOwnerId?: string // Property owner's user ID to fetch their UPI ID
}

export function PaymentModal({ isOpen, onClose, bookingId, amount, propertyName, propertyOwnerId }: PaymentModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState("paypal")
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const [paypalButtonsRendered, setPaypalButtonsRendered] = useState(false)
  const [merchantUPIId, setMerchantUPIId] = useState("")
  const [merchantName, setMerchantName] = useState("Second Home")
  const [isFetchingMerchantUPI, setIsFetchingMerchantUPI] = useState(false)
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const paypalCurrency = process.env.NEXT_PUBLIC_PAYPAL_CURRENCY || "USD"

  // Fetch merchant UPI ID when UPI is selected
  useEffect(() => {
    if (isOpen && paymentMethod === "upi" && !merchantUPIId) {
      fetchMerchantUPI()
    }
  }, [isOpen, paymentMethod, merchantUPIId])

  const fetchMerchantUPI = async () => {
    setIsFetchingMerchantUPI(true)
    try {
      const url = propertyOwnerId 
        ? `/api/user/bank-account?userId=${propertyOwnerId}`
        : `/api/user/bank-account`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (data.bankAccount?.upiId) {
          setMerchantUPIId(data.bankAccount.upiId)
          setMerchantName(data.bankAccount.accountHolderName || "Second Home")
        } else {
          // Fallback to environment variable
          setMerchantUPIId(process.env.NEXT_PUBLIC_MERCHANT_UPI_ID || "")
          setMerchantName(process.env.NEXT_PUBLIC_MERCHANT_ACCOUNT_NAME || "Second Home")
        }
      } else {
        // Fallback to environment variable
        setMerchantUPIId(process.env.NEXT_PUBLIC_MERCHANT_UPI_ID || "")
        setMerchantName(process.env.NEXT_PUBLIC_MERCHANT_ACCOUNT_NAME || "Second Home")
      }
    } catch (error) {
      console.error("Error fetching merchant UPI:", error)
      // Fallback to environment variable
      setMerchantUPIId(process.env.NEXT_PUBLIC_MERCHANT_UPI_ID || "")
      setMerchantName(process.env.NEXT_PUBLIC_MERCHANT_ACCOUNT_NAME || "Second Home")
    } finally {
      setIsFetchingMerchantUPI(false)
    }
  }

  // Reset PayPal state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPaypalButtonsRendered(false)
      setPaypalLoaded(false)
      return
    }
  }, [isOpen])

  // Load PayPal SDK when user selects PayPal
  useEffect(() => {
    // Only load PayPal when modal is open AND PayPal is selected
    if (!isOpen || paymentMethod !== "paypal") {
      return
    }

    if (!paypalClientId) {
      toast({
        title: "Payment unavailable",
        description: "PayPal client ID missing. Please contact support.",
        variant: "destructive",
      })
      return
    }

    // Already loaded
    if (window.paypal) {
      setPaypalLoaded(true)
      return
    }

    // Check if script exists but didn't load (zombie script)
    const existingScript = document.querySelector('script[src*="paypal.com/sdk"]')
    if (existingScript) {
      console.log("⏳ Found existing PayPal script tag...")
      
      // If window.paypal exists, we're good
      if (window.paypal && window.paypal.Buttons) {
        console.log("✅ PayPal already fully loaded!")
        setPaypalLoaded(true)
        return
      }
      
      // Script exists but didn't load - remove it and start fresh
      console.log("🗑️ Removing failed/incomplete script tag")
      existingScript.remove()
      // Fall through to create new script below
    }

    // Create script
    const script = document.createElement("script")
    const scriptUrl = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=${paypalCurrency}&intent=capture`
    script.src = scriptUrl
    script.async = true

    script.onload = () => {
      // Wait for PayPal SDK to actually initialize
      let attempts = 0
      const checkPayPal = setInterval(() => {
        attempts++

        if (window.paypal) {
          if (window.paypal.Buttons) {
            clearInterval(checkPayPal)
            setPaypalLoaded(true)
          } else {
            // keep waiting
          }
        }

        if (attempts > 50) { // 5 seconds
          clearInterval(checkPayPal)
          toast({
            title: "PayPal Load Failed",
            description: "Check console for details. May be blocked by ad blocker.",
            variant: "destructive",
          })
        }
      }, 100)
    }
    
    script.onerror = () => {
      toast({
        title: "Payment Error",
        description: "Failed to load PayPal SDK. Check your internet connection.",
        variant: "destructive",
      })
    }
    
    document.head.appendChild(script)
  }, [isOpen, paymentMethod, toast, paypalClientId, paypalCurrency])  // Re-run when paymentMethod changes!

  // Render PayPal buttons when ready
  useEffect(() => {
    if (paymentMethod === "paypal" && currentStep === 2 && paypalLoaded && window.paypal && !paypalButtonsRendered) {
      const timer = setTimeout(() => {
        renderPayPalButtons()
      }, 500)
      
      return () => {
        clearTimeout(timer)
      }
    }
  }, [paymentMethod, currentStep, paypalLoaded, paypalButtonsRendered])

  const renderPayPalButtons = () => {
    if (!window.paypal) {
      toast({
        title: "PayPal Error",
        description: "PayPal SDK not loaded",
        variant: "destructive",
      })
      return
    }
    
    if (!window.paypal.Buttons) {
      toast({
        title: "PayPal Error",
        description: "PayPal Buttons not initialized",
        variant: "destructive",
      })
      return
    }
    
    console.log("✅ window.paypal.Buttons confirmed available!")
    
    if (paypalButtonsRendered) {
      return
    }

    const container = document.getElementById("paypal-button-container")
    if (!container) {
      toast({
        title: "Container Error",
        description: "PayPal container not found",
        variant: "destructive",
      })
      return
    }

    window.paypal
      .Buttons({
        createOrder: async () => {
          try {
            const response = await fetch("/api/payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId,
                action: "create",
              }),
            })

            const data = await response.json()

            if (!response.ok) {
              throw new Error(data.error || "Failed to create PayPal order")
            }

            return data.orderId
          } catch (error) {
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to create payment order",
              variant: "destructive",
            })
            throw error
          }
        },
        onApprove: async (data: any) => {
          try {
            setIsProcessing(true)

            const response = await fetch("/api/payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderID,
                action: "capture",
              }),
            })

            const result = await response.json()

            if (!response.ok) {
              throw new Error(result.error || "Payment capture failed")
            }

            // Move to success step
            setCurrentStep(3)

            toast({
              title: "Payment successful",
              description: "Your booking has been confirmed",
            })

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              router.push("/dashboard")
              onClose()
            }, 3000)
          } catch (error) {
            toast({
              title: "Payment failed",
              description: error instanceof Error ? error.message : "Failed to process payment",
              variant: "destructive",
            })
            setIsProcessing(false)
          }
        },
        onError: (err: any) => {
          toast({
            title: "Payment error",
            description: "An error occurred with PayPal. Please try again.",
            variant: "destructive",
          })
        },
        onCancel: () => {
          toast({
            title: "Payment cancelled",
            description: "You cancelled the payment",
          })
        },
      })
      .render("#paypal-button-container")
      .then(() => {
        console.log("✅ PayPal buttons rendered successfully!")
        setPaypalButtonsRendered(true)
      })
      .catch((error: any) => {
        console.error("❌ PayPal button render error:", error)
        toast({
          title: "Render Error",
          description: "Failed to render PayPal buttons. Please refresh the page.",
          variant: "destructive",
        })
      })
  }

  const handlePayment = async () => {
    if (paymentMethod === "card" && (!cardNumber || !cardName || !cardExpiry || !cardCvv)) {
      toast({
        title: "Missing information",
        description: "Please fill in all card details",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          paymentMethod,
        }),
      })

      if (!response.ok) {
        throw new Error("Payment failed")
      }

      const data = await response.json()

      // Move to success step
      setCurrentStep(3)

      toast({
        title: "Payment successful",
        description: "Your booking has been confirmed",
      })

      // Redirect to bookings page after 3 seconds
      setTimeout(() => {
        router.push(`/bookings/${bookingId}`)
        onClose()
      }, 3000)
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Payment failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")

    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }

    return v
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          {currentStep > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-0"
              onClick={() => setCurrentStep(1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <DialogTitle className={currentStep > 1 ? "text-center" : ""}>Complete Payment</DialogTitle>
          <DialogDescription className={currentStep > 1 ? "text-center" : ""}>
            Pay ₹{amount} to confirm your booking at {propertyName}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="py-4">
                <RadioGroup value={paymentMethod} onValueChange={(value) => {
                  setPaymentMethod(value)
                  setPaypalButtonsRendered(false)
                }} className="space-y-4">
                  <div className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer hover:bg-gray-50 transition-colors bg-blue-50 border-blue-200">
                    <RadioGroupItem value="paypal" id="payment-method-paypal" />
                    <Label htmlFor="payment-method-paypal" className="flex items-center cursor-pointer">
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="#003087">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .759-.653h8.63c2.964 0 4.996 1.242 5.429 3.317.433 2.076-.409 4.515-3.308 5.707l1.846-2.98c1.527-2.466.863-4.86-1.771-6.393C14.894 1.446 12.396.767 9.43.767H3.667a.77.77 0 0 0-.759.653L0 18.336a.641.641 0 0 0 .633.74h4.606a.77.77 0 0 0 .759-.653l1.078-5.086z"/>
                      </svg>
                      PayPal (Recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center cursor-pointer">
                      <CreditCard className="mr-2 h-5 w-5 text-primary" />
                      Credit/Debit Card
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="flex items-center cursor-pointer flex-1">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-6 w-6 text-orange-500" />
                          <span className="font-semibold">UPI</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <div className="w-7 h-7 rounded-lg bg-white p-0.5 shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                            <svg viewBox="0 0 24 24" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                          </div>
                          <div className="w-7 h-7 rounded-lg shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                            <svg viewBox="0 0 24 24" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                              <rect width="24" height="24" rx="5" fill="#5F259F"/>
                              <circle cx="12" cy="12" r="7" fill="none" stroke="white" strokeWidth="1.2" opacity="0.9"/>
                              <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.2" opacity="0.9"/>
                              <circle cx="12" cy="12" r="2" fill="white"/>
                            </svg>
                          </div>
                          <div className="w-7 h-7 rounded-lg shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                            <svg viewBox="0 0 24 24" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                              <rect width="24" height="24" rx="5" fill="#00BAF2"/>
                              <path d="M8 8h8v8H8V8zm1.5 1.5v5h5v-5h-5z" fill="white"/>
                              <path d="M10.5 10.5h3v3h-3v-3z" fill="#00BAF2"/>
                            </svg>
                          </div>
                          <div className="w-7 h-7 rounded-lg shadow-md border border-gray-200 flex items-center justify-center overflow-hidden">
                            <svg viewBox="0 0 24 24" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                              <rect width="24" height="24" rx="5" fill="#1A237E"/>
                              <path d="M7 7h10v2H7V7zm0 3h10v2H7v-2zm0 3h8v2H7v-2z" fill="white"/>
                              <path d="M11 9h4v6h-4V9z" fill="#00BCD4"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="netbanking" id="netbanking" />
                    <Label htmlFor="netbanking" className="flex items-center cursor-pointer">
                      <Bank className="mr-2 h-5 w-5 text-primary" />
                      Net Banking
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <DialogFooter>
                <Button onClick={() => setCurrentStep(2)}>Continue</Button>
              </DialogFooter>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="py-4 space-y-4">
                {paymentMethod === "paypal" && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click the PayPal button below to complete your payment securely.
                    </p>
                    
                    {/* Loading state - OUTSIDE the PayPal container */}
                    {!paypalButtonsRendered && (
                      <div className="flex flex-col items-center gap-3 py-8 mb-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">Loading PayPal...</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {!paypalLoaded ? "Connecting to PayPal..." : "Preparing payment buttons..."}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">This should take just a moment</p>
                      </div>
                    )}
                    
                    {/* PayPal container - React won't manage this, PayPal SDK will */}
                    <div 
                      id="paypal-button-container" 
                      className="min-h-[150px]"
                      style={{ display: paypalButtonsRendered ? 'block' : 'none' }}
                    ></div>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        maxLength={19}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        placeholder="Enter cardholder name"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardExpiry">Expiry Date</Label>
                        <Input
                          id="cardExpiry"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardCvv">CVV</Label>
                        <Input
                          id="cardCvv"
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ""))}
                          maxLength={3}
                          type="password"
                        />
                      </div>
                    </div>
                  </>
                )}

                {paymentMethod === "upi" && (
                  <div className="space-y-4">
                    {isFetchingMerchantUPI ? (
                      <div className="flex flex-col items-center gap-3 py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading UPI details...</p>
                      </div>
                    ) : merchantUPIId ? (
                      <UPIQRPayment
                        amount={amount}
                        merchantUPIId={merchantUPIId}
                        merchantName={merchantName}
                        bookingId={bookingId}
                        onPaymentComplete={(upiId) => {
                          // Move to success step
                          setCurrentStep(3)
                          toast({
                            title: "Payment successful",
                            description: "Your booking has been confirmed",
                          })
                          // Redirect to bookings page after 3 seconds
                          setTimeout(() => {
                            router.push(`/bookings/${bookingId}`)
                            onClose()
                          }, 3000)
                        }}
                      />
                    ) : (
                      <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
                        <p className="text-sm text-destructive">
                          UPI payment is not available. Please contact support or use another payment method.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "netbanking" && (
                  <div className="space-y-2">
                    <Label htmlFor="bank">Select Bank</Label>
                    <select
                      id="bank"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select your bank</option>
                      <option value="sbi">State Bank of India</option>
                      <option value="hdfc">HDFC Bank</option>
                      <option value="icici">ICICI Bank</option>
                      <option value="axis">Axis Bank</option>
                      <option value="kotak">Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                {paymentMethod !== "paypal" && paymentMethod !== "upi" && (
                  <Button onClick={handlePayment} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay ₹${amount}`
                    )}
                  </Button>
                )}
              </DialogFooter>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="py-8 text-center"
            >
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
              <p className="text-muted-foreground mb-6">
                Your booking has been confirmed. You will be redirected to your bookings page shortly.
              </p>
              <div className="animate-pulse">
                <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
