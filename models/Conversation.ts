import { Schema, model, Document } from 'mongoose';

export interface IConversation extends Document {
    participants: string[]; // User IDs
    lastMessage: string;
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema = new Schema(
    {
        participants: [{ type: String, ref: 'User', required: true }], // References to User.id (custom ID) or User._id if using ObjectId, but based on User.ts it seems we might be using string IDs or linking. The User model has _id by default but let's check if we use a specific ID string. User.ts shows typical mongoose schema. Let's assume _id but stored as string reference or ObjectId.
        // However, User.ts doesn't explicitly define a custom _id type, so it's ObjectId. But the ref type in mongoose is usually ObjectId. 
        // Let's stick to Schema.Types.ObjectId for refs if strict, but strict string is safer if we mixed types.
        // Looking at User.ts: "completedLessonIds: [{ type: String }]" suggests string usage generally.
        // But `participants` usually refs `User`. Let's use Schema.Types.ObjectId to be standard Mongoose, 
        // or String if the app uses string IDs (e.g. from an auth provider). 
        // The User model doesn't override _id, so it's ObjectId.
        // BUT the route usages might expect strings. 
        // Let's use Schema.Types.ObjectId for now.

        lastMessage: { type: String, default: '' },
        lastMessageAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
);

// Indexes
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

export default model<IConversation>('Conversation', ConversationSchema);
