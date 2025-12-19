import { Schema, model, Document } from "mongoose";
import { z } from "zod";

const NotificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }, // For personal notifications
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }], // For global notifications
    type: { type: String, enum: ["success", "alert", "info"], required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // Optional link to user (personal)
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

export default model("Notification", NotificationSchema);
