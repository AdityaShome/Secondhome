import mongoose, { Schema, Document, Model } from "mongoose"

export interface ISecMatchMessage extends Document {
  fromUserId: string
  toUserId: string
  content: string
  read: boolean
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<ISecMatchMessage>(
  {
    fromUserId: { type: String, required: true, index: true },
    toUserId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Compound index for querying chat between two users quickly
messageSchema.index({ fromUserId: 1, toUserId: 1 })

export function getSecMatchMessageModel(): Model<ISecMatchMessage> {
  return mongoose.models.SecMatchMessage || mongoose.model<ISecMatchMessage>("SecMatchMessage", messageSchema)
}
