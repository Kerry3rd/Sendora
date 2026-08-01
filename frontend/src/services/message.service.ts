import api from './api';
import { ScheduledMessage, MessageFormData, MessageLog, MessageStats } from '../types/message.types';

export interface MessagesResponse {
  messages: ScheduledMessage[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface MessageLogsResponse {
  logs: MessageLog[];
  stats: Array<{ status: string; count: string }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const messageService = {
  // Get all messages
  async getMessages(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<MessagesResponse> {
    const response = await api.get('/messages', { params });
    return response.data.data;
  },

  // Get single message
  async getMessage(id: string): Promise<ScheduledMessage & { recentLogs: MessageLog[] }> {
    const response = await api.get(`/messages/${id}`);
    return response.data.data;
  },

  // Create new scheduled message
  async createMessage(data: MessageFormData): Promise<ScheduledMessage> {
    const response = await api.post('/messages', data);
    return response.data.data;
  },

  // Update message
  async updateMessage(id: string, data: Partial<MessageFormData>): Promise<ScheduledMessage> {
    const response = await api.put(`/messages/${id}`, data);
    return response.data.data;
  },

  // Delete message
  async deleteMessage(id: string): Promise<void> {
    await api.delete(`/messages/${id}`);
  },

  // Pause message
  async pauseMessage(id: string): Promise<void> {
    await api.post(`/messages/${id}/pause`);
  },

  // Resume message
  async resumeMessage(id: string): Promise<void> {
    await api.post(`/messages/${id}/resume`);
  },

  // Get message logs
  async getMessageLogs(id: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<MessageLogsResponse> {
    const response = await api.get(`/messages/${id}/logs`, { params });
    return response.data.data;
  },

  // Trigger message manually (for testing)
  async triggerNow(id: string): Promise<void> {
    await api.post(`/messages/${id}/trigger`);
  }
};