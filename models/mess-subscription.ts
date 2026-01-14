import mongoose, { Schema, type Document } from "mongoose";

export interface IMessSubscription extends Document {
  user: mongoose.Types.ObjectId;
  mess: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  subscriberName?: string;
  subscriberEmail?: string;
  subscriberPhone?: string;
  startDate: Date;
  endDate: Date;
  monthlyPrice: number;
  status: "pending" | "active" | "cancelled" | "expired";
  createdAt: Date;
  updatedAt?: Date;
}

const MessSubscriptionSchema = new Schema<IMessSubscription>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  mess: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  subscriberName: { type: String },
  subscriberEmail: { type: String },
  subscriberPhone: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  monthlyPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "active", "cancelled", "expired"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

MessSubscriptionSchema.index({ user: 1, mess: 1, status: 1 });
MessSubscriptionSchema.index({ owner: 1, createdAt: -1 });

export const MessSubscription =
  mongoose.models.MessSubscription ||
  mongoose.model<IMessSubscription>("MessSubscription", MessSubscriptionSchema);
