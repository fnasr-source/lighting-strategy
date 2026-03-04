export type SchedulingAudienceCase = 'lead' | 'client' | 'team_partner';

export type SchedulingRoutingMode =
  | 'host_fixed'
  | 'round_robin_weighted'
  | 'collective_required';

export type SchedulingBookingStatus =
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export interface SchedulingIntakeQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'phone' | 'email';
  required: boolean;
  options?: string[];
}

export interface SchedulingReminderPolicy {
  firstMinutesBefore: number;
  secondMinutesBefore: number;
}

export interface SchedulingAvailabilityWindow {
  weekday: number; // 0 = Sunday
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface SchedulingGoogleConnection {
  connected: boolean;
  calendarId?: string;
  accessTokenEnc?: string;
  refreshTokenEnc?: string;
  expiryDate?: string;
  scope?: string;
  channelId?: string;
  resourceId?: string;
  watchExpiration?: string;
  lastSyncAt?: string;
  lastError?: string;
}

export interface SchedulingHost {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  timezone: string;
  active: boolean;
  defaultAvailability: SchedulingAvailabilityWindow[];
  google?: SchedulingGoogleConnection;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SchedulingEventType {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  audienceCase: SchedulingAudienceCase;
  durationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  minNoticeMinutes: number;
  bookingWindowDays: number;
  cancelCutoffHours: number;
  routingMode: SchedulingRoutingMode;
  fixedHostUserId?: string;
  timezone: string;
  reminderPolicy: SchedulingReminderPolicy;
  intakeQuestions: SchedulingIntakeQuestion[];
  locationType: 'google_meet' | 'phone' | 'custom';
  locationDetails?: string;
  campaignId?: string;
  isActive: boolean;
  roundRobinCursor?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SchedulingHostEventTypeMap {
  id?: string;
  eventTypeId: string;
  hostUserId: string;
  weight: number;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SchedulingAvailabilityRule {
  id?: string;
  hostUserId: string;
  eventTypeId?: string;
  ruleType: 'weekly' | 'date_override';
  weekday?: number;
  date?: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SchedulingInvitee {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  timezone: string;
}

export interface SchedulingBooking {
  id?: string;
  eventTypeId: string;
  eventSlug: string;
  eventName: string;
  audienceCase: SchedulingAudienceCase;
  routingMode: SchedulingRoutingMode;
  invitee: SchedulingInvitee;
  intakeResponses: Record<string, string>;
  hostUserIds: string[];
  primaryHostUserId: string;
  startAt: string;
  endAt: string;
  status: SchedulingBookingStatus;
  googleEventIds?: Record<string, string>;
  googleMeetLink?: string;
  locationText?: string;
  manageTokenHash: string;
  manageTokenExpiresAt: string;
  manageTokenEnc?: string;
  source: {
    type: 'public' | 'campaign' | 'internal';
    campaignId?: string;
    utm?: Record<string, string>;
  };
  linkedLeadId?: string;
  linkedClientId?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  previousStartAt?: string;
  previousEndAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SchedulingBookingEvent {
  id?: string;
  bookingId: string;
  eventType: 'created' | 'rescheduled' | 'cancelled' | 'reminder_sent' | 'updated';
  actorType: 'invitee' | 'host' | 'system';
  actorId?: string;
  details?: Record<string, unknown>;
  createdAt?: unknown;
}

export interface SchedulingReminderQueueItem {
  id?: string;
  bookingId: string;
  reminderType: '24h' | '1h';
  scheduledFor: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  idempotencyKey: string;
  attempts: number;
  sentAt?: string;
  lastError?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SchedulingTask {
  id?: string;
  bookingId: string;
  title: string;
  description?: string;
  assignedToUid?: string;
  dueAt: string;
  status: 'open' | 'done';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SlotQueryInput {
  eventTypeId?: string;
  slug?: string;
  timezone: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface AvailableSlot {
  startAt: string;
  endAt: string;
  timezone: string;
  hostUserIds: string[];
  primaryHostUserId: string;
}

export interface BookingRequestInput {
  eventTypeId?: string;
  slug?: string;
  invitee: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    timezone: string;
  };
  slot: {
    startAt: string;
  };
  intakeResponses?: Record<string, string>;
  source?: {
    type?: 'public' | 'campaign' | 'internal';
    campaignId?: string;
    utm?: Record<string, string>;
  };
}

export const SCHEDULING_DEFAULTS = {
  reminderPolicy: {
    firstMinutesBefore: 24 * 60,
    secondMinutesBefore: 60,
  },
  minNoticeMinutes: 120,
  bookingWindowDays: 30,
  cancelCutoffHours: 4,
  durationMin: 30,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
} as const;
