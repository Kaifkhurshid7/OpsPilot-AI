import { searchContacts } from './searchContacts.tool';
import { createTask } from './createTask.tool';
import { updateOpportunity } from './updateOpportunity.tool';
import { sendWhatsapp } from './sendWhatsapp.tool';
import { fetchMetrics } from './fetchMetrics.tool';

export interface ToolContext {
  tenantId: string;
  userId: string;
}

export type ToolFunction = (
  args: Record<string, any>,
  context: ToolContext,
) => Promise<Record<string, any>>;

export const toolRegistry: Record<string, ToolFunction> = {
  search_contacts: searchContacts,
  create_task: createTask,
  update_opportunity: updateOpportunity,
  send_whatsapp: sendWhatsapp,
  fetch_business_metrics: fetchMetrics,
};
