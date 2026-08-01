import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { messageService } from '../../services/message.service';
import groupService from '../../services/group';
import contactService from '../../services/contact';
import { MessageFormData, MessageType, RepeatType } from '../../types/message.types';
import { toast } from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  contactCount: number;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export const MessageForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<MessageFormData>({
    defaultValues: {
      messageType: 'email',
      repeatType: 'once',
      targetType: 'all',
      repeatTime: '09:00',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      targetIds: [],
    }
  });

  const messageType = watch('messageType');
  const repeatType = watch('repeatType');
  const targetType = watch('targetType');
  const content = watch('content');
  const subject = watch('subject');

  useEffect(() => {
    fetchGroupsAndContacts();
    if (id) {
      fetchMessage();
    }
  }, [id]);

  const fetchGroupsAndContacts = async () => {
    try {
      const [groupsRes, contactsRes] = await Promise.all([
        groupService.getGroups({ limit: 100 }),
        contactService.getContacts({ limit: 100 })
      ]);
      setGroups(groupsRes.groups);
      setContacts(contactsRes.contacts);
    } catch (error) {
      console.error('Failed to fetch groups and contacts:', error);
    }
  };

  const fetchMessage = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const message = await messageService.getMessage(id);
      
      // Set form values
      setValue('name', message.name);
      setValue('subject', message.subject);
      setValue('content', message.content);
      setValue('messageType', message.messageType);
      setValue('repeatType', message.repeatType);
      setValue('repeatDay', message.repeatDay);
      setValue('repeatTime', message.repeatTime);
      setValue('startDate', format(new Date(message.startDate), 'yyyy-MM-dd'));
      setValue('endDate', message.endDate ? format(new Date(message.endDate), 'yyyy-MM-dd') : undefined);
      setValue('targetType', message.targetType);
      setValue('targetIds', message.targetIds);
    } catch (error) {
      toast.error('Failed to load message');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: MessageFormData) => {
    try {
      setLoading(true);
      
      // Clean up data based on repeat type
      if (data.repeatType !== 'weekly' && data.repeatType !== 'monthly') {
        delete data.repeatDay;
      }

      if (id) {
        await messageService.updateMessage(id, data);
        toast.success('Message updated successfully');
      } else {
        await messageService.createMessage(data);
        toast.success('Message scheduled successfully');
      }
      
      navigate('/messages');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save message');
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    if (!previewContact) return null;
    
    let previewContent = content || '';
    previewContent = previewContent
      .replace(/{{firstName}}/g, previewContact.firstName || '')
      .replace(/{{lastName}}/g, previewContact.lastName || '')
      .replace(/{{fullName}}/g, `${previewContact.firstName || ''} ${previewContact.lastName || ''}`.trim())
      .replace(/{{email}}/g, previewContact.email || '')
      .replace(/{{phone}}/g, previewContact.phone || '');

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">Preview for {previewContact.firstName} {previewContact.lastName}</h4>
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        {messageType === 'email' && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-2 border-b">
              <span className="font-medium">Subject:</span> {subject}
            </div>
            <div className="p-4 bg-white">
              <div dangerouslySetInnerHTML={{ __html: previewContent.replace(/\n/g, '<br>') }} />
            </div>
          </div>
        )}
        {messageType === 'sms' && (
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-gray-800">{previewContent}</p>
            <p className="text-xs text-gray-500 mt-2">
              {previewContent.length} characters / {Math.ceil(previewContent.length / 160)} SMS parts
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{id ? 'Edit Message' : 'Schedule New Message'}</h1>
        <p className="text-gray-600">Create a scheduled message to send to your contacts</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-lg shadow p-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name', { required: 'Name is required' })}
              className={`w-full p-2 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Weekly Newsletter"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('messageType')}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="email">📧 Email</option>
              <option value="sms">📱 SMS</option>
              <option value="notification">🔔 In-app Notification</option>
            </select>
          </div>
        </div>

        {/* Subject (for emails) */}
        {messageType === 'email' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              {...register('subject', { required: messageType === 'email' ? 'Subject is required' : false })}
              className={`w-full p-2 border rounded ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Your email subject"
            />
            {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
          </div>
        )}

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('content', { required: 'Content is required' })}
            rows={8}
            className={`w-full p-2 border rounded font-mono ${errors.content ? 'border-red-500' : 'border-gray-300'}`}
            placeholder={`Hello {{firstName}},

This is your scheduled message content.

You can use variables:
{{firstName}} - Contact's first name
{{lastName}} - Contact's last name
{{fullName}} - Full name
{{email}} - Email address
{{phone}} - Phone number`}
          />
          {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
          
          {/* Preview button */}
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => {
                if (contacts.length > 0) {
                  setPreviewContact(contacts[0]);
                  setShowPreview(true);
                } else {
                  toast.error('No contacts available for preview');
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              👁️ Preview with sample contact
            </button>
          </div>

          {showPreview && renderPreview()}
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('startDate', { required: 'Start date is required' })}
              min={format(new Date(), 'yyyy-MM-dd')}
              className={`w-full p-2 border rounded ${errors.startDate ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              {...register('repeatTime', { required: 'Time is required' })}
              className={`w-full p-2 border rounded ${errors.repeatTime ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>
        </div>

        {/* Repeat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repeat <span className="text-red-500">*</span>
          </label>
          <select
            {...register('repeatType')}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="once">🔂 Once</option>
            <option value="daily">📅 Daily</option>
            <option value="weekly">📆 Weekly</option>
            <option value="monthly">📅 Monthly</option>
          </select>
        </div>

        {repeatType === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repeat Day <span className="text-red-500">*</span>
            </label>
            <select
              {...register('repeatDay', { valueAsNumber: true, required: 'Repeat day is required' })}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>
        )}

        {repeatType === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repeat Day of Month <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              {...register('repeatDay', { 
                valueAsNumber: true, 
                required: 'Repeat day is required',
                min: 1,
                max: 31
              })}
              className="w-full p-2 border border-gray-300 rounded"
              min={1}
              max={31}
            />
          </div>
        )}

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date (Optional)
          </label>
          <input
            type="date"
            {...register('endDate')}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Target */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Send To <span className="text-red-500">*</span>
          </label>
          <select
            {...register('targetType')}
            className="w-full p-2 border border-gray-300 rounded mb-4"
          >
            <option value="all">👥 All Contacts</option>
            <option value="group">📁 Specific Groups</option>
            <option value="contacts">👤 Specific Contacts</option>
          </select>

          {targetType === 'group' && (
            <div className="mt-2 p-4 border rounded bg-gray-50">
              <label className="block text-sm font-medium mb-2">Select Groups</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {groups.map(group => (
                  <label key={group.id} className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                    <input
                      type="checkbox"
                      value={group.id}
                      {...register('targetIds')}
                      className="rounded text-blue-600"
                    />
                    <span className="flex-1">{group.name}</span>
                    <span className="text-sm text-gray-500">{group.contactCount} contacts</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {targetType === 'contacts' && (
            <div className="mt-2 p-4 border rounded bg-gray-50">
              <label className="block text-sm font-medium mb-2">Select Contacts</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contacts.map(contact => (
                  <label key={contact.id} className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                    <input
                      type="checkbox"
                      value={contact.id}
                      {...register('targetIds')}
                      className="rounded text-blue-600"
                    />
                    <span>
                      {contact.firstName} {contact.lastName}
                      <span className="text-sm text-gray-500 ml-2">
                        {contact.email || contact.phone}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : id ? 'Update Message' : 'Schedule Message'}
          </button>
        </div>
      </form>
    </div>
  );
};