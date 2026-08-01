import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Contact from '../models/Contact';
import { AuthRequest } from '../middleware/auth.middleware';
import { Op } from 'sequelize';
import * as XLSX from 'xlsx';
import multer from 'multer';
import path from 'path';
import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import { BadRequestError, NotFoundError } from '../utils/errors';

// Configure multer for file upload
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed') as any, false);
    }
  }
});

// Helper function to validate phone number
const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(?:\+255|0)[67][0-9]{8}$/;
  return phoneRegex.test(phone);
};

// Helper function to format phone number
const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('6'))) {
    return `255${cleaned}`;
  }
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `255${cleaned.substring(1)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('255')) {
    return cleaned;
  }
  return phone;
};

// Define a type for export data
interface ExportContact {
  [key: string]: string | number | boolean | null | undefined;
}

export class ContactController {
  // Get all contacts for user
  static async getContacts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        tags = '',
        subscribed,
        blacklisted 
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      // Build where clause
      const where: any = { userId };
      
      // Search by name, phone, email
      if (search) {
        where[Op.or] = [
          { phoneNumber: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { company: { [Op.iLike]: `%${search}%` } },
        ];
      }
      
      // Filter by tags
      if (tags) {
        const tagArray = (tags as string).split(',');
        where.tags = { [Op.overlap]: tagArray };
      }
      
      // Filter by subscription status
      if (subscribed !== undefined) {
        where.isSubscribed = subscribed === 'true';
      }
      
      // Filter by blacklist status
      if (blacklisted !== undefined) {
        where.isBlacklisted = blacklisted === 'true';
      }

      const { count, rows } = await Contact.findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json({
        success: true,
        data: {
          contacts: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      console.error('Get contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contacts',
        error: error.message,
      });
    }
  }

  // Get single contact
  static async getContact(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const contact = await Contact.findOne({
        where: { id, userId },
      });

      if (!contact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: contact,
      });
    } catch (error: any) {
      console.error('Get contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contact',
        error: error.message,
      });
    }
  }

  // Create contact
  static async createContact(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { phoneNumber, firstName, lastName, email, company, tags, customFields } = req.body;

      // Validate phone number
      if (!validatePhoneNumber(phoneNumber)) {
        res.status(400).json({
          success: false,
          message: 'Invalid phone number format. Use 255XXXXXXXXX or 0XXXXXXXXX',
        });
        return;
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Check if contact already exists
      const existingContact = await Contact.findOne({
        where: { userId, phoneNumber: formattedPhone },
      });

      if (existingContact) {
        res.status(409).json({
          success: false,
          message: 'Contact with this phone number already exists',
        });
        return;
      }

      const contact = await Contact.create({
        userId,
        phoneNumber: formattedPhone,
        firstName,
        lastName,
        email,
        company,
        tags: tags || [],
        customFields: customFields || {},
        isSubscribed: true,
        isBlacklisted: false,
      });

      res.status(201).json({
        success: true,
        message: 'Contact created successfully',
        data: contact,
      });
    } catch (error: any) {
      console.error('Create contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create contact',
        error: error.message,
      });
    }
  }

  // Update contact
  static async updateContact(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = req.body;

      const contact = await Contact.findOne({
        where: { id, userId },
      });

      if (!contact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
        return;
      }

      // Validate phone number if updating
      if (updates.phoneNumber) {
        if (!validatePhoneNumber(updates.phoneNumber)) {
          res.status(400).json({
            success: false,
            message: 'Invalid phone number format',
          });
          return;
        }
        updates.phoneNumber = formatPhoneNumber(updates.phoneNumber);
      }

      // Don't allow updating to duplicate phone number
      if (updates.phoneNumber && updates.phoneNumber !== contact.phoneNumber) {
        const existingContact = await Contact.findOne({
          where: { 
            userId, 
            phoneNumber: updates.phoneNumber 
          },
        });
        
        if (existingContact) {
          res.status(409).json({
            success: false,
            message: 'Contact with this phone number already exists',
          });
          return;
        }
      }

      await contact.update(updates);

      res.status(200).json({
        success: true,
        message: 'Contact updated successfully',
        data: contact,
      });
    } catch (error: any) {
      console.error('Update contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update contact',
        error: error.message,
      });
    }
  }

  // Delete contact
  static async deleteContact(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const contact = await Contact.findOne({
        where: { id, userId },
      });

      if (!contact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
        return;
      }

      await contact.destroy();

      res.status(200).json({
        success: true,
        message: 'Contact deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete contact',
        error: error.message,
      });
    }
  }

  // ========== IMPORT/EXPORT FUNCTIONALITY ==========

  // Import contacts from CSV/Excel
  static async importContacts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      // Parse Excel/CSV file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<any>(worksheet);

      if (data.length === 0) {
        res.status(400).json({
          success: false,
          message: 'File contains no data',
        });
        return;
      }

      // Process each row
      const results = {
        total: data.length,
        successful: 0,
        failed: 0,
        errors: [] as any[],
      };

      const contacts = [];

      for (const [index, row] of data.entries()) {
        try {
          // Find phone number column (various possible names)
          const phoneNumber = row.phone || row.Phone || row.PHONE || 
                            row.phoneNumber || row['Phone Number'] || 
                            row.phone_number || row['phone number'];
          
          if (!phoneNumber) {
            throw new Error('Phone number is required');
          }

          // Format phone number
          const formattedPhone = formatPhoneNumber(String(phoneNumber).trim());

          // Validate phone number
          if (!validatePhoneNumber(formattedPhone)) {
            throw new Error('Invalid phone number format');
          }

          // Check if contact already exists
          const existingContact = await Contact.findOne({
            where: { userId, phoneNumber: formattedPhone },
          });

          if (existingContact) {
            // Update existing contact
            await existingContact.update({
              firstName: row.firstName || row.FirstName || row.first_name || row['First Name'] || existingContact.firstName,
              lastName: row.lastName || row.LastName || row.last_name || row['Last Name'] || existingContact.lastName,
              email: row.email || row.Email || row.EMAIL || existingContact.email,
              company: row.company || row.Company || row.COMPANY || existingContact.company,
              tags: row.tags ? String(row.tags).split(',').map((t: string) => t.trim()) : existingContact.tags,
              updatedAt: new Date(),
            });
          } else {
            // Create new contact
            contacts.push({
              userId,
              phoneNumber: formattedPhone,
              firstName: row.firstName || row.FirstName || row.first_name || row['First Name'] || null,
              lastName: row.lastName || row.LastName || row.last_name || row['Last Name'] || null,
              email: row.email || row.Email || row.EMAIL || null,
              company: row.company || row.Company || row.COMPANY || null,
              tags: row.tags ? String(row.tags).split(',').map((t: string) => t.trim()) : [],
              isSubscribed: true,
              isBlacklisted: false,
            });
          }

          results.successful++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            row: index + 2, // +2 because 1-based and header row
            error: error.message,
            data: row,
          });
        }
      }

      // Bulk create new contacts
      if (contacts.length > 0) {
        await Contact.bulkCreate(contacts);
      }

      res.status(200).json({
        success: true,
        message: `Imported ${results.successful} contacts, ${results.failed} failed`,
        data: results,
      });
    } catch (error: any) {
      console.error('Import contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to import contacts',
        error: error.message,
      });
    }
  }

  // Bulk import with options
  static async bulkImport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { contacts, options } = req.body;

      if (!contacts || !Array.isArray(contacts)) {
        res.status(400).json({
          success: false,
          message: 'Contacts array is required',
        });
        return;
      }

      const results = {
        total: contacts.length,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [] as any[],
      };

      for (const [index, contactData] of contacts.entries()) {
        try {
          // Validate phone number
          if (!contactData.phoneNumber) {
            throw new Error('Phone number is required');
          }

          const formattedPhone = formatPhoneNumber(contactData.phoneNumber);
          
          if (!validatePhoneNumber(formattedPhone)) {
            throw new Error('Invalid phone number format');
          }

          // Check if exists
          const existingContact = await Contact.findOne({
            where: { userId, phoneNumber: formattedPhone },
          });

          if (existingContact) {
            if (options?.updateExisting) {
              await existingContact.update({
                firstName: contactData.firstName || existingContact.firstName,
                lastName: contactData.lastName || existingContact.lastName,
                email: contactData.email || existingContact.email,
                company: contactData.company || existingContact.company,
                tags: contactData.tags ? [...new Set([...(existingContact.tags || []), ...contactData.tags])] : existingContact.tags,
              });
              results.updated++;
            } else if (options?.skipDuplicates) {
              results.skipped++;
            } else {
              throw new Error('Contact already exists');
            }
          } else {
            await Contact.create({
              userId,
              phoneNumber: formattedPhone,
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              email: contactData.email,
              company: contactData.company,
              tags: contactData.tags || [],
              isSubscribed: true,
              isBlacklisted: false,
            });
            results.imported++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            row: index + 1,
            error: error.message,
            data: contactData,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Imported: ${results.imported}, Updated: ${results.updated}, Skipped: ${results.skipped}, Failed: ${results.failed}`,
        data: results,
      });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk import contacts',
        error: error.message,
      });
    }
  }

  // Export selected contacts
  static async exportSelected(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { contactIds, options } = req.body;

      if (!contactIds || !Array.isArray(contactIds)) {
        res.status(400).json({
          success: false,
          message: 'Contact IDs are required',
        });
        return;
      }

      const contacts = await Contact.findAll({
        where: {
          id: contactIds,
          userId,
        },
        order: [['createdAt', 'DESC']],
      });

      if (contacts.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No contacts found',
        });
        return;
      }

      const { format = 'excel', includeFields = [] } = options || {};

      // Prepare data based on selected fields
      const exportData: ExportContact[] = contacts.map(c => {
        const data: ExportContact = {};
        const fields = includeFields.length > 0 ? includeFields : 
          ['phoneNumber', 'firstName', 'lastName', 'email', 'company', 'tags', 'isSubscribed', 'isBlacklisted', 'createdAt'];
        
        fields.forEach((field: string) => {
          if (field === 'tags') {
            data[field] = c.tags?.join(', ') || '';
          } else if (field === 'isSubscribed' || field === 'isBlacklisted') {
            data[field] = (c as any)[field] ? 'Yes' : 'No';
          } else if (field === 'createdAt' || field === 'updatedAt') {
            data[field] = (c as any)[field]?.toISOString().split('T')[0] || '';
          } else {
            data[field] = (c as any)[field] || '';
          }
        });
        return data;
      });

      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      if (format === 'csv') {
        const fields = includeFields.length > 0 ? includeFields : Object.keys(exportData[0] || {});
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(exportData);
        buffer = Buffer.from(csv, 'utf-8');
        contentType = 'text/csv';
        filename = `contacts_selected_${Date.now()}.csv`;
      } else if (format === 'json') {
        buffer = Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8');
        contentType = 'application/json';
        filename = `contacts_selected_${Date.now()}.json`;
      } else {
        // Excel format
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Contacts');

        // Add headers
        const headers = includeFields.length > 0 ? includeFields : Object.keys(exportData[0] || {});
        
        worksheet.columns = headers.map((header: string) => ({
          header: header.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()),
          key: header,
          width: 20,
        }));

        // Add rows
        exportData.forEach(data => {
          worksheet.addRow(data);
        });

        const writeBuffer = await workbook.xlsx.writeBuffer();
        buffer = Buffer.from(writeBuffer);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `contacts_selected_${Date.now()}.xlsx`;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error('Export selected error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export contacts',
        error: error.message,
      });
    }
  }

  // Get import history
  static async getImportHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      // This would need an ImportHistory model
      // For now, return mock data
      res.status(200).json({
        success: true,
        data: {
          imports: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            pages: 0,
          },
        },
      });
    } catch (error: any) {
      console.error('Get import history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch import history',
        error: error.message,
      });
    }
  }

  // Download sample template
  static async downloadSampleTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { format = 'excel' } = req.query;

      const sampleData = [
        {
          phoneNumber: '0712345678',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          company: 'Acme Inc',
          tags: 'customer,vip',
        },
        {
          phoneNumber: '0712345679',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          company: 'Tech Corp',
          tags: 'lead',
        },
      ];

      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      if (format === 'csv') {
        const fields = ['phoneNumber', 'firstName', 'lastName', 'email', 'company', 'tags'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(sampleData);
        buffer = Buffer.from(csv, 'utf-8');
        contentType = 'text/csv';
        filename = 'contact_template.csv';
      } else {
        // Excel format
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Template');

        worksheet.columns = [
          { header: 'Phone Number', key: 'phoneNumber', width: 20 },
          { header: 'First Name', key: 'firstName', width: 15 },
          { header: 'Last Name', key: 'lastName', width: 15 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Company', key: 'company', width: 20 },
          { header: 'Tags (comma separated)', key: 'tags', width: 30 },
        ];

        sampleData.forEach(data => {
          worksheet.addRow(data);
        });

        const writeBuffer = await workbook.xlsx.writeBuffer();
        buffer = Buffer.from(writeBuffer);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = 'contact_template.xlsx';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error('Download template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download template',
        error: error.message,
      });
    }
  }

  // Validate contacts before import
  static async validateContacts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { contacts } = req.body;

      if (!contacts || !Array.isArray(contacts)) {
        res.status(400).json({
          success: false,
          message: 'Contacts array is required',
        });
        return;
      }

      const validation = {
        total: contacts.length,
        valid: 0,
        invalid: 0,
        errors: [] as any[],
      };

      contacts.forEach((contact: any, index: number) => {
        const errors: string[] = [];

        if (!contact.phoneNumber) {
          errors.push('Phone number is required');
        } else {
          const formattedPhone = formatPhoneNumber(contact.phoneNumber);
          if (!validatePhoneNumber(formattedPhone)) {
            errors.push('Invalid phone number format');
          }
        }

        if (contact.email && !/^\S+@\S+\.\S+$/.test(contact.email)) {
          errors.push('Invalid email format');
        }

        if (errors.length === 0) {
          validation.valid++;
        } else {
          validation.invalid++;
          validation.errors.push({
            row: index + 1,
            errors,
            data: contact,
          });
        }
      });

      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (error: any) {
      console.error('Validate contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate contacts',
        error: error.message,
      });
    }
  }

  // Export contacts to CSV/Excel
  static async exportContacts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { format = 'csv', fields, status, tags } = req.query;

      const where: any = { userId };
      
      // Apply filters
      if (status === 'subscribed') {
        where.isSubscribed = true;
      } else if (status === 'unsubscribed') {
        where.isSubscribed = false;
      } else if (status === 'blacklisted') {
        where.isBlacklisted = true;
      }

      if (tags) {
        const tagArray = (tags as string).split(',');
        where.tags = { [Op.overlap]: tagArray };
      }

      const contacts = await Contact.findAll({
        where,
        order: [['createdAt', 'DESC']],
      });

      // Prepare data based on selected fields
      const fieldList = fields ? (fields as string).split(',') : 
        ['phoneNumber', 'firstName', 'lastName', 'email', 'company', 'tags', 'isSubscribed', 'isBlacklisted', 'createdAt'];
      
      const exportData: ExportContact[] = contacts.map(c => {
        const data: ExportContact = {};
        fieldList.forEach((field: string) => {
          if (field === 'tags') {
            data[field] = c.tags?.join(', ') || '';
          } else if (field === 'isSubscribed' || field === 'isBlacklisted') {
            data[field] = (c as any)[field] ? 'Yes' : 'No';
          } else if (field === 'createdAt' || field === 'updatedAt') {
            data[field] = (c as any)[field]?.toISOString().split('T')[0] || '';
          } else {
            data[field] = (c as any)[field] || '';
          }
        });
        return data;
      });

      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      if (format === 'csv') {
        const json2csvParser = new Parser({ fields: fieldList });
        const csv = json2csvParser.parse(exportData);
        buffer = Buffer.from(csv, 'utf-8');
        contentType = 'text/csv';
        filename = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        // Excel format
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Contacts');

        worksheet.columns = fieldList.map((field: string) => ({
          header: field.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()),
          key: field,
          width: 20,
        }));

        exportData.forEach(data => {
          worksheet.addRow(data);
        });

        const writeBuffer = await workbook.xlsx.writeBuffer();
        buffer = Buffer.from(writeBuffer);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `contacts_${new Date().toISOString().split('T')[0]}.xlsx`;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error('Export contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export contacts',
        error: error.message,
      });
    }
  }

  // Bulk delete contacts
  static async bulkDelete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No contact IDs provided',
        });
        return;
      }

      const deleted = await Contact.destroy({
        where: {
          id: ids,
          userId,
        },
      });

      res.status(200).json({
        success: true,
        message: `Deleted ${deleted} contacts`,
        data: { deleted },
      });
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete contacts',
        error: error.message,
      });
    }
  }

  // Get contact statistics
  static async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const [total, subscribed, blacklisted, tags] = await Promise.all([
        Contact.count({ where: { userId } }),
        Contact.count({ where: { userId, isSubscribed: true } }),
        Contact.count({ where: { userId, isBlacklisted: true } }),
        Contact.findAll({
          where: { userId },
          attributes: ['tags'],
          raw: true,
        }),
      ]);

      // Count unique tags
      const tagSet = new Set<string>();
      tags.forEach((row: any) => {
        if (row.tags && Array.isArray(row.tags)) {
          row.tags.forEach((tag: string) => tagSet.add(tag));
        }
      });

      res.status(200).json({
        success: true,
        data: {
          total,
          subscribed,
          blacklisted,
          uniqueTags: tagSet.size,
        },
      });
    } catch (error: any) {
      console.error('Get contact stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contact statistics',
        error: error.message,
      });
    }
  }
}

export default ContactController;