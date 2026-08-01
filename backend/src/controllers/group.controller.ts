import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Group from '../models/Group';
import Contact from '../models/Contact';
// import GroupContact from '../models/GroupMembership';
import { Op, QueryTypes } from 'sequelize'; // Add QueryTypes here
import { validationResult } from 'express-validator';
import GroupMembership from '../models/GroupMembership';
import sequelize from '../config/sequelize';
import { group } from 'console';

export class GroupController {

  // Get contacts in a specific group
  static async getGroupContacts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contacts = await sequelize.query(
        `SELECT c.* 
        FROM contacts c
        INNER JOIN group_memberships gm ON gm."contactId" = c.id
        WHERE gm."groupId" = :groupId
        AND c."userId" = :userId
        ORDER BY c."firstName" ASC, c."lastName" ASC`,
        {
          replacements: { groupId: id, userId },
          type: QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        data: contacts
      });
    } catch (error: any) {
      console.error('Get group contacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all groups for user
  static async getGroups(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
      const userId = req.user.id;
      const { page = 1, limit = 20, search } = req.query;

      const where: any = { userId };
      
      if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
      }

      const { count, rows } = await Group.findAndCountAll({
        where,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [['createdAt', 'DESC']],
      });

      // Get contact counts for each group
      const groupsWithDetails = await Promise.all(
        rows.map(async (group) => {
          const contactsCount = await GroupMembership.count({
            where: { groupId: group.id }
          });

          return {
            ...group.toJSON(),
            contactsCount: contactsCount,
          };
        })
      );

      res.json({
        success: true,
        data: {
          groups: groupsWithDetails,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      console.error('Get groups error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get single group - FIXED with raw query to avoid association issues
  static async getGroup(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized'});
      }

      // Use raw query to get the group (completely bypasses associations)
      const groups = await sequelize.query(
        `SELECT * FROM groups WHERE id = :id AND "userId" = :userId LIMIT 1`,
        {
          replacements: { id, userId },
          type: QueryTypes.SELECT // Use QueryTypes from import, not sequelize.QueryTypes
        }
      );

      // Check if we got a group
      if (!groups || groups.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Group not found',
        });
      }

      const group = groups[0] as any; // Cast to any for spread operator

      // Use raw query to get contacts through the join table
      const contacts = await sequelize.query(
        `SELECT c.* 
         FROM contacts c
         INNER JOIN group_memberships gm ON gm."contactId" = c.id
         WHERE gm."groupId" = :groupId
         AND c."userId" = :userId
         ORDER BY c."firstName" ASC, c."lastName" ASC`,
        {
          replacements: { groupId: id, userId },
          type: QueryTypes.SELECT // Use QueryTypes from import
        }
      );

      res.json({
        success: true,
        data: {
          ...group,
          contacts: contacts || [],
          contactsCount: contacts?.length || 0,
        },
      });
    } catch (error: any) {
      console.error('Get group error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Create group
  static async createGroup(req: AuthRequest, res: Response) {
    try {
      if(!req.user) {
        return res.status(401).json({
          success:false,
          message: 'Not authenticated'
        });
      }
      const userId = req.user.id;
      const { name, description, tags, contactIds } = req.body;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Check if group name already exists for this user
      const existingGroup = await Group.findOne({
        where: { userId, name },
      });

      if (existingGroup) {
        return res.status(409).json({
          success: false,
          message: 'A group with this name already exists',
        });
      }

      // Create group
      const group = await Group.create({
        name,
        description,
        userId,
        tags: tags || [],
      });

      // Add contacts to group if provided
      if (contactIds && contactIds.length > 0) {
        const groupContacts = contactIds.map((contactId: string) => ({
          groupId: group.id,
          contactId,
        }));
        await GroupMembership.bulkCreate(groupContacts);
      }

      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: group,
      });
    } catch (error: any) {
      console.error('Create group error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get available contacts (contacts not in the group)
  static async getAvailableContacts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { search } = req.query;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // First, verify the group exists and belongs to the user
      const group = await Group.findOne({
        where: { id, userId }
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Get IDs of contacts already in the group
      const existingMemberships = await GroupMembership.findAll({
        where: { groupId: id },
        attributes: ['contactId']
      });
      
      const existingContactIds = existingMemberships.map(m => m.contactId);

      // Build the where clause for contacts
      const whereClause: any = { userId };
      
      // Exclude contacts already in the group
      if (existingContactIds.length > 0) {
        whereClause.id = { [Op.notIn]: existingContactIds };
      }

      // Add search filter if provided
      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { phoneNumber: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Get available contacts
      const contacts = await Contact.findAll({
        where: whereClause,
        order: [['firstName', 'ASC'], ['lastName', 'ASC']],
        limit: 50 // Limit results for performance
      });

      res.json({
        success: true,
        data: contacts,
        message: 'Available contacts fetched successfully'
      });
    } catch (error: any) {
      console.error('Get available contacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update group
  static async updateGroup(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
      const userId = req.user.id;
      const { id } = req.params;
      const { name, description, tags } = req.body;

      const group = await Group.findOne({
        where: { id, userId },
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found',
        });
      }

      // Check if new name conflicts
      if (name && name !== group.name) {
        const existingGroup = await Group.findOne({
          where: { userId, name },
        });
        if (existingGroup) {
          return res.status(409).json({
            success: false,
            message: 'A group with this name already exists',
          });
        }
      }

      await group.update({
        name: name || group.name,
        description: description !== undefined ? description : group.description,
        tags: tags || group.tags,
      });

      res.json({
        success: true,
        message: 'Group updated successfully',
        data: group,
      });
    } catch (error: any) {
      console.error('Update group error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Delete group
  static async deleteGroup(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const group = await Group.findOne({
        where: { id, userId },
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found',
        });
      }

      // Delete group contacts first (cascade should handle this, but just in case)
      await GroupMembership.destroy({ where: { groupId: id } });
      
      // Delete group
      await group.destroy();

      res.json({
        success: true,
        message: 'Group deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete group error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Add contacts to group
  static async addContacts(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
      const userId = req.user.id;
      const { id } = req.params;
      const { contactIds } = req.body;

      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Contact IDs are required'
        });
      }

      // Verify the group exists and belongs to the user
      const groupExists = await sequelize.query(
        `SELECT id FROM groups WHERE id = :id AND "userId" = :userId LIMIT 1`,
        {
          replacements: { id, userId },
          type: QueryTypes.SELECT
        }
      );

      if (!groupExists || groupExists.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Group not found',
        });
      }

      // Verify all contacts exist and belong to the user
      const contacts = await sequelize.query(
        `SELECT id FROM contacts WHERE id IN (:contactIds) AND "userId" = :userId`,
        {
          replacements: { contactIds, userId },
          type: QueryTypes.SELECT
        }
      );

      if (contacts.length !== contactIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some contacts were not found or do not belong to you',
        });
      }

      // Add contacts to group using raw insert
      // Build the VALUES part of the query
      const values = contactIds.map((contactId: string) => 
        `('${id}', '${contactId}', NOW(), NOW())`
      ).join(',');

      await sequelize.query(
        `INSERT INTO group_memberships ("groupId", "contactId", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT ("groupId", "contactId") DO NOTHING`,
        {
          type: QueryTypes.INSERT
        }
      );

      res.json({
        success: true,
        message: 'Contacts added to group successfully',
      });
    } catch (error: any) {
      console.error('Add contacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Remove contacts from group
  // Remove contacts from group - Enhanced with debugging
  static async removeContacts(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
      const userId = req.user.id;
      const { id } = req.params;
      const { contactIds } = req.body;

      console.log('=== Remove Contacts Debug ===');
      console.log('Group ID:', id);
      console.log('User ID:', userId);
      console.log('Contact IDs to remove:', contactIds);

      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Contact IDs are required'
        });
      }

      // Verify the group exists and belongs to the user using raw query
      const groupExists = await sequelize.query(
        `SELECT id FROM groups WHERE id = :id AND "userId" = :userId LIMIT 1`,
        {
          replacements: { id, userId },
          type: QueryTypes.SELECT
        }
      );

      if (!groupExists || groupExists.length === 0) {
        console.log('Group not found');
        return res.status(404).json({
          success: false,
          message: 'Group not found',
        });
      }

      // Create a parameterized query for deletion
      // Convert contactIds array to a comma-separated list for the query
      const placeholders = contactIds.map((_: string, index: number) => `$${index + 1}`).join(',');
      
      const query = `
        DELETE FROM group_memberships 
        WHERE "groupId" = $${contactIds.length + 1} 
        AND "contactId" IN (${placeholders})
      `;
      
      const params = [...contactIds, id];
      
      const result = await sequelize.query(query, {
        bind: params,
        type: QueryTypes.DELETE
      });

      // Get the number of deleted rows
      const deletedCount = Array.isArray(result) ? result[1] : 0;
      
      console.log(`Deleted ${deletedCount} records`);

      if (deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'No matching contacts were found in this group',
        });
      }

      res.json({
        success: true,
        message: `${deletedCount} contact(s) removed from group successfully`,
        deletedCount
      });
    } catch (error: any) {
      console.error('Remove contacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default GroupController;