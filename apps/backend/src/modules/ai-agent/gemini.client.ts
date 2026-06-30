import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from '@google/generative-ai';
import { env } from '../../config/env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Tool declarations for Gemini function calling
export const toolDeclarations = [
  {
    name: 'search_contacts',
    description: 'Search contacts in the CRM by name, email, or phone number',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        query: {
          type: FunctionDeclarationSchemaType.STRING,
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
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        contactId: {
          type: FunctionDeclarationSchemaType.STRING,
          description: 'The contact ID to associate the task with',
        },
        title: {
          type: FunctionDeclarationSchemaType.STRING,
          description: 'Task title/description',
        },
        dueInHours: {
          type: FunctionDeclarationSchemaType.NUMBER,
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
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        opportunityId: {
          type: FunctionDeclarationSchemaType.STRING,
          description: 'The opportunity ID to update',
        },
        stage: {
          type: FunctionDeclarationSchemaType.STRING,
          description: 'New stage: new, qualifying, nurture, won, lost',
        },
        value: {
          type: FunctionDeclarationSchemaType.NUMBER,
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
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        contactId: {
          type: FunctionDeclarationSchemaType.STRING,
          description: 'The contact ID to send message to',
        },
        message: {
          type: FunctionDeclarationSchemaType.STRING,
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
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {},
    },
  },
];

export function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{ functionDeclarations: toolDeclarations }],
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
