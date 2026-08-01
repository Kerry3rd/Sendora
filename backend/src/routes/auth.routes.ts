import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { 
  validate, 
  registerValidation, 
  loginValidation 
} from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', validate(registerValidation), AuthController.register);
router.post('/login', validate(loginValidation), AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);
router.post('/logout', authenticate, AuthController.logout);

export default router;
