import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import sequelize from './config/sequelize';
import redisClient from './config/redis';
import { syncDatabase } from './utils/dbSync';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import smsRoutes from './routes/sms.routes';
import campaignRoutes from './routes/campaign.routes';
import testRoutes from './routes/test.routes';
import webhookRoutes from './routes/webhook.routes';
import contactRoutes from './routes/contact.routes';
import paymentRoutes from './routes/payment.routes';
import verificationRoutes from './routes/verification.routes';
import passwordResetRoutes from './routes/passwordReset.routes';
import notificationRoutes from './routes/notification.routes';
import azamPayRoutes from './routes/azampay.routes';
import groupRoutes from './routes/group.routes';
import templateRoutes from './routes/template.routes';

// Middleware
import { errorHandler } from './middleware/error.middleware';
import { standardLimiter, smsLimiter } from './middleware/rateLimit.middleware';

// Services
import { initializeAzamPay } from './config/azampay-init';
import { smsService } from './services/sms/SMSService';
import { initializeQueues, smsQueue } from './services/queue.service';

// Load environment variables
dotenv.config();

class App {
  public app: Application;
  public port: number;

  constructor(port: number) {
    this.app = express();
    this.port = port;

    this.initializeDatabase();
    this.initializeRedis();
    this.initializeMiddlewares();
    this.initializeServices();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established.');

      await syncDatabase(false);
      
      console.log('✅ Database initialized successfully.');
      console.log('💾 All existing data has been preserved.');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      await redisClient.connect();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      console.log('⚠️ Continuing without Redis - caching and queues disabled');
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize AzamPay
      const azamPay = initializeAzamPay();
      if (azamPay) {
        console.log('✅ AzamPay service initialized');
      } else {
        console.log('⚠️ AzamPay service not configured (optional)');
      }

      // Initialize queues (if Redis is available)
      if (redisClient.getStatus().connected) {
        const queues = await initializeQueues();
        
        // Only initialize SMS queue if it exists
        if (queues.smsQueue) {
          await smsService.initializeQueue(queues.smsQueue);
          console.log('✅ SMS queue initialized');
        }
      } else {
        console.log('⚠️ Redis not available - queues disabled');
      }

      console.log('✅ Services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
    }
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || 'https://yourdomain.com'] 
        : ['http://localhost:3001', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Global rate limiting
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { 
        success: false, 
        message: 'Too many requests from this IP, please try again later.' 
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', globalLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        redis: redisClient.getStatus().connected ? 'connected' : 'disconnected',
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV,
      });
    });

    // API status endpoint
    this.app.get('/api/status', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'SENDORA API is running',
        version: '1.0.0',
        endpoints: {
          auth: '/api/v1/auth',
          sms: '/api/v1/sms',
          campaigns: '/api/v1/campaigns',
          contacts: '/api/v1/contacts',
          groups: '/api/v1/groups',
          payments: '/api/v1/payments',
          azampay: '/api/v1/azampay',
        },
      });
    });

    // API routes (all prefixed with /api/v1)
    const apiRouter = express.Router();

    // Apply specific rate limiters to sensitive routes
    apiRouter.use('/sms', smsLimiter);
    apiRouter.use('/auth', standardLimiter);

    // Mount all route modules
    apiRouter.use('/webhooks', webhookRoutes);
    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/verification', verificationRoutes);
    apiRouter.use('/users', userRoutes);
    apiRouter.use('/sms', smsRoutes);
    apiRouter.use('/campaigns', campaignRoutes);
    apiRouter.use('/test', testRoutes);
    apiRouter.use('/contacts', contactRoutes);
    apiRouter.use('/payments', paymentRoutes);
    apiRouter.use('/password-reset', passwordResetRoutes);
    apiRouter.use('/notifications', notificationRoutes);
    apiRouter.use('/azampay', azamPayRoutes);
    apiRouter.use('/groups', groupRoutes);

    // Mount the API router
    this.app.use('/api/v1', apiRouter);

    this.app.use('/api/v1/templates', templateRoutes);
    
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async listen(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log('\n');
        console.log('🚀 ==================================');
        console.log(`🚀 Server running on port ${this.port}`);
        console.log('🚀 ==================================');
        console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 API URL: http://localhost:${this.port}/api/v1`);
        console.log(`🏥 Health check: http://localhost:${this.port}/health`);
        console.log(`📊 API Status: http://localhost:${this.port}/api/status`);
        console.log(`💾 Database: Connected (data preserved)`);
        console.log(`📦 Redis: ${redisClient.getStatus().connected ? 'Connected' : 'Disconnected'}`);
        console.log('🚀 ==================================\n');
        resolve();
      });
    });
  }

  public async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down gracefully...');
    
    try {
      await sequelize.close();
      console.log('✅ Database connection closed');

      await redisClient.disconnect();
      console.log('✅ Redis connection closed');

      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

export default App;