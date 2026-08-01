import { Router } from 'express';
import { EmailService } from '../services/email/email.service';
import { authenticate } from '../middleware/auth.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

router.post('/test-email', async (req: AuthRequest, res) => {
  try {
    // Check if user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const emailService = EmailService.getInstance();
    
    const result = await emailService.sendEmail({
      to: req.user.email,
      subject: 'Test Email from Your App',
      template: 'welcome',
      data: {
        firstName: req.user.firstName || 'User',
        dashboardUrl: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`,
      },
    }, req.user.id);

    res.json({
      success: true,
      message: 'Test email sent',
      result,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

router.get('/email-status', async (req: AuthRequest, res) => {
  try {
    const emailService = EmailService.getInstance();
    const status = emailService.getStatus();
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Test route to check if auth is working
router.get('/auth-check', async (req: AuthRequest, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
        message: 'Authentication is working',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;