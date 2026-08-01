// src/services/websocket.ts
import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import { updateUserCredits } from '../store/slices/authSlice'; // FIXED
import { addNotification, updateUnreadCount } from '../store/slices/uiSlice';
import { updateCampaignProgress } from '../store/slices/campaignSlice';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    if (this.socket?.connected) return;

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection:status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.emit('connection:status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection:error', error);
    });

    // Balance updates
    this.socket.on('balance:update', (data) => {
      console.log('💰 Balance update:', data);
      store.dispatch(updateUserCredits(data.balance)); // FIXED
      
      if (data.change && Math.abs(data.change) > 0) {
        store.dispatch(addNotification({
          type: data.change > 0 ? 'success' : 'info',
          message: data.change > 0 
            ? `+${data.change} credits added` 
            : `${Math.abs(data.change)} credits used`,
          // FIXED: autoHide should be boolean or number, not both
          autoHide: 5000
        }));
      }
    });

    // Campaign progress
    this.socket.on('campaign:progress', (data) => {
      console.log('📊 Campaign progress:', data);
      store.dispatch(updateCampaignProgress(data));
    });

    // Campaign status change
    this.socket.on('campaign:status', (data) => {
      console.log('📢 Campaign status:', data);
      
      // Show notification
      store.dispatch(addNotification({
        type: data.status === 'completed' ? 'success' : 
              data.status === 'failed' ? 'error' : 'info',
        message: `Campaign ${data.campaignId} is now ${data.status}`,
        autoHide: 5000
      }));
    });

    // New notification
    this.socket.on('notification:new', (notification) => {
      console.log('🔔 New notification:', notification);
      store.dispatch(addNotification(notification));
    });

    // Unread count update
    this.socket.on('notifications:unread', (data) => {
      console.log('📬 Unread count:', data.count);
      store.dispatch(updateUnreadCount(data.count));
    });

    // Credits purchased
    this.socket.on('credits:purchased', (data) => {
      console.log('💳 Credits purchased:', data);
      store.dispatch(updateUserCredits(data.newBalance)); // FIXED
      store.dispatch(addNotification({
        type: 'success',
        message: `${data.credits} credits added successfully!`,
        autoHide: 5000
      }));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinCampaign(campaignId: string) {
    this.socket?.emit('join-campaign', campaignId);
  }

  leaveCampaign(campaignId: string) {
    this.socket?.emit('leave-campaign', campaignId);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    this.socket?.on(event, callback as any);
  }

  off(event: string, callback?: Function) {
    if (callback) {
      const listeners = this.listeners.get(event)?.filter(cb => cb !== callback) || [];
      this.listeners.set(event, listeners);
      this.socket?.off(event, callback as any);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  getConnectionStatus() {
    return {
      connected: this.socket?.connected || false,
      id: this.socket?.id
    };
  }
}

export const wsService = new WebSocketService();