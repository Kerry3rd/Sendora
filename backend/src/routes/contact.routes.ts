import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import ContactController, { upload } from '../controllers/contact.controller';
import { body, param, query } from 'express-validator';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// All contact routes require authentication
router.use(authenticate);
router.use(apiLimiter); // Apply rate limiting

// Validation rules
const contactValidation = [
  body('phoneNumber')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(?:\+255|0)[67][0-9]{8}$/).withMessage('Invalid Tanzanian phone number format'),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('company').optional().trim(),
  body('tags').optional().isArray(),
  body('customFields').optional().isObject(),
  body('isSubscribed').optional().isBoolean(),
  body('isBlacklisted').optional().isBoolean(),
];

// Basic CRUD routes
router.get('/', ContactController.getContacts);
router.get('/stats', ContactController.getStats);
router.get('/export', ContactController.exportContacts);
router.get('/import-history', ContactController.getImportHistory);
router.get('/sample-template', ContactController.downloadSampleTemplate);
router.post('/validate', ContactController.validateContacts);

router.get('/:id', 
  param('id').isUUID().withMessage('Invalid contact ID'),
  ContactController.getContact
);

router.post('/',
  contactValidation,
  ContactController.createContact
);

// FIXED: Cast upload.single to any to bypass TypeScript error
router.post('/import',
  upload.single('file') as any,
  ContactController.importContacts
);

// NEW: Bulk import with options
router.post('/bulk-import',
  ContactController.bulkImport
);

// NEW: Export selected contacts
router.post('/export-selected',
  body('contactIds').isArray().withMessage('Contact IDs must be an array'),
  body('options').optional().isObject(),
  ContactController.exportSelected
);

router.post('/bulk-delete',
  body('ids').isArray().withMessage('IDs must be an array'),
  ContactController.bulkDelete
);

router.put('/:id',
  param('id').isUUID().withMessage('Invalid contact ID'),
  contactValidation,
  ContactController.updateContact
);

router.delete('/:id',
  param('id').isUUID().withMessage('Invalid contact ID'),
  ContactController.deleteContact
);

export default router;