import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import PaymentController from '../controllers/payment.controller';

const router = Router();

// Public webhook (no auth - called by M-Pesa)
router.post('/mpesa/callback', PaymentController.mpesaCallback);

// Protected routes
router.use(authenticate);

// Get available packages
router.get('/packages', PaymentController.getPackages);

// Initiate M-Pesa payment
router.post('/mpesa/initiate', PaymentController.initiateMpesaPayment);

// Check payment status
router.get('/transaction/:transactionId', PaymentController.checkPaymentStatus);

// Get transaction history
router.get('/transactions', PaymentController.getTransactionHistory);

// Admin only
router.post('/admin/add-credits', authorize('super_admin'), PaymentController.addCredits);

export default router;
