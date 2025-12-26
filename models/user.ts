import { Schema, model, models, type Model } from "mongoose"
import { connectToDatabase } from "@/lib/mongodb"

export interface IUser {
  name: string
  email: string
  password: string
  image?: string
  role: "user" | "owner" | "admin"
  phone?: string
  phoneVerified?: boolean
  emailVerified?: Date
  dateOfBirth?: string
  gender?: string
  nationality?: string
  college?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  preferences?: {
    emailNotifications?: boolean
    smsNotifications?: boolean
    showProfile?: boolean
  }
  createdAt: Date
  updatedAt?: Date
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image: { type: String },
  role: { type: String, enum: ["user", "owner", "admin"], default: "user" },
  phone: { type: String },
  phoneVerified: { type: Boolean, default: false },
  emailVerified: { type: Date },
  dateOfBirth: { type: String },
  gender: { type: String },
  nationality: { type: String },
  college: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  preferences: {
    emailNotifications: { type: Boolean, default: false },
    smsNotifications: { type: Boolean, default: false },
    showProfile: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
})

// This approach ensures the model is only created once
export async function getUserModel(): Promise<Model<IUser>> {
  const connection = await connectToDatabase()
  return connection.models.User || connection.model<IUser>("User", UserSchema)
}

// For backward compatibility
export const User = models.User || model<IUser>("User", UserSchema)
