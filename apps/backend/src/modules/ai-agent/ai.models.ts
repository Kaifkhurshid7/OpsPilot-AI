import mongoose, { Schema, Document } from 'mongoose';

// AI Conversation
interface IAIConversation extends Document {
  tenantId: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiConversationSchema = new Schema<IAIConversation>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    title: { type: String, required: true },
  },
  { timestamps: true },
);

aiConversationSchema.index({ tenantId: 1, updatedAt: -1 });

export const AIConversation = mongoose.model<IAIConversation>(
  'AIConversation',
  aiConversationSchema,
);

// AI Message
interface IAIMessage extends Document {
  tenantId: string;
  conversationId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ name: string; args: any; result: any }>;
  explanation?: string;
  createdAt: Date;
}

const aiMessageSchema = new Schema<IAIMessage>(
  {
    tenantId: { type: String, required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, required: true, ref: 'AIConversation' },
    role: { type: String, enum: ['user', 'assistant', 'tool'], required: true },
    content: { type: String, required: true },
    toolCalls: [
      {
        name: { type: String },
        args: { type: Schema.Types.Mixed },
        result: { type: Schema.Types.Mixed },
      },
    ],
    explanation: { type: String },
  },
  { timestamps: true },
);

aiMessageSchema.index({ tenantId: 1, conversationId: 1, createdAt: 1 });

export const AIMessage = mongoose.model<IAIMessage>('AIMessage', aiMessageSchema);
