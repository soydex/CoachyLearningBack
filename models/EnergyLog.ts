import { Schema, model, Document } from "mongoose";
import { z } from "zod";

// EnergyLog Schema - stores daily mood/energy checks
const EnergyLogSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: Date, required: true }, // Day at midnight
        mood: { type: Number, min: 1, max: 3, required: true }, // 1=😫 Low, 2=😐 Medium, 3=🤩 High
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient lookup by user and date
EnergyLogSchema.index({ userId: 1, date: -1 });
// Unique constraint: one mood per user per day
EnergyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Zod validation
export const EnergyLogZod = z.object({
    mood: z.number().min(1).max(3),
});

// TypeScript interface
export interface IEnergyLog extends Document {
    userId: Schema.Types.ObjectId;
    date: Date;
    mood: 1 | 2 | 3;
    createdAt: Date;
    updatedAt: Date;
}

export default model<IEnergyLog>("EnergyLog", EnergyLogSchema);
