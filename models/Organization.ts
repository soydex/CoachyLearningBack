import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

// Organization Schema
const OrganizationSchema = new Schema({
  name: { type: String, required: true },
  settings: { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// Zod validation for Organization
const OrganizationZod = z.object({
  name: z.string().min(1),
  settings: z.record(z.any()).default({}),
});

// TypeScript interface
export interface IOrganization extends Document {
  name: string;
  settings: any;
  createdAt: Date;
  updatedAt: Date;
}

// Export Zod schema
export { OrganizationZod };

// Export Mongoose model
export default model<IOrganization>('Organization', OrganizationSchema);