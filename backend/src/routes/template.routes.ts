import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  validate,
  idParamValidation,
  paginationValidation,
} from '../middleware/validation.middleware';
import { body } from 'express-validator';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(apiLimiter);

// Validation rules
const templateValidation = [
  body('name').notEmpty().withMessage('Template name is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('category').optional().isIn(['general', 'marketing', 'transactional', 'notification', 'birthday', 'custom']),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean(),
];

// Routes
router.post('/', validate(templateValidation), TemplateController.create);
router.get('/', validate(paginationValidation), TemplateController.getAll);
router.get('/popular', TemplateController.getPopular);
router.get('/category/:category', TemplateController.getByCategory);
router.get('/:id', validate(idParamValidation), TemplateController.getOne);
router.put('/:id', validate([...idParamValidation, ...templateValidation]), TemplateController.update);
router.delete('/:id', validate(idParamValidation), TemplateController.delete);
router.post('/:id/use', validate(idParamValidation), TemplateController.useTemplate);

export default router;