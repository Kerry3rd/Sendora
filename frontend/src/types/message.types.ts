export type MessageType = 'email' | 'sms' | 'notification';
export type RepeatType = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
export type TargetType = 'all' | 'group' | 'contacts';
export type LogStatus = 'sent' | 'failed' | 'pending';

export interface ScheduledMessage {
  id: string;
  name: string;
  subject: string;
  content: string;
  messageType: MessageType;
  repeatType: RepeatType;
  repeatDay?: number;
  repeatTime: string;
  startDate: string;
  endDate?: string;
  lastSentAt?: string;
  nextScheduledAt: string;
  status: MessageStatus;
  targetType: TargetType;
  targetIds: string[];
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageLog {
  id: string;
  scheduledMessageId: string;
  contactId: string;
  contactEmail?: string;
  contactPhone?: string;
  status: LogStatus;
  error?: string;
  sentAt: string;
  metadata?: any;
}

export interface MessageFormData {
  name: string;
  subject: string;
  content: string;
  messageType: MessageType;
  repeatType: RepeatType;
  repeatDay?: number;
  repeatTime: string;
  startDate: string;
  endDate?: string;
  targetType: TargetType;
  targetIds: string[];
}

export interface MessageStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}