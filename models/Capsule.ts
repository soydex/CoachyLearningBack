import { Schema, model, Document } from "mongoose";
import { z } from "zod";

// Embedded Schema: Transaction (History)
const TransactionSchema = new Schema(
  {
    action: { type: String, enum: ["DEBIT", "CREDIT"], required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
);

// Zod validation for Transaction
const TransactionZod = z.object({
  action: z.enum(["DEBIT", "CREDIT"]),
  amount: z.number().positive(),
  date: z.date().default(() => new Date()),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
  reason: z.string().min(1),
});

// Main Capsule Schema
const CapsuleSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true },
    totalHoursInitial: { type: Number, required: true },
    remainingHours: { type: Number, required: true },
    status: { type: String, enum: ["ACTIVE", "EXPIRED"], default: "ACTIVE" },
    expirationDate: { type: Date, required: true },
    history: [TransactionSchema],
  },
  {
    timestamps: true,
  }
);

// Zod validation for Capsule
const CapsuleZod = z.object({
  organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
  name: z.string().min(1),
  totalHoursInitial: z.number().positive(),
  remainingHours: z.number().min(0),
  status: z.enum(["ACTIVE", "EXPIRED"]).default("ACTIVE"),
  expirationDate: z.date(),
  history: z.array(TransactionZod).default([]),
});

// TypeScript interfaces
export interface ITransaction {
  action: "DEBIT" | "CREDIT";
  amount: number;
  date: Date;
  userId: Schema.Types.ObjectId;
  reason: string;
}

export interface ICapsule extends Document {
  organizationId: Schema.Types.ObjectId;
  name: string;
  totalHoursInitial: number;
  remainingHours: number;
  status: "ACTIVE" | "EXPIRED";
  expirationDate: Date;
  history: ITransaction[];
  createdAt: Date;
  updatedAt: Date;
}

// Export Zod schemas
export { CapsuleZod, TransactionZod };

// Export Mongoose model
export default model<ICapsule>("Capsule", CapsuleSchema);
