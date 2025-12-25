"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Building2, CheckCircle2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const bankAccountSchema = z.object({
  accountNumber: z.string().min(9).max(18).regex(/^\d+$/, "Account number must contain only digits"),
  ifscCode: z.string().length(11).regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"),
  accountHolderName: z.string().min(2).max(100),
  bankName: z.string().min(2).max(100),
  upiId: z.string().optional().refine(
    (val) => !val || /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(val),
    "Invalid UPI ID format (e.g., yourname@paytm)"
  ),
})

type BankAccountFormData = z.infer<typeof bankAccountSchema>

export function BankAccountSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [bankAccount, setBankAccount] = useState<any>(null)
  const { toast } = useToast()

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountNumber: "",
      ifscCode: "",
      accountHolderName: "",
      bankName: "",
      upiId: "",
    },
  })

  useEffect(() => {
    fetchBankAccount()
  }, [])

  const fetchBankAccount = async () => {
    try {
      const response = await fetch("/api/user/bank-account")
      if (response.ok) {
        const data = await response.json()
        if (data.bankAccount) {
          setBankAccount(data.bankAccount)
          form.reset({
            accountNumber: data.bankAccount.accountNumber || "",
            ifscCode: data.bankAccount.ifscCode || "",
            accountHolderName: data.bankAccount.accountHolderName || "",
            bankName: data.bankAccount.bankName || "",
            upiId: data.bankAccount.upiId || "",
          })
        }
      }
    } catch (error) {
      console.error("Error fetching bank account:", error)
      toast({
        title: "Error",
        description: "Failed to load bank account details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: BankAccountFormData) => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/user/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode.toUpperCase(),
          accountHolderName: data.accountHolderName,
          bankName: data.bankName,
          upiId: data.upiId,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setBankAccount(result.bankAccount)
        toast({
          title: "Success!",
          description: "Bank account details saved successfully",
        })
      } else {
        throw new Error(result.error || "Failed to save bank account")
      }
    } catch (error) {
      console.error("Error saving bank account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save bank account details",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Bank Account Details
            </CardTitle>
            <CardDescription>
              Add your bank account to receive payments via UPI QR code
            </CardDescription>
          </div>
          {bankAccount && (
            <Badge className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountHolderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234567890"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                    />
                  </FormControl>
                  <FormMessage />
                  {bankAccount && (
                    <p className="text-xs text-gray-500">
                      Current: ****{bankAccount.accountNumber.slice(-4)}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ifscCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IFSC Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SBIN0001234"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        maxLength={11}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input placeholder="State Bank of India" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="upiId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UPI ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="yourname@paytm" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500">
                    If not provided, a UPI ID will be auto-generated from your account details
                  </p>
                </FormItem>
              )}
            />

            {bankAccount?.upiId && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Your UPI ID:</span>
                </div>
                <p className="text-lg font-mono font-semibold text-blue-900">
                  {bankAccount.upiId}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  This UPI ID will be used to receive payments. Share this with customers or display QR code.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSaving} className="flex-1">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  bankAccount ? "Update Bank Account" : "Save Bank Account"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

