import mongoose, { Schema, type Document } from "mongoose"

export interface IScheduleVisit extends Document {
  property: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  owner: mongoose.Types.ObjectId
  scheduledDate: Date
  scheduledTime: string
  status: "pending" | "confirmed" | "cancelled" | "completed"
  notes?: string
  contactMethod: "whatsapp" | "email" | "phone"
  createdAt: Date
  updatedAt?: Date
}

const ScheduleVisitSchema = new Schema<IScheduleVisit>({
  property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  notes: { type: String },
  contactMethod: {
    type: String,
    enum: ["whatsapp", "email", "phone"],
    default: "whatsapp",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
})

export const ScheduleVisit = mongoose.models.ScheduleVisit || mongoose.model<IScheduleVisit>("ScheduleVisit", ScheduleVisitSchema)



