import { Schema, model, Document, Types } from "mongoose";

export interface IPasswordResetToken extends Document {
    userId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
}


const PasswordResetTokenSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// TTL index: automatically delete expired tokens
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient lookup
PasswordResetTokenSchema.index({ tokenHash: 1, expiresAt: 1 });

export default model<IPasswordResetToken>("PasswordResetToken", PasswordResetTokenSchema);
