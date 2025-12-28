import { Schema, model, models } from "mongoose"
import { connectToDatabase } from "@/lib/mongodb"

export interface IOTP {
  email?: string
  phone?: string
  otp: string
  type: "registration" | "login" | "password-reset" | "phone-verification"
  expiresAt: Date
  createdAt: Date
}

const OTPSchema = new Schema<IOTP>({
  email: { type: String, index: true },
  phone: { type: String, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ["registration", "login", "password-reset", "phone-verification"], required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  createdAt: { type: Date, default: Date.now },
})

// Ensure at least one identifier exists
OTPSchema.pre('validate', function() {
  if (!this.email && !this.phone) {
    throw new Error('Either email or phone must be provided')
  }
})

// Delete existing model if it exists to force recreation with updated schema
if (models.OTP) {
  delete models.OTP
}

export const OTP = model<IOTP>("OTP", OTPSchema)

