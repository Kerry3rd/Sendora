interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  fromName: string;
  replyTo?: string;
  rateLimit?: {
    max: number;  // max emails per minute
    period: number; // period in ms
  };
}

// Load from environment variables
export const emailConfig: EmailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
  fromName: process.env.EMAIL_FROM_NAME || 'Your App Name',
  replyTo: process.env.EMAIL_REPLY_TO,
  rateLimit: {
    max: parseInt(process.env.EMAIL_RATE_LIMIT_MAX || '50'),
    period: 60 * 1000, // 1 minute
  }
};

// Validate required config
if (!emailConfig.auth.user || !emailConfig.auth.pass) {
  console.warn('Email credentials not configured. Email sending will fail.');
}