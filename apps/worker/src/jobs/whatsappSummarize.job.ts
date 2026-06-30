import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';

const WhatsAppMessageSchema = new mongoose.Schema({
  tenantId: String,
  contactId: String,
  direction: String,
  waMessageId: String,
  body: String,
  rawPayload: mongoose.Schema.Types.Mixed,
  aiSummary: String,
  sentiment: String,
  intent: String,
  nextAction: String,
}, { timestamps: true });

const WhatsAppMessage = mongoose.models.WhatsAppMessage || mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);

interface SummarizeData {
  messageId: string;
  tenantId: string;
  contactId: string;
  text: string;
}

export async function processWhatsappSummarize(
  data: SummarizeData,
  prisma: PrismaClient,
): Promise<void> {
  const { messageId, tenantId, contactId, text } = data;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Analyze this WhatsApp message and provide:
1. A one-line summary
2. Sentiment (positive/neutral/negative)
3. Intent (inquiry/complaint/purchase_intent/follow_up/general)
4. Suggested next action

Message: "${text}"

Respond ONLY with JSON: {"summary": "...", "sentiment": "...", "intent": "...", "nextAction": "..."}`;

  let summary = text.substring(0, 80);
  let sentiment = 'neutral';
  let intent = 'general';
  let nextAction = 'Review and respond';

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    summary = parsed.summary || summary;
    sentiment = parsed.sentiment || sentiment;
    intent = parsed.intent || intent;
    nextAction = parsed.nextAction || nextAction;
  } catch (err) {
    console.error('AI summarize error:', err);
  }

  // Update the message with AI analysis
  await WhatsAppMessage.findByIdAndUpdate(messageId, {
    aiSummary: summary,
    sentiment,
    intent,
    nextAction,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      actor: 'AI_AGENT',
      action: 'WHATSAPP_SUMMARIZED',
      targetType: 'Contact',
      targetId: contactId,
      metadata: { summary, sentiment, intent, nextAction },
    },
  });
}
