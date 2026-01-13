import mongoose, { Schema, type Document } from "mongoose"

export interface IMess extends Document {
  name: string
  description: string
  address: string
  location: string
  city: string
  state: string
  pincode: string
  coordinates: {
    type: string
    coordinates: [number, number]
  }
  monthlyPrice: number
  dailyPrice: number
  trialDays: number
  homeDeliveryAvailable: boolean
  deliveryRadius: number // in km
  deliveryCharges: number
  packagingAvailable?: boolean
  packagingPrice?: number
  images: string[]
  mealTypes: string[] // breakfast, lunch, dinner, snacks
  cuisineTypes: string[] // North Indian, South Indian, Chinese, etc.
  dietTypes: string[] // Veg, Non-Veg, Jain, Vegan
  menu: {
    day: string
    breakfast: string
    lunch: string
    dinner: string
  }[]
  openingHours: {
    breakfast: string
    lunch: string
    dinner: string
  }
  amenities: string[] // AC, WiFi, Sitting Area, etc.
  capacity: number // max students
  contactName: string
  contactPhone: string
  contactEmail: string
  owner: mongoose.Types.ObjectId
  rating: number
  reviews: number
  isApproved: boolean
  isRejected: boolean
  approvedAt?: Date
  approvedBy?: mongoose.Types.ObjectId
  rejectedAt?: Date
  rejectedBy?: mongoose.Types.ObjectId
  rejectionReason?: string
  aiReview?: {
    reviewed: boolean
    reviewedAt?: Date
    confidence?: number
    score?: number
    recommendation?: string
    summary?: string
    analysis?: any
    redFlags?: string[]
    reason?: string
  }
  createdAt: Date
  updatedAt?: Date
}

const MessSchema = new Schema<IMess>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  location: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  coordinates: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
  },
  monthlyPrice: { type: Number, required: true },
  dailyPrice: { type: Number },
  trialDays: { type: Number, default: 0 },
  homeDeliveryAvailable: { type: Boolean, default: false },
  deliveryRadius: { type: Number, default: 0 },
  deliveryCharges: { type: Number, default: 0 },
  packagingAvailable: { type: Boolean, default: false },
  packagingPrice: { type: Number, default: 0 },
  images: { type: [String] },
  mealTypes: { type: [String], required: true },
  cuisineTypes: { type: [String] },
  dietTypes: { type: [String], required: true },
  menu: [
    {
      day: { type: String, required: true },
      breakfast: { type: String },
      lunch: { type: String },
      dinner: { type: String },
    },
  ],
  openingHours: {
    breakfast: { type: String },
    lunch: { type: String },
    dinner: { type: String },
  },
  amenities: { type: [String] },
  capacity: { type: Number },
  contactName: { type: String, required: true },
  contactPhone: { type: String, required: true },
  contactEmail: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: false },
  isRejected: { type: Boolean, default: false },
  approvedAt: { type: Date },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  rejectedAt: { type: Date },
  rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
  rejectionReason: { type: String },
  aiReview: {
    reviewed: { type: Boolean, default: false },
    reviewedAt: { type: Date },
    confidence: { type: Number },
    score: { type: Number },
    recommendation: { type: String },
    summary: { type: String },
    analysis: { type: Schema.Types.Mixed },
    redFlags: [{ type: String }],
    reason: { type: String },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
})

// Create geospatial index for location-based queries
MessSchema.index({ coordinates: "2dsphere" })

export const Mess = mongoose.models.Mess || mongoose.model<IMess>("Mess", MessSchema)
