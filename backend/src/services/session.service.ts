import { randomBytes } from 'crypto';
import redis from '../config/redis';
import User from '../models/User';

export interface SessionData {
  userId: string;
  token: string;
  userAgent: string;
  ip: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export class SessionService {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly USER_SESSIONS_PREFIX = 'user:sessions:';
  private static readonly SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

  // Create new session
  static async createSession(userId: string, userAgent: string, ip: string): Promise<string> {
    const sessionId = randomBytes(32).toString('hex');
    const sessionKey = this.SESSION_PREFIX + sessionId;
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;

    const session: SessionData = {
      userId,
      token: sessionId,
      userAgent,
      ip,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_DURATION * 1000)
    };

    // Store session in Redis using your custom set method
    await redis.set(
      sessionKey,
      JSON.stringify(session),
      this.SESSION_DURATION
    );

    // Add to user's session list - FIXED: Using your custom methods
    // Since your redis.ts doesn't have sAdd, we'll use a different approach
    // Store session IDs in a Redis list
    const existingSessions = await redis.get(userSessionsKey);
    const sessions = existingSessions ? JSON.parse(existingSessions) : [];
    sessions.push(sessionId);
    await redis.set(userSessionsKey, JSON.stringify(sessions), this.SESSION_DURATION);

    return sessionId;
  }

  // Get session
  static async getSession(sessionId: string): Promise<SessionData | null> {
    const sessionKey = this.SESSION_PREFIX + sessionId;
    const data = await redis.get(sessionKey);
    
    if (!data) return null;

    const session = JSON.parse(data) as SessionData;
    
    // Update last activity
    session.lastActivity = new Date();
    await redis.set(sessionKey, JSON.stringify(session), this.SESSION_DURATION);

    return session;
  }

  // Destroy session
  static async destroySession(sessionId: string) {
    const sessionKey = this.SESSION_PREFIX + sessionId;
    const session = await this.getSession(sessionId);
    
    if (session) {
      const userSessionsKey = this.USER_SESSIONS_PREFIX + session.userId;
      // Remove session from user's list
      const existingSessions = await redis.get(userSessionsKey);
      if (existingSessions) {
        const sessions = JSON.parse(existingSessions).filter((id: string) => id !== sessionId);
        if (sessions.length > 0) {
          await redis.set(userSessionsKey, JSON.stringify(sessions), this.SESSION_DURATION);
        } else {
          await redis.del(userSessionsKey);
        }
      }
    }

    await redis.del(sessionKey);
  }

  // Destroy all user sessions
  static async destroyAllUserSessions(userId: string, excludeSessionId?: string) {
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
    const existingSessions = await redis.get(userSessionsKey);
    
    if (!existingSessions) return;

    const sessionIds = JSON.parse(existingSessions);

    for (const sessionId of sessionIds) {
      if (sessionId !== excludeSessionId) {
        await redis.del(this.SESSION_PREFIX + sessionId);
      }
    }

    if (excludeSessionId) {
      // Keep only the excluded session
      await redis.set(userSessionsKey, JSON.stringify([excludeSessionId]), this.SESSION_DURATION);
    } else {
      await redis.del(userSessionsKey);
    }
  }

  // Get all user sessions
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
    const existingSessions = await redis.get(userSessionsKey);
    
    if (!existingSessions) return [];

    const sessionIds = JSON.parse(existingSessions);
    const sessions: SessionData[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  // Validate session
  static async validateSession(sessionId: string, userId: string, userAgent: string, ip: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    
    if (!session) return false;
    if (session.userId !== userId) return false;
    if (session.userAgent !== userAgent) return false;
    if (session.ip !== ip) return false;
    if (new Date() > new Date(session.expiresAt)) return false;

    return true;
  }

  // Get session count for user
  static async getSessionCount(userId: string): Promise<number> {
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
    const existingSessions = await redis.get(userSessionsKey);
    
    if (!existingSessions) return 0;
    
    const sessions = JSON.parse(existingSessions);
    return sessions.length;
  }

  // Update session activity
  static async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date();
      await redis.set(
        this.SESSION_PREFIX + sessionId,
        JSON.stringify(session),
        this.SESSION_DURATION
      );
    }
  }

  // Clean up expired sessions
  static async cleanExpiredSessions(): Promise<void> {
    const keys = await redis.keys(this.SESSION_PREFIX + '*');
    for (const key of keys) {
      const session = await this.getSession(key.replace(this.SESSION_PREFIX, ''));
      if (session && new Date() > new Date(session.expiresAt)) {
        await this.destroySession(key.replace(this.SESSION_PREFIX, ''));
      }
    }
  }
}