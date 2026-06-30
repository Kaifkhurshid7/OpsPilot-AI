import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Tool declarations for Gemini function calling
export const toolDeclarations = [
  {
    name: 'search_contacts',
    description: 'Search contacts in the CRM by name, email, or phone number',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        query: {
          type: 'STRING' as const,
          description: 'Search query (name, email, or phone)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task/follow-up for a contact',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        contactId: {
          type: 'STRING' as const,
          description: 'The contact ID to associate the task with',
        },
        title: {
          type: 'STRING' as const,
          description: 'Task title/description',
        },
        dueInHours: {
          type: 'NUMBER' as const,
          description: 'Hours from now when the task is due (default: 24)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_opportunity',
    description: 'Update an opportunity/deal stage or value',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        opportunityId: {
          type: 'STRING' as const,
          description: 'The opportunity ID to update',
        },
        stage: {
          type: 'STRING' as const,
          description: 'New stage: new, qualifying, nurture, won, lost',
        },
        value: {
          type: 'NUMBER' as const,
          description: 'Updated deal value',
        },
      },
      required: ['opportunityId'],
    },
  },
  {
    name: 'send_whatsapp',
    description: 'Send a WhatsApp message to a contact',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        contactId: {
          type: 'STRING' as const,
          description: 'The contact ID to send message to',
        },
        message: {
          type: 'STRING' as const,
          description: 'The message content to send',
        },
      },
      required: ['contactId', 'message'],
    },
  },
  {
    name: 'fetch_business_metrics',
    description: 'Fetch business KPI metrics: active opportunities, pipeline value, pending tasks',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
    },
  },
];

export function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{ functionDeclarations: toolDeclarations as any }],
  });
}

export function buildSystemPrompt(tenantName: string, industry: string | null): string {
  return `You are OpsPilot AI, an intelligent business operations assistant for "${tenantName}"${industry ? ` (industry: ${industry})` : ''}.

You help business owners manage their CRM, contacts, deals, and tasks through natural conversation. You can:
- Search contacts and provide information
- Create tasks and follow-ups
- Update opportunity/deal stages and values
- Send WhatsApp messages to contacts
- Fetch business metrics and KPIs

IMPORTANT RULES:
1. Always use the available tools to take actions. Never make up data.
2. After every action, provide a brief one-line explanation of WHY you took that action (this appears as an explainability tag in the UI).
3. Be concise and business-focused in your responses.
4. If you need more information to complete an action, ask the user.
5. Never expose internal IDs to the user — refer to contacts/deals by name.

When you execute a tool, format your explanation as: [WHY: <reason>]`;
}

export default genAI;
