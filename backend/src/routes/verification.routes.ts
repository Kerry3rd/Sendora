import { Router } from 'express';
import VerificationController from '../controllers/verification.controller';

const router = Router();

// Registration flow
router.post('/register/initiate', VerificationController.initiateRegistration);
router.post('/verify/email', VerificationController.verifyEmail);
router.post('/verify/phone', VerificationController.verifyPhone);
router.post('/register/username', VerificationController.createUsername);
router.post('/resend-code', VerificationController.resendCode);

// Login (supports username/email/phone)
router.post('/login', VerificationController.login);

export default router;
