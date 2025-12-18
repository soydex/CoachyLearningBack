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

// Embedded Schema: Subscription
const SubscriptionSchema = new Schema(
  {
    isActive: { type: Boolean, default: true },
    plan: { type: String, enum: ["monthly", "yearly", "gifted"], default: "monthly" },
    expirationDate: { type: Date, required: false },
    activatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Zod validation for UserStats
const UserStatsZod = z.object({
  sessionsCompleted: z.number().min(0).default(0),
  lastAssessmentDate: z.date().optional(),
});

// Zod validation for Subscription - accepts both Date objects and ISO strings
const SubscriptionZod = z.object({
  isActive: z.boolean().optional(),
  plan: z.enum(["monthly", "yearly", "gifted"]).optional(),
  expirationDate: z.union([z.date(), z.string()]).optional(),
  activatedAt: z.union([z.date(), z.string()]).optional(),
});

// Main User Schema
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["USER", "MANAGER", "COACH", "ADMIN"],
      required: true,
    },
    // Abonnement
    subscription: { type: SubscriptionSchema, default: { isActive: true, plan: "monthly" } },
    // Sécurité
    password: { type: String, required: false }, // Bcrypt hash
    legacyWPHash: { type: String, required: false }, // PHPass hash
    // Avatar URL
    avatarUrl: { type: String, required: false },
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
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["USER", "MANAGER", "COACH", "ADMIN"]),
  subscription: SubscriptionZod.optional(),
  password: z.string().optional(),
  legacyWPHash: z.string().optional(),
  avatarUrl: z.string().optional(),
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

export interface ISubscription {
  isActive: boolean;
  plan: "monthly" | "yearly" | "gifted";
  expirationDate?: Date;
  activatedAt?: Date;
}

export interface IUser extends Document {
  email: string;
  name: string;
  role: "USER" | "MANAGER" | "COACH" | "ADMIN";
  subscription: ISubscription;
  password?: string;
  legacyWPHash?: string;
  avatarUrl?: string;
  coachProfile: any;
  stats: IUserStats;
  coursesProgress: ICourseProgress[];
  createdAt: Date;
  updatedAt: Date;
}

// Export Zod schemas
export { UserZod, UserStatsZod, SubscriptionZod };

// Export Mongoose model
export default model<IUser>("User", UserSchema);

