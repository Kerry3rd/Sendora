import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import GroupController from '../controllers/group.controller';
import { body, param } from 'express-validator';

const router = Router();

// All group routes require authentication
router.use(authenticate);

// Validation rules
const groupValidation = [
  body('name').notEmpty().withMessage('Group name is required').trim(),
  body('description').optional().trim(),
  body('tags').optional().isArray(),
];

const contactIdsValidation = [
  body('contactIds').isArray().withMessage('contactIds must be an array'),
  body('contactIds.*').isUUID().withMessage('Invalid contact ID format'),
];

// Group CRUD
router.get('/', GroupController.getGroups);
router.get('/:id', param('id').isUUID(), GroupController.getGroup);
router.post('/', groupValidation, GroupController.createGroup);
router.put('/:id', param('id').isUUID(), groupValidation, GroupController.updateGroup);
router.delete('/:id', param('id').isUUID(), GroupController.deleteGroup);

// Contact management routes
router.get('/:id/contacts', GroupController.getGroupContacts); // You might need to add this method
router.post('/:id/contacts', GroupController.addContacts);
router.delete('/:id/contacts', GroupController.removeContacts);

router.get('/:id/available-contacts', GroupController.getAvailableContacts);

export default router;
