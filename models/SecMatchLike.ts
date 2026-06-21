import { Schema, model, models, type Model } from "mongoose"
import { connectToDatabase } from "@/lib/mongodb"

export interface ISecMatchLike {
  fromUserId: string
  toUserId: string
  action: "like" | "pass"
  createdAt: Date
}

const SecMatchLikeSchema = new Schema<ISecMatchLike>(
  {
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    action: { type: String, enum: ["like", "pass"], required: true },
  },
  { timestamps: true }
)

SecMatchLikeSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true })

export async function getSecMatchLikeModel(): Promise<Model<ISecMatchLike>> {
  const connection = await connectToDatabase()
  return connection.models.SecMatchLike || connection.model<ISecMatchLike>("SecMatchLike", SecMatchLikeSchema)
}

export const SecMatchLike = models.SecMatchLike || model<ISecMatchLike>("SecMatchLike", SecMatchLikeSchema)
