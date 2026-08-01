// backend/src/utils/cache.ts
import redis from '../config/redis';

export class Cache {
  static async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`❌ Cache parse error for key ${key}:`, error);
      // Delete invalid cache entry
      await redis.del(key);
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      // Ensure value is serializable
      const serializedValue = JSON.stringify(value);
      await redis.set(key, serializedValue, ttlSeconds);
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`❌ Cache del error for key ${key}:`, error);
    }
  }

  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        for (const key of keys) {
          await redis.del(key);
        }
        console.log(`🗑️ Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      console.error(`❌ Cache delPattern error for pattern ${pattern}:`, error);
    }
  }

  static async remember<T>(
    key: string,
    ttlSeconds: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    try {
      const fresh = await callback();
      await this.set(key, fresh, ttlSeconds);
      return fresh;
    } catch (error) {
      console.error(`❌ Cache remember error for key ${key}:`, error);
      throw error;
    }
  }

  static async rememberForever<T>(
    key: string,
    callback: () => Promise<T>
  ): Promise<T> {
    return this.remember(key, 0, callback);
  }

  static async exists(key: string): Promise<boolean> {
    try {
      return await redis.exists(key);
    } catch (error) {
      console.error(`❌ Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  static async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error(`❌ Cache ttl error for key ${key}:`, error);
      return -2;
    }
  }
}