import mongoose, { Schema, Document } from 'mongoose';

interface IWhatsAppMessage extends Document {
  tenantId: string;
  contactId: string;
  direction: 'inbound' | 'outbound';
  waMessageId: string;
  body: string;
  rawPayload: Record<string, any>;
  aiSummary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  intent?: string;
  nextAction?: string;
  createdAt: Date;
}

const whatsappMessageSchema = new Schema<IWhatsAppMessage>(
  {
    tenantId: { type: String, required: true },
    contactId: { type: String, required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    waMessageId: { type: String, required: true },
    body: { type: String, required: true },
    rawPayload: { type: Schema.Types.Mixed, default: {} },
    aiSummary: { type: String },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
    intent: { type: String },
    nextAction: { type: String },
  },
  { timestamps: true },
);

whatsappMessageSchema.index({ tenantId: 1, contactId: 1, createdAt: -1 });

export const WhatsAppMessage = mongoose.model<IWhatsAppMessage>(
  'WhatsAppMessage',
  whatsappMessageSchema,
);
