import smsWorker, { SMSWorker } from "./workers/SMSWorker";
import { MessageSchedulerService } from './services/message-scheduler.service';

// Start worker when backend starts
smsWorker.start().catch(console.error);const scheduler = MessageSchedulerService.getInstance();
scheduler.start();


// Graceful shutdown
process.on('SIGTERM', () => {
  scheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  scheduler.stop();
  process.exit(0);
});