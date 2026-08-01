import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import redis from '../config/redis';
import jwt from 'jsonwebtoken';

interface ConnectedUser {
  socketId: string;
  userId: string;
  rooms: string[];
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, ConnectedUser> = new Map(); // socketId -> user
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.data.userId = decoded.id;
        socket.data.user = decoded;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', this.handleConnection.bind(this));

    console.log('✅ WebSocket server initialized');
    
    // Set up Redis pub/sub for multi-server support
    this.setupRedisPubSub();
  }

  private async handleConnection(socket: any) {
    const userId = socket.data.userId;
    console.log(`🔌 User connected: ${userId} (socket: ${socket.id})`);

    // Store connection
    this.addUserConnection(userId, socket.id);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Send initial connection confirmation
    socket.emit('connected', { 
      message: 'Connected to real-time server',
      userId 
    });

    // Handle joining campaign rooms
    socket.on('join-campaign', (campaignId: string) => {
      socket.join(`campaign:${campaignId}`);
      console.log(`User ${userId} joined campaign room: ${campaignId}`);
    });

    socket.on('leave-campaign', (campaignId: string) => {
      socket.leave(`campaign:${campaignId}`);
      console.log(`User ${userId} left campaign room: ${campaignId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.removeUserConnection(userId, socket.id);
      console.log(`🔌 User disconnected: ${userId} (socket: ${socket.id})`);
    });

    // Handle errors
    socket.on('error', (error: any) => {
      console.error(`❌ WebSocket error for user ${userId}:`, error);
    });
  }

  private addUserConnection(userId: string, socketId: string) {
    // Store in connectedUsers map
    this.connectedUsers.set(socketId, {
      socketId,
      userId,
      rooms: []
    });

    // Store in userSockets map
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private removeUserConnection(userId: string, socketId: string) {
    this.connectedUsers.delete(socketId);
    
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  private setupRedisPubSub() {
    // This enables horizontal scaling - multiple servers can communicate
    try {
      const redisAdapter = require('socket.io-redis');
      if (this.io) {
        this.io.adapter(redisAdapter({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        }));
        console.log('✅ Redis adapter initialized for WebSocket');
      }
    } catch (error) {
      console.warn('⚠️ Redis adapter not available - running without multi-server support');
    }
  }

  // ========== EMIT METHODS WITH NULL CHECKS ==========

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) {
      console.warn('⚠️ WebSocket server not initialized, cannot emit to user');
      return;
    }
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Emit to multiple users
  emitToUsers(userIds: string[], event: string, data: any) {
    if (!this.io) {
      console.warn('⚠️ WebSocket server not initialized, cannot emit to users');
      return;
    }
    userIds.forEach(userId => {
      this.io!.to(`user:${userId}`).emit(event, data);
    });
  }

  // Emit to campaign room
  emitToCampaign(campaignId: string, event: string, data: any) {
    if (!this.io) {
      console.warn('⚠️ WebSocket server not initialized, cannot emit to campaign');
      return;
    }
    this.io.to(`campaign:${campaignId}`).emit(event, data);
  }

  // Emit to all connected clients (use sparingly)
  emitToAll(event: string, data: any) {
    if (!this.io) {
      console.warn('⚠️ WebSocket server not initialized, cannot emit to all');
      return;
    }
    this.io.emit(event, data);
  }

  // ========== REAL-TIME UPDATE METHODS ==========

  // Balance update
  emitBalanceUpdate(userId: string, newBalance: number, change?: number) {
    this.emitToUser(userId, 'balance:update', {
      balance: newBalance,
      change,
      timestamp: new Date().toISOString()
    });
  }

  // Campaign progress update
  emitCampaignProgress(campaignId: string, progress: {
    sent: number;
    delivered: number;
    failed: number;
    total: number;
    percentage: number;
    status: string;
  }) {
    this.emitToCampaign(campaignId, 'campaign:progress', progress);
  }

  // Campaign status change
  emitCampaignStatus(campaignId: string, status: string, data?: any) {
    this.emitToCampaign(campaignId, 'campaign:status', {
      campaignId,
      status,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // New notification
  emitNotification(userId: string, notification: any) {
    this.emitToUser(userId, 'notification:new', notification);
    
    // Also emit unread count update
    this.emitUnreadCount(userId, notification.unreadCount || 0);
  }

  // Unread count update
  emitUnreadCount(userId: string, count: number) {
    this.emitToUser(userId, 'notifications:unread', { count });
  }

  // Credit purchase complete
  emitCreditPurchaseComplete(userId: string, transaction: any) {
    this.emitToUser(userId, 'credits:purchased', {
      transactionId: transaction.id,
      credits: transaction.credits,
      newBalance: transaction.newBalance,
      timestamp: new Date().toISOString()
    });
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size || 0) > 0;
  }

  // Get WebSocket server status
  getStatus() {
    return {
      initialized: this.io !== null,
      connectedUsers: this.connectedUsers.size,
      onlineUsers: this.userSockets.size
    };
  }
}

export const wsService = WebSocketService.getInstance();