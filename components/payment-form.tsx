"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CreditCard, Wallet, Building } from "lucide-react"

const paymentSchema = z.object({
  paymentMethod: z.enum(["card", "upi", "netbanking"]),
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvv: z.string().optional(),
  upiId: z.string().optional(),
  bank: z.string().optional(),
})

interface PaymentFormProps {
  amount: number
  bookingId: string
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentForm({ amount, bookingId, onSuccess, onCancel }: PaymentFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "card",
    },
  })

  const paymentMethod = form.watch("paymentMethod")

  async function onSubmit(values: z.infer<typeof paymentSchema>) {
    setIsProcessing(true)

    try {
      // Validate based on payment method
      if (values.paymentMethod === "card") {
        if (!values.cardNumber || !values.cardName || !values.cardExpiry || !values.cardCvv) {
          toast({
            title: "Missing information",
            description: "Please fill in all card details",
            variant: "destructive",
          })
          setIsProcessing(false)
          return
        }
      } else if (values.paymentMethod === "upi" && !values.upiId) {
        toast({
          title: "Missing information",
          description: "Please enter your UPI ID",
          variant: "destructive",
        })
        setIsProcessing(false)
        return
      } else if (values.paymentMethod === "netbanking" && !values.bank) {
        toast({
          title: "Missing information",
          description: "Please select your bank",
          variant: "destructive",
        })
        setIsProcessing(false)
        return
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Payment successful",
        description: "Your booking has been confirmed",
      })

      onSuccess()
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="bg-blue-50">
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>Complete your payment of ₹{amount}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex items-center cursor-pointer">
                          <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                          Credit/Debit Card
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="upi" id="upi" />
                        <Label htmlFor="upi" className="flex items-center cursor-pointer">
                          <Wallet className="mr-2 h-4 w-4 text-blue-600" />
                          UPI
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="netbanking" id="netbanking" />
                        <Label htmlFor="netbanking" className="flex items-center cursor-pointer">
                          <Building className="mr-2 h-4 w-4 text-blue-600" />
                          Net Banking
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {paymentMethod === "card" && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234 5678 9012 3456"
                          {...field}
                          onChange={(e) => field.onChange(formatCardNumber(e.target.value))}
                          maxLength={19}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cardName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cardholder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter cardholder name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cardExpiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="MM/YY"
                            {...field}
                            onChange={(e) => field.onChange(formatExpiry(e.target.value))}
                            maxLength={5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cardCvv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CVV</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ""))}
                            maxLength={3}
                            type="password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {paymentMethod === "upi" && (
              <FormField
                control={form.control}
                name="upiId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI ID</FormLabel>
                    <FormControl>
                      <Input placeholder="yourname@upi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {paymentMethod === "netbanking" && (
              <FormField
                control={form.control}
                name="bank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Bank</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Select your bank</option>
                        <option value="sbi">State Bank of India</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="axis">Axis Bank</option>
                        <option value="kotak">Kotak Mahindra Bank</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="pt-4 border-t">
              <div className="flex justify-between mb-2">
                <span>Amount</span>
                <span>₹{amount}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Transaction Fee</span>
                <span>₹0</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total</span>
                <span>₹{amount}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ₹${amount}`
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
