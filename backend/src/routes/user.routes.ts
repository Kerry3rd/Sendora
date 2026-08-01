import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Get user profile
router.get('/profile', (req: AuthRequest, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

// Update user profile
router.put('/profile', (req: AuthRequest, res) => {
  // Implementation for updating user profile
  res.json({
    success: true,
    message: 'Profile updated successfully',
  });
});

// Get user credits
router.get('/credits', (req: AuthRequest, res) => {
  // Implementation for getting user credits
  res.json({
    success: true,
    data: { credits: 1000, currency: 'USD' },
  });
});

// Admin only routes
router.get('/all', authorize('admin', 'super_admin'), (req: AuthRequest, res) => {
  // Implementation for getting all users
  res.json({
    success: true,
    message: 'List of all users',
  });
});

export default router;
