-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');
CREATE TYPE message_status AS ENUM ('pending', 'queued', 'sent', 'delivered', 'failed', 'undelivered');
CREATE TYPE gateway_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE billing_plan AS ENUM ('free', 'basic', 'pro', 'enterprise');

-- Enable Row Level Security (for future use)
ALTER DATABASE bulksms_dev SET "app.jwt_secret" TO 'your-secret-key-change-in-production';
