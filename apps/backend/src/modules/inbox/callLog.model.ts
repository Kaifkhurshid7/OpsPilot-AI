import mongoose, { Schema, Document } from 'mongoose';

interface ICallLog extends Document {
  tenantId: string;
  contactId: string;
  direction: 'inbound' | 'outbound';
  durationSec: number;
  transcript?: string;
  aiSummary?: string;
  sentiment?: string;
  createdAt: Date;
}

const callLogSchema = new Schema<ICallLog>(
  {
    tenantId: { type: String, required: true },
    contactId: { type: String, required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    durationSec: { type: Number, required: true },
    transcript: { type: String },
    aiSummary: { type: String },
    sentiment: { type: String },
  },
  { timestamps: true },
);

callLogSchema.index({ tenantId: 1, contactId: 1, createdAt: -1 });

export const CallLog = mongoose.model<ICallLog>('CallLog', callLogSchema);
