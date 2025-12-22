import { Schema, model, Document } from 'mongoose';

export interface IMessage extends Document {
    conversationId: any; // ObjectId
    sender: any; // ObjectId
    content: string;
    readBy: string[]; // User IDs who have read the message
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema(
    {
        conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    {
        timestamps: true,
    }
);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default model<IMessage>('Message', MessageSchema);
