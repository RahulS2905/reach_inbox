import { z } from "zod";

// ---------------------------------------------------------------------------
// Email scheduling
// ---------------------------------------------------------------------------

export const ScheduleEmailRequestSchema = z.object({
  senderAccountId: z.string().min(1),
  subject: z.string().min(1).max(998), // RFC 2822 header line length
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1).max(50000),
  startTime: z.string().datetime({ offset: true }),
  delayMs: z.number().int().min(0).max(3_600_000).default(2000),
  hourlyLimit: z.number().int().min(1).max(100000).default(200),
});
export type ScheduleEmailRequest = z.infer<typeof ScheduleEmailRequestSchema>;

export const EmailJobStatusValues = [
  "PENDING",
  "QUEUED",
  "RESERVED",
  "SENDING",
  "SENT",
  "FAILED",
  "RESCHEDULED",
  "CANCELLED",
] as const;
export type EmailJobStatus = (typeof EmailJobStatusValues)[number];

export interface EmailJobDTO {
  id: string;
  campaignId: string;
  recipient: string;
  subject: string;
  senderLabel: string;
  scheduledFor: string;
  status: EmailJobStatus;
  attemptCount: number;
  lastError: string | null;
  providerMessageId: string | null;
  previewUrl: string | null;
  sentAt: string | null;
}

export interface CampaignDTO {
  id: string;
  subject: string;
  senderLabel: string;
  status: string;
  totalRecipients: number;
  queued: number;
  sent: number;
  failed: number;
  startTime: string;
  nextScheduledFor: string | null;
}

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["scheduledFor", "sentAt", "createdAt"]).default("scheduledFor"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// ---------------------------------------------------------------------------
// BullMQ job payload — the queue only ever carries the DB id + minimal
// context; the worker re-reads current state from Postgres before acting,
// so replays/retries never operate on stale in-memory data.
// ---------------------------------------------------------------------------

export interface EmailJobPayload {
  emailJobId: string;
  tenantId: string;
  senderAccountId: string;
}

export const QUEUE_NAMES = {
  emailSend: "email-send",
  outboxSweep: "outbox-sweep",
  esIndexSweep: "es-index-sweep",
} as const;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface CurrentUserDTO {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

// ---------------------------------------------------------------------------
// Slack
// ---------------------------------------------------------------------------

export interface SlackStatusDTO {
  connected: boolean;
  teamName?: string;
  channelName?: string;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  senderAccountId: z.string().optional(),
  campaignId: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

// Campaign Event
export interface CampaignEventDTO {
  id: string;
  campaignId: string;
  emailJobId: string | null;
  eventType: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// Campaign Detail (richer than CampaignDTO)
export interface CampaignDetailDTO extends CampaignDTO {
  name: string;
  body: string;
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  createdAt: string;
  updatedAt: string;
}

// Dashboard Stats
export interface DashboardStatsDTO {
  totalCampaigns: number;
  scheduledEmails: number;
  sentEmails: number;
  failedEmails: number;
  deferredEmails: number;
  cancelledEmails: number;
  recentEvents: CampaignEventDTO[];
  upcomingCampaigns: CampaignDTO[];
}

// Queue Health
export interface QueueHealthDTO {
  queueName: string;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: number;
}

export interface ServiceHealthDTO {
  postgres: { status: 'up' | 'down'; latencyMs?: number };
  redis: { status: 'up' | 'down'; latencyMs?: number };
  elasticsearch: { status: 'up' | 'down'; latencyMs?: number };
  queues: QueueHealthDTO[];
  workerLastSeen?: string;
}

// Sender schema shared between frontend and backend
export const CreateSenderSchema = z.object({
  label: z.string().min(1).max(100),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  maxEmailsPerHour: z.coerce.number().int().min(1).max(100000).default(200),
  minSendIntervalMs: z.coerce.number().int().min(0).max(60000).default(2000),
});
export type CreateSenderRequest = z.infer<typeof CreateSenderSchema>;

export interface SenderDTO {
  id: string;
  label: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  maxEmailsPerHour: number;
  minSendIntervalMs: number;
  isTestSender: boolean;
  createdAt: string;
}
