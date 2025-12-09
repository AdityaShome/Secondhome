"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Wallet, Sparkles, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FintechPaymentOptionProps {
  amount: number
  selectedMethod: "paypal" | "card" | "upi" | "fintech" | null
  onMethodSelect: (method: "paypal" | "card" | "upi" | "fintech") => void
}

const FINTECH_PARTNERS = [
  {
    id: "simpl",
    name: "Simpl",
    description: "Pay in 3 easy installments",
    interest: "0%",
    processingFee: "2%",
    logo: "💳",
  },
  {
    id: "lazypay",
    name: "LazyPay",
    description: "Pay later, book now",
    interest: "0%",
    processingFee: "2%",
    logo: "💰",
  },
]

export function FintechPaymentOption({
  amount,
  selectedMethod,
  onMethodSelect,
}: FintechPaymentOptionProps) {
  const [selectedFintech, setSelectedFintech] = useState<string | null>(null)

  const handleFintechSelect = (partnerId: string) => {
    setSelectedFintech(partnerId)
    onMethodSelect("fintech")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Rent Now, Pay Later</h3>
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          New
        </Badge>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Pay your rent in easy installments. 0% interest for first booking!
        </AlertDescription>
      </Alert>

      <Card className="border-2 border-dashed">
        <CardContent className="p-4">
          <RadioGroup
            value={selectedFintech || ""}
            onValueChange={handleFintechSelect}
          >
            {FINTECH_PARTNERS.map((partner) => {
              const isSelected = selectedFintech === partner.id && selectedMethod === "fintech"
              const processingFeeAmount = Math.round((amount * 2) / 100)
              const monthlyPayment = Math.round((amount + processingFeeAmount) / 3)

              return (
                <div
                  key={partner.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-primary/50"
                  }`}
                  onClick={() => handleFintechSelect(partner.id)}
                >
                  <RadioGroupItem
                    value={partner.id}
                    id={partner.id}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{partner.logo}</span>
                      <Label
                        htmlFor={partner.id}
                        className="text-base font-semibold cursor-pointer"
                      >
                        {partner.name}
                      </Label>
                      {partner.interest === "0%" && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                          0% Interest
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {partner.description}
                    </p>

                    {/* Payment Breakdown */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-medium">₹{amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing Fee ({partner.processingFee}):</span>
                        <span className="font-medium">₹{processingFeeAmount.toLocaleString()}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-semibold">
                        <span>Pay in 3 installments:</span>
                        <span className="text-primary">₹{monthlyPayment.toLocaleString()}/month</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Terms */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• First installment due immediately upon booking confirmation</p>
        <p>• Remaining installments will be auto-debited from your linked account</p>
        <p>• Terms and conditions apply. Eligibility subject to partner verification</p>
      </div>
    </div>
  )
}



