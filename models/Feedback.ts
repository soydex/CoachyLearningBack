import { Schema, model } from 'mongoose';
import { z } from 'zod';

const FeedbackSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true },
  lessonId: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
}, {
  timestamps: true,
});

export const FeedbackZod = z.object({
  userId: z.string(),
  courseId: z.string(),
  lessonId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export default model('Feedback', FeedbackSchema);
