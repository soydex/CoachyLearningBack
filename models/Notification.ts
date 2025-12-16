import { Schema, model, Document } from "mongoose";
import { z } from "zod";

const NotificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: String, required: true }, // Keeping as string for now to match mock, but Date would be better
    isRead: { type: Boolean, default: false },
    type: { type: String, enum: ["success", "alert", "info"], required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // Optional link to user
  },
  {
    timestamps: true,
  }
);

export default model("Notification", NotificationSchema);
