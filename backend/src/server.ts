import dotenv from 'dotenv';
import App from './app';


// Load environment variables
dotenv.config();

// Import safety checks FIRST
import './config/safety';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Create and start the server
const server = new App(PORT);
server.listen();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Starting graceful shutdown...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Starting graceful shutdown...');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
