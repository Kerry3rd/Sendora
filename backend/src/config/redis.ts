import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class RedisClient {
  private client: RedisClientType | null = null;
  private static instance: RedisClient;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect(): Promise<RedisClientType> {
    if (this.client && this.client.isOpen) {
      this.isConnected = true;
      return this.client;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 
        `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
      
      console.log(`🔄 Connecting to Redis at ${redisUrl}...`);

      this.client = createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis max reconnection attempts reached');
              return new Error('Redis max reconnection attempts');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        console.error('❌ Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async getClient(): Promise<RedisClientType> {
    if (!this.client || !this.client.isOpen) {
      await this.connect();
    }
    return this.client!;
  }

  async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.disconnect();
      this.client = null;
      this.isConnected = false;
      console.log('🔌 Redis disconnected');
    }
  }

  getStatus(): { connected: boolean } {
    return { connected: this.isConnected };
  }

  // Basic string operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = await this.getClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    try {
      if (ttl) {
        await client.setEx(key, ttl, stringValue);
      } else {
        await client.set(key, stringValue);
      }
    } catch (error) {
      console.error(`❌ Redis set error for key ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    const client = await this.getClient();
    
    try {
      const value = await client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`❌ Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.del(key);
    } catch (error) {
      console.error(`❌ Redis del error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    const client = await this.getClient();
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
        console.log(`🗑️ Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      console.error(`❌ Redis delPattern error for pattern ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    try {
      const result = await client.exists(key);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis exists error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    const client = await this.getClient();
    try {
      await client.expire(key, ttl);
    } catch (error) {
      console.error(`❌ Redis expire error for key ${key}:`, error);
    }
  }

  async ttl(key: string): Promise<number> {
    const client = await this.getClient();
    try {
      return await client.ttl(key);
    } catch (error) {
      console.error(`❌ Redis ttl error for key ${key}:`, error);
      return -2;
    }
  }

  // Hash operations
  async hSet(key: string, field: string, value: any): Promise<void> {
    const client = await this.getClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      await client.hSet(key, field, stringValue);
    } catch (error) {
      console.error(`❌ Redis hSet error for ${key}:${field}:`, error);
    }
  }

  async hGet(key: string, field: string): Promise<any> {
    const client = await this.getClient();
    try {
      const value = await client.hGet(key, field);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`❌ Redis hGet error for ${key}:${field}:`, error);
      return null;
    }
  }

  async hGetAll(key: string): Promise<Record<string, any>> {
    const client = await this.getClient();
    try {
      const result = await client.hGetAll(key);
      
      const parsedResult: Record<string, any> = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsedResult[field] = JSON.parse(value);
        } catch {
          parsedResult[field] = value;
        }
      }
      
      return parsedResult;
    } catch (error) {
      console.error(`❌ Redis hGetAll error for key ${key}:`, error);
      return {};
    }
  }

  async hDel(key: string, field: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.hDel(key, field);
    } catch (error) {
      console.error(`❌ Redis hDel error for ${key}:${field}:`, error);
    }
  }

  async hIncrBy(key: string, field: string, increment: number): Promise<number> {
    const client = await this.getClient();
    try {
      return await client.hIncrBy(key, field, increment);
    } catch (error) {
      console.error(`❌ Redis hIncrBy error for ${key}:${field}:`, error);
      return 0;
    }
  }

  // List operations (for queues)
  async lPush(key: string, value: any): Promise<number> {
    const client = await this.getClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      return await client.lPush(key, stringValue);
    } catch (error) {
      console.error(`❌ Redis lPush error for key ${key}:`, error);
      return 0;
    }
  }

  async rPush(key: string, value: any): Promise<number> {
    const client = await this.getClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      return await client.rPush(key, stringValue);
    } catch (error) {
      console.error(`❌ Redis rPush error for key ${key}:`, error);
      return 0;
    }
  }

  async lPop(key: string): Promise<any> {
    const client = await this.getClient();
    try {
      const value = await client.lPop(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`❌ Redis lPop error for key ${key}:`, error);
      return null;
    }
  }

  async rPop(key: string): Promise<any> {
    const client = await this.getClient();
    try {
      const value = await client.rPop(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`❌ Redis rPop error for key ${key}:`, error);
      return null;
    }
  }

  async lRange(key: string, start: number, stop: number): Promise<any[]> {
    const client = await this.getClient();
    try {
      const values = await client.lRange(key, start, stop);
      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      console.error(`❌ Redis lRange error for key ${key}:`, error);
      return [];
    }
  }

  async lLen(key: string): Promise<number> {
    const client = await this.getClient();
    try {
      return await client.lLen(key);
    } catch (error) {
      console.error(`❌ Redis lLen error for key ${key}:`, error);
      return 0;
    }
  }

  // Set operations
  async sAdd(key: string, value: any): Promise<number> {
    const client = await this.getClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      return await client.sAdd(key, stringValue);
    } catch (error) {
      console.error(`❌ Redis sAdd error for key ${key}:`, error);
      return 0;
    }
  }

  async sMembers(key: string): Promise<any[]> {
    const client = await this.getClient();
    try {
      const members = await client.sMembers(key);
      return members.map(member => {
        try {
          return JSON.parse(member);
        } catch {
          return member;
        }
      });
    } catch (error) {
      console.error(`❌ Redis sMembers error for key ${key}:`, error);
      return [];
    }
  }

  // FIXED: sIsMember returns number (0 or 1), convert to boolean
  async sIsMember(key: string, value: any): Promise<boolean> {
    const client = await this.getClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      const result = await client.sIsMember(key, stringValue);
      return result === 1; // Convert number to boolean
    } catch (error) {
      console.error(`❌ Redis sIsMember error for key ${key}:`, error);
      return false;
    }
  }

  // Sorted set operations (for rate limiting)
  async zAdd(key: string, score: number, member: any): Promise<number> {
    const client = await this.getClient();
    const stringMember = typeof member === 'string' ? member : JSON.stringify(member);
    try {
      return await client.zAdd(key, { score, value: stringMember });
    } catch (error) {
      console.error(`❌ Redis zAdd error for key ${key}:`, error);
      return 0;
    }
  }

  async zRangeByScore(key: string, min: number, max: number): Promise<any[]> {
    const client = await this.getClient();
    try {
      const members = await client.zRangeByScore(key, min, max);
      return members.map(member => {
        try {
          return JSON.parse(member);
        } catch {
          return member;
        }
      });
    } catch (error) {
      console.error(`❌ Redis zRangeByScore error for key ${key}:`, error);
      return [];
    }
  }

  async zRemRangeByScore(key: string, min: number, max: number): Promise<number> {
    const client = await this.getClient();
    try {
      return await client.zRemRangeByScore(key, min, max);
    } catch (error) {
      console.error(`❌ Redis zRemRangeByScore error for key ${key}:`, error);
      return 0;
    }
  }

  // Cache helper methods
  async remember<T>(
    key: string,
    ttlSeconds: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached as T;
    }

    const fresh = await callback();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async rememberForever<T>(
    key: string,
    callback: () => Promise<T>
  ): Promise<T> {
    return this.remember(key, 0, callback);
  }

  // Increment/Decrement
  async incr(key: string): Promise<number> {
    const client = await this.getClient();
    try {
      return await client.incr(key);
    } catch (error) {
      console.error(`❌ Redis incr error for key ${key}:`, error);
      return 0;
    }
  }

  async incrBy(key: string, increment: number): Promise<number> {
    const client = await this.getClient();
    try {
      return await client.incrBy(key, increment);
    } catch (error) {
      console.error(`❌ Redis incrBy error for key ${key}:`, error);
      return 0;
    }
  }

  async decr(key: string): Promise<number> {
    const client = await this.getClient();
    try {
      return await client.decr(key);
    } catch (error) {
      console.error(`❌ Redis decr error for key ${key}:`, error);
      return 0;
    }
  }

  // Utility methods
  async flushAll(): Promise<void> {
    const client = await this.getClient();
    try {
      await client.flushAll();
      console.log('🗑️ Redis flushed all keys');
    } catch (error) {
      console.error('❌ Redis flushAll error:', error);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const client = await this.getClient();
    try {
      return await client.keys(pattern);
    } catch (error) {
      console.error(`❌ Redis keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async ping(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Redis ping error:', error);
      return false;
    }
  }
}

// Create and export singleton instance
const redisClient = RedisClient.getInstance();

export default redisClient;