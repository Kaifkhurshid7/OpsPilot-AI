import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '../../../../packages/prisma/generated/client';
import mongoose from 'mongoose';

// Import WhatsApp message model
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

interface LeadQualificationData {
  tenantId: string;
  contactId: string;
  userId: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
}

export async function processLeadQualification(
  data: LeadQualificationData,
  prisma: PrismaClient,
): Promise<void> {
  const { tenantId, contactId, userId, contactName, contactPhone } = data;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Step 1: AI Qualification — score the lead
  await prisma.auditLog.create({
    data: {
      tenantId,
      actor: 'AI_AGENT',
      action: 'WORKFLOW_STEP_QUALIFICATION_START',
      targetType: 'Contact',
      targetId: contactId,
    },
  });

  // Get any existing conversation context
  const recentMessages = await WhatsAppMessage.find({ tenantId, contactId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const conversationContext = (recentMessages as any[])
    .map((m) => `${m.direction}: ${m.body}`)
    .join('\n');

  const qualificationPrompt = `You are a lead scoring AI. Score this lead from 0-100 based on the available information.

Contact: ${contactName}
Phone: ${contactPhone || 'N/A'}
Email: ${data.contactEmail || 'N/A'}
${conversationContext ? `Recent conversations:\n${conversationContext}` : 'No conversation history.'}

Respond ONLY with a JSON object: {"score": <number>, "reasoning": "<brief explanation>"}`;

  let score = 50;
  let reasoning = 'Default score — insufficient data for assessment';

  try {
    const result = await model.generateContent(qualificationPrompt);
    const text = result.response.text();
    const parsed = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    score = parsed.score;
    reasoning = parsed.reasoning;
  } catch (err) {
    console.error('AI qualification parsing error:', err);
  }

  // Step 2: Create or update opportunity with score
  let opportunity = await prisma.opportunity.findFirst({
    where: { tenantId, contactId },
  });

  if (!opportunity) {
    opportunity = await prisma.opportunity.create({
      data: {
        tenantId,
        contactId,
        title: `${contactName} — Lead`,
        value: 0,
        stage: score > 80 ? 'qualifying' : 'nurture',
        score,
        nextBestAction: reasoning,
      },
    });
  } else {
    opportunity = await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: {
        score,
        stage: score > 80 ? 'qualifying' : 'nurture',
        nextBestAction: reasoning,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      actor: 'AI_AGENT',
      action: 'WORKFLOW_STEP_QUALIFICATION_COMPLETE',
      targetType: 'Opportunity',
      targetId: opportunity.id,
      metadata: { score, reasoning, stage: opportunity.stage },
    },
  });

  // Step 3: If score > 80, send WhatsApp follow-up
  if (score > 80 && contactPhone) {
    const messagePrompt = `Write a brief, professional WhatsApp follow-up message to ${contactName}. Keep it under 200 characters. Be warm and mention you'd love to help them further.`;

    let followUpMessage = `Hi ${contactName}! Thanks for your interest. I'd love to learn more about how we can help you. When would be a good time to chat?`;

    try {
      const msgResult = await model.generateContent(messagePrompt);
      followUpMessage = msgResult.response.text().trim();
    } catch (err) {
      console.error('AI message generation error:', err);
    }

    // Store outbound message
    await WhatsAppMessage.create({
      tenantId,
      contactId,
      direction: 'outbound',
      waMessageId: `wf_${Date.now()}`,
      body: followUpMessage,
      rawPayload: { workflow: 'lead-qualification', automated: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actor: 'AI_AGENT',
        action: 'WORKFLOW_STEP_WHATSAPP_SENT',
        targetType: 'Contact',
        targetId: contactId,
        metadata: { message: followUpMessage.substring(0, 100) },
      },
    });
  }

  // Step 4: Create follow-up task
  const task = await prisma.task.create({
    data: {
      tenantId,
      contactId,
      title: `Follow up with ${contactName} (Lead Score: ${score})`,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 day
      createdBy: 'AI_AGENT',
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actor: 'AI_AGENT',
      action: 'WORKFLOW_STEP_TASK_CREATED',
      targetType: 'Task',
      targetId: task.id,
      metadata: { title: task.title, dueAt: task.dueAt.toISOString() },
    },
  });

  // Step 5: Final audit log — workflow complete
  await prisma.auditLog.create({
    data: {
      tenantId,
      actor: 'AI_AGENT',
      action: 'WORKFLOW_COMPLETED',
      targetType: 'Contact',
      targetId: contactId,
      metadata: {
        workflow: 'lead-qualification',
        score,
        stage: opportunity.stage,
        taskCreated: task.id,
        whatsappSent: score > 80,
      },
    },
  });
}
