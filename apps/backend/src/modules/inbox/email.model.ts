import mongoose, { Schema, Document } from 'mongoose';

interface IEmailMessage extends Document {
  tenantId: string;
  contactId: string;
  direction: 'inbound' | 'outbound';
  subject: string;
  body: string;
  aiSummary?: string;
  sentiment?: string;
  intent?: string;
  createdAt: Date;
}

const emailMessageSchema = new Schema<IEmailMessage>(
  {
    tenantId: { type: String, required: true },
    contactId: { type: String, required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    aiSummary: { type: String },
    sentiment: { type: String },
    intent: { type: String },
  },
  { timestamps: true },
);

emailMessageSchema.index({ tenantId: 1, contactId: 1, createdAt: -1 });

export const EmailMessage = mongoose.model<IEmailMessage>('EmailMessage', emailMessageSchema);
