import { Schema, model, Document } from "mongoose";
import { z } from "zod";

// Embedded Schema: UserStats
const UserStatsSchema = new Schema(
  {
    sessionsCompleted: { type: Number, default: 0 },
    lastAssessmentDate: { type: Date, default: null },
  },
  { _id: false }
);

// Embedded Schema: CourseProgress
const CourseProgressSchema = new Schema(
  {
    courseId: { type: String, required: true },
    completedLessonIds: [{ type: String }],
    progress: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    lastAccess: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Zod validation for UserStats
const UserStatsZod = z.object({
  sessionsCompleted: z.number().min(0).default(0),
  lastAssessmentDate: z.date().optional(),
});

// Main User Schema
const UserSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["USER", "MANAGER", "COACH", "ADMIN"],
      required: true,
    },
    // Sécurité
    password: { type: String, required: false }, // Bcrypt hash
    legacyWPHash: { type: String, required: false }, // PHPass hash
    // Profil Coach (optionnel)
    coachProfile: { type: Schema.Types.Mixed, default: {} },
    // Stats (embedded)
    stats: { type: UserStatsSchema, default: {} },
    // Course Progress
    coursesProgress: { type: [CourseProgressSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Zod validation for User
const UserZod = z.object({
  organizationId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid ObjectId" })
    .or(z.any()),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["USER", "MANAGER", "COACH", "ADMIN"]),
  password: z.string().optional(),
  legacyWPHash: z.string().optional(),
  coachProfile: z.record(z.string(), z.any()).default({}),
  stats: UserStatsZod.default({ sessionsCompleted: 0 }),
});

// TypeScript interfaces
export interface IUserStats {
  sessionsCompleted: number;
  lastAssessmentDate?: Date;
}

export interface ICourseProgress {
  courseId: string;
  completedLessonIds: string[];
  progress: number;
  score: number;
  lastAccess: Date;
}

export interface IUser extends Document {
  organizationId: Schema.Types.ObjectId;
  email: string;
  name: string;
  role: "USER" | "MANAGER" | "COACH" | "ADMIN";
  password?: string;
  legacyWPHash?: string;
  coachProfile: any;
  stats: IUserStats;
  coursesProgress: ICourseProgress[];
  createdAt: Date;
  updatedAt: Date;
}

// Export Zod schemas
export { UserZod, UserStatsZod };

// Export Mongoose model
export default model<IUser>("User", UserSchema);
