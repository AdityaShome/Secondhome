import { Schema, model, models, type Model } from "mongoose"
import { connectToDatabase } from "@/lib/mongodb"

export interface ISecMatchProfile {
  userId: string
  // Personal
  name: string
  age: number
  gender: "male" | "female" | "other"
  college: string
  course: string
  year: string
  photo?: string
  bio: string

  // Accommodation prefs
  accommodationType: "PG" | "Flat" | "Both"
  preferredLocation: string
  budgetMin: number
  budgetMax: number
  moveInDate: string

  // Lifestyle
  sleepSchedule: "early_bird" | "night_owl" | "flexible"
  cleanlinessLevel: 1 | 2 | 3 | 4 | 5
  cookingHabits: "never" | "sometimes" | "always"
  smokingPreference: "non_smoker" | "smoker" | "doesnt_matter"
  drinkingPreference: "non_drinker" | "social_drinker" | "doesnt_matter"
  guestPolicy: "no_guests" | "occasional" | "frequent" | "doesnt_matter"
  workFromHome: boolean
  hasPets: boolean
  petFriendly: boolean

  // Interests
  interests: string[]

  // Contact (only shared after mutual approval + subscription)
  phone?: string

  // Status
  isActive: boolean
  isSubscribed: boolean
  subscriptionExpiry?: Date

  createdAt: Date
  updatedAt: Date
}

const SecMatchProfileSchema = new Schema<ISecMatchProfile>(
  {
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    college: { type: String, required: true },
    course: { type: String, required: true },
    year: { type: String, required: true },
    photo: { type: String },
    bio: { type: String, required: true },

    accommodationType: { type: String, enum: ["PG", "Flat", "Both"], required: true },
    preferredLocation: { type: String, required: true },
    budgetMin: { type: Number, required: true },
    budgetMax: { type: Number, required: true },
    moveInDate: { type: String, required: true },

    sleepSchedule: { type: String, enum: ["early_bird", "night_owl", "flexible"], required: true },
    cleanlinessLevel: { type: Number, min: 1, max: 5, required: true },
    cookingHabits: { type: String, enum: ["never", "sometimes", "always"], required: true },
    smokingPreference: { type: String, enum: ["non_smoker", "smoker", "doesnt_matter"], required: true },
    drinkingPreference: { type: String, enum: ["non_drinker", "social_drinker", "doesnt_matter"], required: true },
    guestPolicy: { type: String, enum: ["no_guests", "occasional", "frequent", "doesnt_matter"], required: true },
    workFromHome: { type: Boolean, default: false },
    hasPets: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false },

    interests: [{ type: String }],
    phone: { type: String },

    isActive: { type: Boolean, default: true },
    isSubscribed: { type: Boolean, default: false },
    subscriptionExpiry: { type: Date },
  },
  { timestamps: true }
)

export async function getSecMatchProfileModel(): Promise<Model<ISecMatchProfile>> {
  const connection = await connectToDatabase()
  return connection.models.SecMatchProfile || connection.model<ISecMatchProfile>("SecMatchProfile", SecMatchProfileSchema)
}

export const SecMatchProfile = models.SecMatchProfile || model<ISecMatchProfile>("SecMatchProfile", SecMatchProfileSchema)
