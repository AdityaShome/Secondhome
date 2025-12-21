import { Schema, model, models } from "mongoose"
import { connectToDatabase } from "@/lib/mongodb"

export interface IOTP {
  email: string
  otp: string
  type: "registration" | "login" | "password-reset"
  expiresAt: Date
  createdAt: Date
}

const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ["registration", "login", "password-reset"], required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  createdAt: { type: Date, default: Date.now },
})

// Delete existing model if it exists to force recreation with updated schema
if (models.OTP) {
  delete models.OTP
}

export const OTP = model<IOTP>("OTP", OTPSchema)

