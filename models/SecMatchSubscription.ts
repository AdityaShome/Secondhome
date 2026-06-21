import { Schema, model, models, type Model } from "mongoose"
import { connectToDatabase } from "@/lib/mongodb"

export interface ISecMatchSubscription {
  userId: string
  plan: "monthly"
  amount: number
  currency: string
  paymentMethod: string
  transactionId: string
  status: "active" | "expired" | "cancelled"
  startDate: Date
  expiryDate: Date
  createdAt: Date
}

const SecMatchSubscriptionSchema = new Schema<ISecMatchSubscription>(
  {
    userId: { type: String, required: true },
    plan: { type: String, enum: ["monthly"], default: "monthly" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentMethod: { type: String, required: true },
    transactionId: { type: String, required: true },
    status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
  },
  { timestamps: true }
)

export async function getSecMatchSubscriptionModel(): Promise<Model<ISecMatchSubscription>> {
  const connection = await connectToDatabase()
  return (
    connection.models.SecMatchSubscription ||
    connection.model<ISecMatchSubscription>("SecMatchSubscription", SecMatchSubscriptionSchema)
  )
}

export const SecMatchSubscription =
  models.SecMatchSubscription || model<ISecMatchSubscription>("SecMatchSubscription", SecMatchSubscriptionSchema)
