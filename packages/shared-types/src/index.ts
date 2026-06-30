// ===== Auth =====
export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'REP';
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'REP';
  iat: number;
  exp: number;
}

// ===== Tenant =====
export interface TenantDto {
  id: string;
  name: string;
  industry: string | null;
  onboarded: boolean;
  createdAt: string;
}

// ===== Contact =====
export interface ContactDto {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  tags: string[];
  createdAt: string;
}

export interface CreateContactDto {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  tags?: string[];
}

export interface UpdateContactDto {
  name?: string;
  phone?: string;
  email?: string;
  source?: string;
  tags?: string[];
}

// ===== Opportunity =====
export interface OpportunityDto {
  id: string;
  tenantId: string;
  contactId: string;
  title: string;
  value: number;
  stage: string;
  score: number | null;
  nextBestAction: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityDto {
  contactId: string;
  title: string;
  value?: number;
  stage?: string;
}

export interface UpdateOpportunityDto {
  title?: string;
  value?: number;
  stage?: string;
  score?: number;
  nextBestAction?: string;
}

// ===== Task =====
export interface TaskDto {
  id: string;
  tenantId: string;
  contactId: string | null;
  title: string;
  dueAt: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateTaskDto {
  contactId?: string;
  title: string;
  dueAt: string;
}

// ===== AI Chat =====
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  explanation?: string;
  createdAt: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

// ===== Timeline =====
export interface TimelineEntry {
  id: string;
  channel: 'whatsapp' | 'email' | 'call';
  direction: 'inbound' | 'outbound';
  body: string;
  aiSummary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  intent?: string;
  createdAt: string;
}

// ===== Dashboard =====
export interface DashboardKpis {
  activeOpportunities: number;
  pipelineValue: number;
  pendingFollowUps: number;
  recentActivity: AuditLogEntry[];
}

// ===== Audit Log =====
export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ===== API Responses =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
