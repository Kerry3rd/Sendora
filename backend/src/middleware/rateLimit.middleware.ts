import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';
import { AuthRequest } from './auth.middleware';
import { TooManyRequestsError } from '../utils/errors';
import Campaign from '../models/Campaign';

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  max: number;          // Max requests per window
  message?: string;     // Custom message
  keyPrefix?: string;   // Redis key prefix
  skipFailedRequests?: boolean; // Don't count failed requests
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  statusCode?: number;  // HTTP status code to return
}

export const rateLimiter = (config: RateLimitConfig) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Use user ID if authenticated, otherwise IP
      const identifier = req.user?.id || req.ip || 'anonymous';
      const route = req.baseUrl + req.path;
      
      // Combine all factors for the key
      const redisKey = `${config.keyPrefix || 'rate'}:${route}:${identifier}`;
      
      // Get current count
      const current = await redis.get(redisKey);
      const currentCount = current ? parseInt(current) : 0;
      
      if (currentCount >= config.max) {
        const ttl = await redis.ttl(redisKey);
        throw new TooManyRequestsError(
          config.message || `Too many requests. Try again in ${Math.ceil(ttl / 60)} minutes.`
        );
      }
      
      // Increment counter
      const newCount = await redis.incr(redisKey);
      
      // If this is the first request, set expiry
      if (newCount === 1) {
        await redis.expire(redisKey, Math.ceil(config.windowMs / 1000));
      }
      
      // Add rate limit info to response headers
      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - newCount));
      res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + config.windowMs) / 1000));
      
      // Store for potential skip logic
      (req as any).rateLimit = {
        key: redisKey,
        config
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// User-based limiters
export const userLimiter = (max: number, windowMs: number = 60 * 1000) => 
  rateLimiter({
    windowMs,
    max,
    keyPrefix: 'user',
    message: 'User rate limit exceeded'
  });

// Daily quota limiter (resets at midnight)
export const dailyQuotaLimiter = (max: number) => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const secondsUntilMidnight = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
  
  return rateLimiter({
    windowMs: secondsUntilMidnight * 1000,
    max,
    keyPrefix: 'daily',
    message: 'Daily quota exceeded'
  });
};

// ========== AUTHENTICATION RATE LIMITERS ==========

// Track failed login attempts per user/email
export const userAuthLimiter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const identifier = req.body.email || req.body.username || req.body.phone;
    if (!identifier) return next();

    const key = `auth:user:${identifier}`;
    const attempts = await redis.get(key);
    const currentAttempts = attempts ? parseInt(attempts) : 0;

    if (currentAttempts >= 5) {
      const ttl = await redis.ttl(key);
      throw new TooManyRequestsError(
        `Too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`
      );
    }

    // Store in request for later use
    (req as any).authIdentifier = identifier;
    (req as any).authAttemptKey = key;

    next();
  } catch (error) {
    next(error);
  }
};

// Increment failed attempts counter
export const incrementFailedAttempts = async (identifier: string) => {
  if (!identifier) return;
  const key = `auth:user:${identifier}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, 15 * 60); // 15 minutes
  }
  return attempts;
};

// Reset failed attempts counter on successful login
export const resetFailedAttempts = async (identifier: string) => {
  if (!identifier) return;
  await redis.del(`auth:user:${identifier}`);
};

// IP-based auth limiter (backup)
export const ipAuthLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,                     // 20 attempts per IP
  keyPrefix: 'auth-ip',
  message: 'Too many login attempts from this IP. Please try again later.'
});

// ========== PASSWORD RESET LIMITERS ==========

export const passwordResetLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 3,                      // 3 password reset requests per hour
  keyPrefix: 'password-reset',
  message: 'Too many password reset requests. Please try again later.'
});

export const passwordResetTokenLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,                      // 5 token verification attempts per hour
  keyPrefix: 'password-reset-token',
  message: 'Too many verification attempts. Please try again later.'
});

// ========== 2FA LIMITERS ==========

export const twoFactorLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // 10 2FA attempts per 15 minutes
  keyPrefix: '2fa',
  message: 'Too many 2FA attempts. Please try again later.'
});

export const twoFactorSetupLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 3,                      // 3 2FA setup attempts per hour
  keyPrefix: '2fa-setup',
  message: 'Too many 2FA setup attempts. Please try again later.'
});

// ========== EXISTING LIMITERS ==========

export const strictLimiter = rateLimiter({
  windowMs: 60 * 1000,        // 1 minute
  max: 10,                    // 10 requests per minute
  message: 'Too many requests. Please slow down.'
});

export const standardLimiter = rateLimiter({
  windowMs: 60 * 1000,        // 1 minute
  max: 60,                    // 60 requests per minute
  message: 'Rate limit exceeded. Try again later.'
});

export const smsLimiter = rateLimiter({
  windowMs: 60 * 1000,        // 1 minute
  max: 30,                    // 30 SMS per minute
  message: 'SMS rate limit exceeded. Please wait before sending more.'
});

export const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 5,                     // 5 login attempts per 15 minutes
  message: 'Too many login attempts. Please try again later.'
});

export const apiLimiter = rateLimiter({
  windowMs: 60 * 1000,        // 1 minute
  max: 100,                   // 100 API calls per minute
  message: 'API rate limit exceeded.'
});

// User-based SMS limiter
export const userSmsLimiter = userLimiter(100, 60 * 60 * 1000); // 100 SMS per hour per user

// Daily SMS quota limiter
export const dailySmsQuota = dailyQuotaLimiter(1000); // 1000 SMS per day per user

// Concurrent campaigns limiter
export const concurrentCampaignsLimiter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next();
    
    const userId = req.user.id;
    const runningCampaigns = await Campaign.count({
      where: {
        userId,
        status: 'running'
      }
    });
    
    const maxConcurrent = 5; // Max 5 concurrent campaigns
    
    if (runningCampaigns >= maxConcurrent) {
      throw new TooManyRequestsError(
        `You already have ${runningCampaigns} running campaigns. Maximum allowed is ${maxConcurrent}.`
      );
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Helper function to get rate limit status for a key
export const getRateLimitStatus = async (key: string) => {
  const current = await redis.get(key);
  const ttl = await redis.ttl(key);
  
  return {
    current: current ? parseInt(current) : 0,
    ttl,
    remaining: current ? Math.max(0, 5 - parseInt(current)) : 5
  };
};

// Clean up expired rate limit keys (optional - can be run as a cron job)
export const cleanExpiredRateLimits = async () => {
  try {
    const keys = await redis.keys('rate:*');
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
      }
    }
    console.log(`🧹 Cleaned up ${keys.length} rate limit keys`);
  } catch (error) {
    console.error('Error cleaning rate limits:', error);
  }
};