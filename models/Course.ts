import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

// Enums
export enum ContentType {
  LESSON = "LESSON",
  CHAPTER = "CHAPTER", 
  QUIZ = "QUIZ",
}

// Embedded Schemas
const LessonStepSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
}, { _id: false });

const QuizQuestionSchema = new Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswerIndex: { type: Number, required: true },
}, { _id: false });

const LessonSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, enum: Object.values(ContentType), required: true },
  duration: { type: String },
  content: { type: String }, // Storing HTML/Markdown content as string
  steps: [LessonStepSchema],
  questions: [QuizQuestionSchema],
}, { _id: false });

const ModuleSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  lessons: [LessonSchema],
  isOpen: { type: Boolean, default: false },
}, { _id: false });

// Main Course Schema
const CourseSchema = new Schema({
  id: { type: String, required: true, unique: true }, // Custom ID to match frontend "c1"
  title: { type: String, required: true },
  category: { type: String, required: true },
  progress: { type: Number, default: 0 },
  modules: [ModuleSchema],
}, {
  timestamps: true,
});

// Zod Validation (Optional but good practice)
export const CourseZod = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  progress: z.number().min(0).max(100),
  modules: z.array(z.any()), // Simplified for now
});

export default model('Course', CourseSchema);
