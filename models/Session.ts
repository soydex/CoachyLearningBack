import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

// Embedded Schema: Assessment
const AssessmentSchema = new Schema({
  raterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  leadership: { type: Number, min: 0, max: 10, required: true },
  communication: { type: Number, min: 0, max: 10, required: true },
  adaptability: { type: Number, min: 0, max: 10, required: true },
  emotionalInt: { type: Number, min: 0, max: 10, required: true },
  comment: { type: String, default: '' },
}, { _id: false });

// Zod validation for Assessment
const AssessmentZod = z.object({
  raterId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
  targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
  leadership: z.number().min(0).max(10),
  communication: z.number().min(0).max(10),
  adaptability: z.number().min(0).max(10),
  emotionalInt: z.number().min(0).max(10),
  comment: z.string().default(''),
});

// Main Session Schema
const SessionSchema = new Schema({
  coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  status: { type: String, enum: ['SCHEDULED', 'COMPLETED'], default: 'SCHEDULED' },
  videoUrl: { type: String, default: '' },
  assessments: [AssessmentSchema],
}, {
  timestamps: true,
});

// Zod validation for Session
const SessionZod = z.object({
  coachId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
  attendees: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')).default([]),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number().positive(),
  status: z.enum(['SCHEDULED', 'COMPLETED']).default('SCHEDULED'),
  videoUrl: z.string().default(''),
  assessments: z.array(AssessmentZod).default([]),
});

// TypeScript interfaces
export interface IAssessment {
  raterId: Schema.Types.ObjectId;
  targetId: Schema.Types.ObjectId;
  leadership: number;
  communication: number;
  adaptability: number;
  emotionalInt: number;
  comment: string;
}

export interface ISession extends Document {
  coachId: Schema.Types.ObjectId;
  attendees: Schema.Types.ObjectId[];
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'SCHEDULED' | 'COMPLETED';
  videoUrl: string;
  assessments: IAssessment[];
  createdAt: Date;
  updatedAt: Date;
}

// Export Zod schemas
export { SessionZod, AssessmentZod };

// Export Mongoose model
export default model<ISession>('Session', SessionSchema);