import mongoose, { Schema, Document } from "mongoose"

export interface INewsletter extends Document {
  email: string
  subscribedAt: Date
  isActive: boolean
  preferences: {
    weeklyDigest: boolean
    instantUpdates: boolean
    propertyTypes: string[] // 'pg', 'flat', 'mess'
  }
  lastEmailSent?: Date
  unsubscribeToken?: string
}

const NewsletterSchema = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    preferences: {
      weeklyDigest: {
        type: Boolean,
        default: true,
      },
      instantUpdates: {
        type: Boolean,
        default: true,
      },
      propertyTypes: {
        type: [String],
        default: ["pg", "flat", "mess"],
      },
    },
    lastEmailSent: {
      type: Date,
    },
    unsubscribeToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
NewsletterSchema.index({ email: 1 })
NewsletterSchema.index({ isActive: 1 })

export default mongoose.models.Newsletter || mongoose.model<INewsletter>("Newsletter", NewsletterSchema)




