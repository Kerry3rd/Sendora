import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  Divider,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  InputLabel,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Skeleton,
  Fade,
  Zoom,
  Backdrop,
  LinearProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  Repeat as RepeatIcon,
  Cake as CakeIcon,
  Group as GroupIcon,
  Tune as TuneIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import FormHelperText from '@mui/material/FormHelperText';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import campaignService, { 
  Campaign,
  MonthDay, 
  MonthOption, 
  RecurrenceType, 
  WeekDay,
  RecurrenceRule as ServiceRecurrenceRule
} from '../../services/campaign';
import groupService from '../../services/group';
import { useDispatch, useSelector } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import ContactSelector from '../../components/ContactSelector';
import { formatCostInTZS, formatAvgCostInTZS, formatTZSCompact } from '../../utils/currency';
import { PRICING } from '../../config/pricing';
import ContactService from '../../services/contact';

interface Contact {
  id?: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  variables?: Record<string, string>;
}

interface RecurrenceRule {
  type: RecurrenceType;
  interval: number;
  weekDays?: WeekDay[];
  monthDay?: MonthDay;
  month?: MonthOption;
  endType: 'never' | 'after' | 'on';
  endAfter?: number;
  endDate?: string;
  timezone: string;
}

interface SegmentRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
}

const steps = ['Campaign Details', 'Message Content', 'Target Audience', 'Advanced Options', 'Review & Send'];

// Loading skeleton for groups
const GroupsSkeleton = () => (
  <Box sx={{ mt: 2 }}>
    <Skeleton variant="text" width={200} height={30} />
    <Skeleton variant="rectangular" height={56} sx={{ my: 1 }} />
    <Skeleton variant="text" width={150} height={20} sx={{ mt: 2 }} />
    <Skeleton variant="rectangular" height={200} sx={{ mt: 1 }} />
  </Box>
);

// Loading skeleton for contacts
const ContactsSkeleton = () => (
  <Box sx={{ mt: 2 }}>
    <Skeleton variant="text" width={150} height={30} />
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
      <Skeleton variant="rectangular" width={200} height={40} />
      <Skeleton variant="rectangular" width={150} height={40} />
    </Box>
    {[1, 2, 3].map((i) => (
      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="rectangular" width={200} height={40} />
        <Skeleton variant="rectangular" width={100} height={40} />
      </Box>
    ))}
  </Box>
);

const CreateCampaign: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('id');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedGroupContacts, setSelectedGroupContacts] = useState<Contact[]>([]);
  const [loadingGroupContacts, setLoadingGroupContacts] = useState(false);
  const [totalContactsCount, setTotalContactsCount] = useState<number>(0);
  const [totalContactsLoading, setTotalContactsLoading] = useState(false);

  // Get user ID from Redux store
  const userId = useSelector((state: any) => state.auth.user?.id) || localStorage.getItem('userId');

  // Campaign Types
  const [campaignType, setCampaignType] = useState<'standard' | 'recurring' | 'birthday'>('standard');

  // Main form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    message: '',
    senderId: '',
    isUnicode: false,
    isFlash: false,
    status: 'draft' as 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled',
    scheduledFor: '',
    
    // Targeting
    targetType: 'manual' as 'all' | 'group' | 'segment' | 'manual',
    groupId: '',
    segmentRules: [] as SegmentRule[],
    includedContacts: [] as string[],
    excludedContacts: [] as string[],
    
    // Contacts for manual targeting
    contacts: [] as Contact[],
    
    // Recurring campaign fields
    isRecurring: false,
    recurrenceRule: {
      type: 'none' as RecurrenceType,
      interval: 1,
      weekDays: [] as WeekDay[],
      monthDay: 1 as MonthDay,
      month: 'january' as MonthOption,
      endType: 'never' as 'never' | 'after' | 'on',
      endAfter: 1,
      endDate: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    maxOccurrences: null as number | null,
    
    // Birthday campaign fields
    isBirthdayCampaign: false,
    birthdayField: 'dateOfBirth',
    birthdayMessageTemplate: '',
    sendOn: 'same_day' as 'same_day' | 'day_before' | 'week_before',
    sendTime: '09:00',
  });

  const [messageLength, setMessageLength] = useState(0);
  const [messageParts, setMessageParts] = useState(1);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [showBulkWarning, setShowBulkWarning] = useState(false);

  // Helper function to extract variables from message
  const extractVariables = (message: string): string[] => {
    const matches = message.match(/\{\{([^}]+)\}\}/g) || [];
    return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
  };

  // Calculate estimated cost in TZS
  const calculateEstimatedCost = (): number => {
    const targetCount = getTargetCount();
    const baseCost = targetCount * messageParts * PRICING.tanzania.payg;
    
    // Apply volume discount based on tier
    if (targetCount <= PRICING.tanzania.tier1.max) {
      return targetCount * messageParts * PRICING.tanzania.tier1.price;
    } else if (targetCount <= PRICING.tanzania.tier2.max) {
      return targetCount * messageParts * PRICING.tanzania.tier2.price;
    } else if (targetCount <= PRICING.tanzania.tier3.max) {
      return targetCount * messageParts * PRICING.tanzania.tier3.price;
    } else {
      return targetCount * messageParts * PRICING.tanzania.tier4.price;
    }
  };

  // Load groups for targeting
  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId);
    }
  }, [campaignId]);

  useEffect(() => {
    if (formData.targetType === 'all') {
      fetchTotalContacts();
    }
  }, [formData.targetType]);

  useEffect(() => {
    // Update message stats
    const length = formData.message.length;
    setMessageLength(length);
    
    const parts = formData.isUnicode
      ? Math.ceil(length * 2 / 70)
      : Math.ceil(length / 160);
    setMessageParts(parts);
    
    // Update campaign type based on flags
    if (formData.isBirthdayCampaign) {
      setCampaignType('birthday');
    } else if (formData.isRecurring) {
      setCampaignType('recurring');
    } else {
      setCampaignType('standard');
    }
    
    // Calculate cost based on target count
    const cost = calculateEstimatedCost();
    setEstimatedCost(cost);
    
    setShowBulkWarning(getTargetCount() > 1000);
  }, [formData.message, formData.isUnicode, formData.contacts, formData.targetType, formData.groupId, messageParts]);

  const fetchGroups = async () => {
    try {
      setGroupsLoading(true);
      console.log('📥 Fetching groups...');
      const response = await groupService.getGroups();
      console.log('✅ Groups response:', response);
      
      if (response.success && response.groups) {
        setGroups(response.groups);
        console.log('📋 Groups loaded:', response.groups.length);
      } else {
        console.warn('⚠️ No groups found or invalid response');
        setGroups([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch groups:', error);
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchGroupContacts = async (groupId: string) => {
    if (!groupId) return;
    
    try {
      setLoadingGroupContacts(true);
      console.log('📥 Fetching contacts for group:', groupId);
      
      const response = await groupService.getAvailableContacts(groupId);
      console.log('✅ Group contacts response:', response);
    
      let contacts = [];

      if (response.data?.contacts) {
        contacts = response.data.contacts;
      } else if (response.data && Array.isArray(response.data)) {
        contacts = response.data;
      } else if (response.contacts) {
        contacts = response.contacts;
      } else if (response.data?.data?.contacts) {
        contacts = response.data.data.contacts;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        contacts = response.data.data;
      } else if (response.success && response.data) {
        contacts = response.data;
      } else if (Array.isArray(response)) {
        contacts = response;
      }
      
      const normalizedContacts = contacts.map((contact: any, index: number) => {
        return {
          id: contact.id || contact._id || contact.contactId || `temp-${index}`,
          phoneNumber: contact.phoneNumber || contact.phone || '',
          firstName: contact.firstName || contact.first_name || '',
          lastName: contact.lastName || contact.last_name || '',
          email: contact.email || '',
          variables: { ...contact }
        };
      });
      
      setSelectedGroupContacts(normalizedContacts);
      
      if (normalizedContacts.length > 0) {
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group.id === groupId 
              ? { ...group, contactCount: normalizedContacts.length }
              : group
          )
        );
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch group contacts:', error);
      setSelectedGroupContacts([]);
    } finally {
      setLoadingGroupContacts(false);
    }
  };

  const fetchTotalContacts = async () => {
    try {
      setTotalContactsLoading(true);
      const response = await ContactService.getContacts({ limit: 1 });
      setTotalContactsCount(response.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch total contacts:', error);
      setTotalContactsCount(0);
    } finally {
      setTotalContactsLoading(false);
    }
  };

  const fetchCampaign = async (id: string) => {
    try {
      setLoading(true);
      const response = await campaignService.getCampaign(id);
      const campaign = response.data as Campaign;
      
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        message: campaign.message || '',
        senderId: campaign.senderId || '',
        isUnicode: campaign.isUnicode || false,
        isFlash: campaign.isFlash || false,
        status: campaign.status || 'draft',
        scheduledFor: campaign.scheduledFor ? format(new Date(campaign.scheduledFor), "yyyy-MM-dd'T'HH:mm") : '',
        
        targetType: campaign.targetType || 'manual',
        groupId: campaign.groupId || '',
        segmentRules: campaign.segmentRules || [],
        includedContacts: campaign.includedContacts || [],
        excludedContacts: campaign.excludedContacts || [],
        
        contacts: [],
        
        isRecurring: campaign.isRecurring || false,
        recurrenceRule: campaign.recurrenceRule ? {
          type: campaign.recurrenceRule.type as RecurrenceType,
          interval: campaign.recurrenceRule.interval,
          weekDays: (campaign.recurrenceRule.weekDays || []) as WeekDay[],
          monthDay: (campaign.recurrenceRule.monthDay || 1) as MonthDay,
          month: campaign.recurrenceRule.month as MonthOption || 'january',
          endType: campaign.recurrenceRule.endType,
          endAfter: campaign.recurrenceRule.endAfter || 1,
          endDate: campaign.recurrenceRule.endDate || '',
          timezone: campaign.recurrenceRule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        } : {
          type: 'none' as RecurrenceType,
          interval: 1,
          weekDays: [],
          monthDay: 1 as MonthDay,
          month: 'january' as MonthOption,
          endType: 'never',
          endAfter: 1,
          endDate: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        maxOccurrences: campaign.maxOccurrences || null,
        
        isBirthdayCampaign: campaign.isBirthdayCampaign || false,
        birthdayField: campaign.birthdayField || 'dateOfBirth',
        birthdayMessageTemplate: campaign.birthdayMessageTemplate || '',
        sendOn: campaign.sendOn || 'same_day',
        sendTime: campaign.sendTime || '09:00',
      });
    } catch (error) {
      console.error('Failed to load campaign:', error);
      setError('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const getTargetCount = (): number => {
    switch (formData.targetType) {
      case 'manual':
        return formData.contacts.filter(c => c.phoneNumber.trim()).length;
      case 'group':
        return selectedGroupContacts.length;
      case 'all':
        return totalContactsCount; 
      default:
        return 0;
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const importedData = XLSX.utils.sheet_to_json<any>(worksheet);
        
        const contacts = importedData.map(row => ({
          phoneNumber: String(row.phone || row.Phone || row.PHONE || row.phoneNumber || row['Phone Number'] || '').trim(),
          firstName: String(row.firstName || row.FirstName || row.first_name || row['First Name'] || '').trim(),
          lastName: String(row.lastName || row.LastName || row.last_name || row['Last Name'] || '').trim(),
          email: String(row.email || row.Email || row.EMAIL || '').trim(),
          variables: row,
        })).filter(c => c.phoneNumber);
        
        setFormData({
          ...formData,
          contacts: [...formData.contacts, ...contacts],
          includedContacts: [...(formData.includedContacts || []), ...contacts.map(c => c.phoneNumber)],
        });
        
        dispatch(addNotification({ 
          type: 'success', 
          message: `Imported ${contacts.length} contacts` 
        }));
      } catch (error) {
        console.error('Failed to parse file:', error);
        setError('Failed to parse file. Please check the format.');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxSize: 10485760,
  });

  const handleSelectContacts = (selectedContacts: any[]) => {
    const newContacts = selectedContacts.map(contact => ({
      phoneNumber: contact.phoneNumber,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      variables: {
        name: contact.firstName || 'Customer',
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phoneNumber,
      }
    }));

    setFormData({
      ...formData,
      contacts: [...formData.contacts, ...newContacts],
      includedContacts: [...(formData.includedContacts || []), ...newContacts.map(c => c.phoneNumber)],
    });
    
    setContactSelectorOpen(false);
    
    dispatch(addNotification({ 
      type: 'success', 
      message: `Added ${newContacts.length} contacts from your contact list` 
    }));
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: '' });
    }
  };

  const handleSwitchChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.checked,
    });
  };

  const handleRecurrenceChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      recurrenceRule: {
        ...formData.recurrenceRule,
        [field]: value,
      },
    });
  };

  const handleAddContact = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { phoneNumber: '' }],
    });
  };

  const handleRemoveContact = (index: number) => {
    const newContacts = [...formData.contacts];
    const removedContact = newContacts[index];
    newContacts.splice(index, 1);
    
    const newIncluded = formData.includedContacts?.filter(id => id !== removedContact.phoneNumber) || [];
    
    setFormData({
      ...formData,
      contacts: newContacts,
      includedContacts: newIncluded,
    });
  };

  const handleContactChange = (index: number, field: string, value: string) => {
    const newContacts = [...formData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData({
      ...formData,
      contacts: newContacts,
    });
  };

  const handleCampaignTypeChange = (type: 'standard' | 'recurring' | 'birthday') => {
    setCampaignType(type);
    setFormData({
      ...formData,
      isRecurring: type === 'recurring',
      isBirthdayCampaign: type === 'birthday',
    });
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    if (step === 0) {
      if (!formData.name.trim()) errors.name = 'Campaign name is required';
      if (!formData.senderId.trim()) errors.senderId = 'Sender ID is required';
      if (formData.senderId.length > 11) errors.senderId = 'Sender ID must be 11 characters or less';
    }
    
    if (step === 1) {
      if (!formData.message.trim()) errors.message = 'Message is required';
      if (formData.message.length > 1000) errors.message = 'Message is too long (max 1000 characters)';
    }
    
    if (step === 2) {
      if (formData.targetType === 'manual') {
        const validContacts = formData.contacts.filter(c => c.phoneNumber.trim());
        if (validContacts.length === 0) {
          errors.contacts = 'At least one valid contact is required';
        }
      } else if (formData.targetType === 'group') {
        if (!formData.groupId) {
          errors.groupId = 'Please select a group';
        }
      }
    }
    
    if (step === 3) {
      if (campaignType === 'recurring') {
        if (formData.recurrenceRule.type === 'none') {
          errors.recurrenceType = 'Please select a recurrence type';
        }
        if (formData.recurrenceRule.endType === 'after' && (!formData.recurrenceRule.endAfter || formData.recurrenceRule.endAfter < 1)) {
          errors.endAfter = 'Please specify a valid number of occurrences';
        }
      }
      
      if (campaignType === 'birthday') {
        if (!formData.birthdayMessageTemplate) {
          errors.birthdayTemplate = 'Birthday message template is required';
        }
        if (!formData.sendTime) {
          errors.sendTime = 'Send time is required';
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');

      if (!userId) {
        setError('User not authenticated');
        setSubmitting(false);
        return;
      }

      const campaignData: Partial<Campaign> = {
        userId: userId,
        name: formData.name,
        description: formData.description || null,
        message: formData.message,
        senderId: formData.senderId,
        isUnicode: formData.isUnicode,
        isFlash: formData.isFlash,
        status: formData.scheduledFor ? 'scheduled' : 'draft',
        scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : null,
        
        variables: extractVariables(formData.message),
        
        targetType: formData.targetType,
        groupId: formData.groupId || null,
        segmentRules: formData.segmentRules.length ? formData.segmentRules : null,
        includedContacts: formData.includedContacts?.length ? formData.includedContacts : null,
        excludedContacts: formData.excludedContacts?.length ? formData.excludedContacts : null,
        
        isRecurring: formData.isRecurring,
        recurrenceRule: formData.isRecurring ? formData.recurrenceRule as ServiceRecurrenceRule : null,
        maxOccurrences: formData.maxOccurrences,
        
        isBirthdayCampaign: formData.isBirthdayCampaign,
        birthdayField: formData.isBirthdayCampaign ? formData.birthdayField : null,
        birthdayMessageTemplate: formData.isBirthdayCampaign ? formData.birthdayMessageTemplate : null,
        sendOn: formData.isBirthdayCampaign ? formData.sendOn : 'same_day',
        sendTime: formData.isBirthdayCampaign ? formData.sendTime : null,
      };

      console.log('📤 Creating campaign:', campaignData);

      let response;
      if (campaignId) {
        response = await campaignService.updateCampaign(campaignId, campaignData);
      } else {
        response = await campaignService.createCampaign(campaignData);
      }
      
      console.log('✅ Campaign created:', response);
      
      if (formData.targetType === 'manual' && formData.contacts.length > 0) {
        try {
          const newCampaignId = response.data?.id;
          
          if (!newCampaignId) {
            console.error('No campaign ID returned:', response.data);
            throw new Error('Failed to get campaign ID');
          }

          await campaignService.startCampaign(
            newCampaignId, 
            formData.contacts.filter(c => c.phoneNumber.trim()).map(c => ({
              phoneNumber: c.phoneNumber,
              variables: c.variables || {
                firstName: c.firstName || '',
                lastName: c.lastName || '',
                email: c.email || '',
              }
            }))
          );
          dispatch(addNotification({ type: 'success', message: 'Campaign started successfully!' }));
        } catch (sendError) {
          console.error('Failed to send messages:', sendError);
          dispatch(addNotification({ type: 'warning', message: 'Campaign created but failed to send messages' }));
        }
      }
      
      dispatch(addNotification({ 
        type: 'success', 
        message: campaignId ? 'Campaign updated successfully!' : 'Campaign created successfully!' 
      }));
      
      navigate('/campaigns');
      
    } catch (error: any) {
      console.error('❌ Failed to create campaign:', error);
      
      let errorMessage = 'Failed to create campaign';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      dispatch(addNotification({ type: 'error', message: errorMessage }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      
      if (!userId) {
        setError('User not authenticated');
        setSavingDraft(false);
        return;
      }
      
      const draftData: Partial<Campaign> = {
        userId: userId,
        name: formData.name || 'Untitled Draft',
        message: formData.message || 'Draft message',
        senderId: formData.senderId || 'AFRICASTLKNG',
        isUnicode: formData.isUnicode,
        isFlash: formData.isFlash,
        description: formData.description,
        status: 'draft',
        targetType: formData.targetType,
        variables: extractVariables(formData.message || ''),
      };

      if (campaignId) {
        await campaignService.updateCampaign(campaignId, draftData);
        dispatch(addNotification({ type: 'success', message: 'Draft updated' }));
        navigate(`/campaigns/${campaignId}`);
      } else {
        const response = await campaignService.createCampaign(draftData);
        const newCampaignId = response.data?.id;
        dispatch(addNotification({ type: 'success', message: 'Draft saved' }));
        navigate(`/campaigns/${newCampaignId}`);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      setError('Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Campaign Details
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Campaign Name"
                value={formData.name}
                onChange={handleInputChange('name')}
                required
                error={!!validationErrors.name}
                helperText={validationErrors.name}
                disabled={loading || submitting || savingDraft}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                value={formData.description}
                onChange={handleInputChange('description')}
                multiline
                rows={3}
                disabled={loading || submitting || savingDraft}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sender ID"
                value={formData.senderId}
                onChange={handleInputChange('senderId')}
                required
                error={!!validationErrors.senderId}
                helperText={validationErrors.senderId || 'Max 11 characters'}
                disabled={loading || submitting || savingDraft}
                inputProps={{ maxLength: 11 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Tabs value={campaignType} onChange={(e, val) => handleCampaignTypeChange(val)}>
                <Tab value="standard" label="Standard" icon={<SendIcon />} iconPosition="start" />
                <Tab value="recurring" label="Recurring" icon={<RepeatIcon />} iconPosition="start" />
                <Tab value="birthday" label="Birthday" icon={<CakeIcon />} iconPosition="start" />
              </Tabs>
            </Grid>

            <Grid item xs={12}>
              <RadioGroup
                row
                value={formData.scheduledFor ? 'schedule' : 'now'}
                onChange={(e) => {
                  if (e.target.value === 'now') {
                    setFormData({ ...formData, scheduledFor: '' });
                  } else {
                    setFormData({ ...formData, scheduledFor: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
                  }
                }}
              >
                <FormControlLabel value="now" control={<Radio />} label="Send Now" />
                <FormControlLabel value="schedule" control={<Radio />} label="Schedule Later" />
              </RadioGroup>
            </Grid>

            {formData.scheduledFor && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Schedule Date & Time"
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={handleInputChange('scheduledFor')}
                  InputLabelProps={{ shrink: true }}
                  disabled={loading || submitting || savingDraft}
                  inputProps={{ min: new Date().toISOString().slice(0, 16) }}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isUnicode}
                      onChange={handleSwitchChange('isUnicode')}
                      disabled={loading || submitting || savingDraft}
                    />
                  }
                  label="Unicode"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isFlash}
                      onChange={handleSwitchChange('isFlash')}
                      disabled={loading || submitting || savingDraft}
                    />
                  }
                  label="Flash Message"
                />
              </Box>
            </Grid>
          </Grid>
        );

      case 1: // Message Content
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message"
                value={formData.message}
                onChange={handleInputChange('message')}
                multiline
                rows={8}
                required
                error={!!validationErrors.message}
                helperText={validationErrors.message}
                disabled={loading || submitting || savingDraft}
              />
            </Grid>
            
            {previewMode && (
              <Zoom in={previewMode}>
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>Preview:</Typography>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {formData.message || 'Your message will appear here'}
                        </Typography>
                      </Paper>
                    </CardContent>
                  </Card>
                </Grid>
              </Zoom>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Chip icon={<InfoIcon />} label={`${messageLength} chars`} size="small" sx={{ mr: 1 }} />
                  <Chip icon={<SendIcon />} label={`${messageParts} part(s)`} size="small" />
                </Box>
                <Button 
                  size="small" 
                  startIcon={<PreviewIcon />} 
                  onClick={() => setPreviewMode(!previewMode)}
                  disabled={loading || submitting || savingDraft}
                >
                  {previewMode ? 'Hide' : 'Show'} Preview
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Available Variables:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['name', 'firstName', 'lastName', 'email', 'phone', 'company'].map((variable) => (
                  <Chip
                    key={variable}
                    label={`{{${variable}}}`}
                    size="small"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        message: formData.message + `{{${variable}}}`,
                      });
                    }}
                    sx={{ cursor: 'pointer' }}
                    disabled={loading || submitting || savingDraft}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        );

      case 2: // Target Audience
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Target Audience</FormLabel>
                <RadioGroup
                  value={formData.targetType}
                  onChange={(e) => setFormData({ ...formData, targetType: e.target.value as any })}
                >
                  <FormControlLabel value="manual" control={<Radio />} label="Manual Contact List" />
                  <FormControlLabel value="group" control={<Radio />} label="Select from Group" />
                  <FormControlLabel value="all" control={<Radio />} label="All Contacts" />
                  <FormControlLabel value="segment" control={<Radio />} label="Segment Rules (Advanced)" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.targetType === 'manual' && (
              <>
                <Grid item xs={12}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                      borderStyle: 'dashed',
                      borderColor: isDragActive ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                      opacity: loading || submitting || savingDraft ? 0.6 : 1,
                      pointerEvents: loading || submitting || savingDraft ? 'none' : 'auto',
                    }}
                    {...getRootProps()}
                  >
                    <input {...getInputProps()} />
                    <Box sx={{ textAlign: 'center' }}>
                      <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        {isDragActive ? 'Drop files here' : 'Drag & drop contacts file'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        or click to select files
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                        Supported formats: CSV, Excel (XLS, XLSX), TXT
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1">
                        Contacts ({formData.contacts.length})
                      </Typography>
                      {validationErrors.contacts && (
                        <Typography variant="caption" color="error">
                          {validationErrors.contacts}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<PeopleIcon />}
                        onClick={() => setContactSelectorOpen(true)}
                        disabled={loading || submitting || savingDraft}
                      >
                        Browse Contacts
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddContact}
                        disabled={loading || submitting || savingDraft}
                      >
                        Add Manual
                      </Button>
                    </Box>
                  </Box>

                  {formData.contacts.length > 0 ? (
                    <List>
                      {formData.contacts.map((contact, index) => (
                        <ListItem
                          key={index}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 1,
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                          }}
                        >
                          <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', mb: 1 }}>
                            <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32, mr: 2 }}>
                              {contact.firstName?.charAt(0) || '?'}
                            </Avatar>
                            <TextField
                              size="small"
                              placeholder="Phone number *"
                              value={contact.phoneNumber}
                              onChange={(e) => handleContactChange(index, 'phoneNumber', e.target.value)}
                              sx={{ width: 200, mr: 1 }}
                              disabled={loading || submitting || savingDraft}
                            />
                            {contact.firstName && (
                              <Chip 
                                label={contact.firstName} 
                                size="small" 
                                variant="outlined"
                              />
                            )}
                            <Box sx={{ flex: 1 }} />
                            <IconButton 
                              onClick={() => handleRemoveContact(index)} 
                              color="error" 
                              size="small"
                              disabled={loading || submitting || savingDraft}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1, ml: 7, width: '100%' }}>
                            <TextField
                              size="small"
                              placeholder="First name"
                              value={contact.firstName || ''}
                              onChange={(e) => handleContactChange(index, 'firstName', e.target.value)}
                              disabled={loading || submitting || savingDraft}
                            />
                            <TextField
                              size="small"
                              placeholder="Last name"
                              value={contact.lastName || ''}
                              onChange={(e) => handleContactChange(index, 'lastName', e.target.value)}
                              disabled={loading || submitting || savingDraft}
                            />
                            <TextField
                              size="small"
                              placeholder="Email"
                              value={contact.email || ''}
                              onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                              disabled={loading || submitting || savingDraft}
                            />
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <AlertTitle>No contacts added</AlertTitle>
                      <Box component="div" sx={{ mt: 1 }}>
                        <Typography variant="body2" component="div" gutterBottom>
                          Add contacts by:
                        </Typography>
                        <Box component="ul" sx={{ mt: 0.5, pl: 2, mb: 0 }}>
                          <Box component="li" sx={{ typography: 'body2' }}>📁 Uploading a CSV or Excel file</Box>
                          <Box component="li" sx={{ typography: 'body2' }}>👥 Browsing your saved contacts</Box>
                          <Box component="li" sx={{ typography: 'body2' }}>✏️ Adding manually</Box>
                        </Box>
                      </Box>
                    </Alert>
                  )}
                </Grid>
              </>
            )}

            {formData.targetType === 'group' && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    Select a Group
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<RefreshIcon />} 
                    onClick={fetchGroups}
                    variant="text"
                    disabled={groupsLoading || loading || submitting || savingDraft}
                  >
                    Refresh Groups
                  </Button>
                </Box>
                
                {groupsLoading ? (
                  <GroupsSkeleton />
                ) : groups.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <AlertTitle>No Groups Found</AlertTitle>
                    <Typography variant="body2">
                      You haven't created any groups yet. 
                      <Button 
                        size="small" 
                        onClick={() => navigate('/groups/new')}
                        sx={{ ml: 1 }}
                      >
                        Create your first group
                      </Button>
                    </Typography>
                  </Alert>
                ) : (
                  <FormControl fullWidth error={!!validationErrors.groupId}>
                    <InputLabel id="group-select-label">Select Group</InputLabel>
                    <Select
                      labelId="group-select-label"
                      value={formData.groupId}
                      onChange={(e) => {
                        const selectedGroupId = e.target.value as string;
                        setFormData({ ...formData, groupId: selectedGroupId });
                        
                        if (selectedGroupId) {
                          fetchGroupContacts(selectedGroupId);
                        } else {
                          setSelectedGroupContacts([]);
                        }
                      }}
                      label="Select Group"
                      disabled={loading || submitting || savingDraft}
                      renderValue={(selected) => {
                        const group = groups.find(g => g.id === selected);
                        const contactCount = selected === formData.groupId && selectedGroupContacts.length > 0
                          ? selectedGroupContacts.length
                          : group?.contactCount || 0;
                        return group ? `${group.name} (${contactCount} contact${contactCount !== 1 ? 's' : ''})` : '';
                      }}
                    >
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="body1">{group.name}</Typography>
                              {group.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {group.description}
                                </Typography>
                              )}
                            </Box>
                            <Chip 
                              label={`${group.contactCount || 0} contacts`} 
                              size="small" 
                              color={group.contactCount > 0 ? "primary" : "default"}
                              variant={group.contactCount > 0 ? "filled" : "outlined"}
                            />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {validationErrors.groupId && (
                      <Typography variant="caption" color="error">
                        {validationErrors.groupId}
                      </Typography>
                    )}
                    <FormHelperText>
                      Select a group to send messages to all contacts in that group
                    </FormHelperText>
                  </FormControl>
                )}
                
                {formData.groupId && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Contacts in Selected Group ({selectedGroupContacts.length})
                    </Typography>
                    
                    {loadingGroupContacts ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : selectedGroupContacts.length > 0 ? (
                      <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                        <List dense>
                          {selectedGroupContacts.map((contact, index) => {
                            const contactKey = contact.id || contact.phoneNumber || `contact-${index}`;
                            
                            return (
                              <ListItem key={contactKey} divider>
                                <ListItemAvatar>
                                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                                    {contact.firstName?.charAt(0) || contact.phoneNumber?.charAt(0) || '?'}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography variant="body2">
                                      {contact.firstName || contact.lastName ? 
                                        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() : 
                                        'Unknown Name'}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="caption" color="text.secondary">
                                      {contact.phoneNumber} 
                                      {contact.email && ` • ${contact.email}`}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      </Paper>
                    ) : (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <AlertTitle>No Contacts</AlertTitle>
                        <Typography variant="body2">
                          This group has no contacts yet. Add contacts to this group first.
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}
              </Grid>
            )}

            <ContactSelector
              open={contactSelectorOpen}
              onClose={() => setContactSelectorOpen(false)}
              onSelect={handleSelectContacts}
            />

            <Dialog open={showBulkWarning && getTargetCount() > 1000} onClose={() => setShowBulkWarning(false)}>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="warning" />
                Large Campaign Detected
              </DialogTitle>
              <DialogContent>
                <Typography variant="body1" gutterBottom>
                  You are about to send <strong>{getTargetCount()} messages</strong>.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  • This may take several minutes to complete
                  • The process will continue in the background
                  • You can leave this page and check progress in Campaigns
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowBulkWarning(false)}>Cancel</Button>
                <Button onClick={() => setShowBulkWarning(false)} variant="contained" color="warning">
                  Send Anyway
                </Button>
              </DialogActions>
            </Dialog>
          </Grid>
        );

      case 3: // Advanced Options
        return (
          <Grid container spacing={3}>
            {campaignType === 'recurring' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    <RepeatIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Recurrence Settings
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Recurrence Type</InputLabel>
                    <Select
                      value={formData.recurrenceRule.type}
                      onChange={(e) => handleRecurrenceChange('type', e.target.value as RecurrenceType)}
                      label="Recurrence Type"
                      disabled={loading || submitting || savingDraft}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Interval"
                    value={formData.recurrenceRule.interval}
                    onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value))}
                    inputProps={{ min: 1 }}
                    helperText="Every X days/weeks/months"
                    disabled={loading || submitting || savingDraft}
                  />
                </Grid>

                {formData.recurrenceRule.type === 'weekly' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Week Days</InputLabel>
                      <Select
                        multiple
                        value={formData.recurrenceRule.weekDays || []}
                        onChange={(e) => handleRecurrenceChange('weekDays', e.target.value as WeekDay[])}
                        label="Week Days"
                        renderValue={(selected) => (selected as WeekDay[]).join(', ')}
                        disabled={loading || submitting || savingDraft}
                      >
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                          <MenuItem key={day} value={day as WeekDay}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {formData.recurrenceRule.type === 'monthly' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Day of Month"
                      value={formData.recurrenceRule.monthDay}
                      onChange={(e) => handleRecurrenceChange('monthDay', parseInt(e.target.value) as MonthDay)}
                      inputProps={{ min: 1, max: 31 }}
                      disabled={loading || submitting || savingDraft}
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    End Recurrence
                  </Typography>
                  <RadioGroup
                    row
                    value={formData.recurrenceRule.endType}
                    onChange={(e) => handleRecurrenceChange('endType', e.target.value as 'never' | 'after' | 'on')}
                  >
                    <FormControlLabel value="never" control={<Radio />} label="Never" />
                    <FormControlLabel value="after" control={<Radio />} label="After" />
                    <FormControlLabel value="on" control={<Radio />} label="On" />
                  </RadioGroup>
                </Grid>

                {formData.recurrenceRule.endType === 'after' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Number of Occurrences"
                      value={formData.recurrenceRule.endAfter}
                      onChange={(e) => handleRecurrenceChange('endAfter', parseInt(e.target.value))}
                      error={!!validationErrors.endAfter}
                      helperText={validationErrors.endAfter}
                      inputProps={{ min: 1 }}
                      disabled={loading || submitting || savingDraft}
                    />
                  </Grid>
                )}

                {formData.recurrenceRule.endType === 'on' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="End Date"
                      value={formData.recurrenceRule.endDate}
                      onChange={(e) => handleRecurrenceChange('endDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={loading || submitting || savingDraft}
                    />
                  </Grid>
                )}
              </>
            )}

            {campaignType === 'birthday' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    <CakeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Birthday Campaign Settings
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Birthday Field</InputLabel>
                    <Select
                      value={formData.birthdayField}
                      onChange={(e) => setFormData({ ...formData, birthdayField: e.target.value })}
                      label="Birthday Field"
                      disabled={loading || submitting || savingDraft}
                    >
                      <MenuItem value="dateOfBirth">Date of Birth</MenuItem>
                      <MenuItem value="birthday">Birthday</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Send On</InputLabel>
                    <Select
                      value={formData.sendOn}
                      onChange={(e) => setFormData({ ...formData, sendOn: e.target.value as 'same_day' | 'day_before' | 'week_before' })}
                      label="Send On"
                      disabled={loading || submitting || savingDraft}
                    >
                      <MenuItem value="same_day">Same Day</MenuItem>
                      <MenuItem value="day_before">Day Before</MenuItem>
                      <MenuItem value="week_before">Week Before</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="time"
                    label="Send Time"
                    value={formData.sendTime}
                    onChange={handleInputChange('sendTime')}
                    InputLabelProps={{ shrink: true }}
                    error={!!validationErrors.sendTime}
                    helperText={validationErrors.sendTime}
                    disabled={loading || submitting || savingDraft}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Birthday Message Template"
                    value={formData.birthdayMessageTemplate}
                    onChange={handleInputChange('birthdayMessageTemplate')}
                    multiline
                    rows={4}
                    error={!!validationErrors.birthdayTemplate}
                    helperText={validationErrors.birthdayTemplate || 'Use {{age}} variable for age'}
                    disabled={loading || submitting || savingDraft}
                  />
                </Grid>
              </>
            )}
          </Grid>
        );

      case 4: // Review & Send
        const targetCount = getTargetCount();
        
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <CheckCircleIcon />
                    </Avatar>
                    <Typography variant="h6">Campaign Summary</Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Campaign Name
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {formData.name || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Sender ID
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {formData.senderId}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Message
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {formData.message || 'No message'}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Campaign Type
                      </Typography>
                      <Chip 
                        icon={campaignType === 'birthday' ? <CakeIcon /> : campaignType === 'recurring' ? <RepeatIcon /> : <SendIcon />}
                        label={campaignType}
                        color={campaignType === 'birthday' ? 'secondary' : campaignType === 'recurring' ? 'info' : 'primary'}
                        size="small"
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Target Type
                      </Typography>
                      <Typography variant="body1">
                        {formData.targetType}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Message Parts
                      </Typography>
                      <Typography variant="body1">
                        {messageParts}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Character Count
                      </Typography>
                      <Typography variant="body1">
                        {messageLength}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Recipients
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {targetCount}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Estimated Cost
                      </Typography>
                      <Typography variant="h6" color="warning.main">
                        {formatCostInTZS(estimatedCost)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatAvgCostInTZS(estimatedCost / (targetCount || 1))} per message
                      </Typography>
                    </Grid>
                    
                    {formData.scheduledFor && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Scheduled For
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ScheduleIcon color="action" />
                          <Typography variant="body1">
                            {format(new Date(formData.scheduledFor), 'MMMM dd, yyyy HH:mm')}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Message Settings
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        {formData.isUnicode && (
                          <Chip label="Unicode" size="small" color="info" />
                        )}
                        {formData.isFlash && (
                          <Chip label="Flash Message" size="small" color="warning" />
                        )}
                        {!formData.isUnicode && !formData.isFlash && (
                          <Typography variant="body2" color="text.secondary">
                            Standard SMS
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Pricing:</strong> This campaign will be charged at{' '}
                          {targetCount <= PRICING.tanzania.tier1.max ? formatAvgCostInTZS(PRICING.tanzania.tier1.price) :
                           targetCount <= PRICING.tanzania.tier2.max ? formatAvgCostInTZS(PRICING.tanzania.tier2.price) :
                           targetCount <= PRICING.tanzania.tier3.max ? formatAvgCostInTZS(PRICING.tanzania.tier3.price) :
                           formatAvgCostInTZS(PRICING.tanzania.tier4.price)} per message.
                          {' '}(PAYG rate: {formatAvgCostInTZS(PRICING.tanzania.payg)})
                        </Typography>
                      </Alert>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Skeleton variant="text" width={300} height={40} />
        </Box>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ width: '100%', mb: 4 }}>
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="text" width="100%" height={60} sx={{ mt: 2 }} />
            <Skeleton variant="text" width="100%" height={60} sx={{ mt: 1 }} />
            <Skeleton variant="text" width="60%" height={40} sx={{ mt: 2 }} />
          </Box>
          <LinearProgress />
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Loading Backdrop for submission */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={submitting || savingDraft}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">
            {submitting ? 'Creating Campaign...' : 'Saving Draft...'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            Please wait while we process your request
          </Typography>
        </Box>
      </Backdrop>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/campaigns')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          {campaignId ? 'Edit Campaign' : 'Create Campaign'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Button
                      variant="contained"
                      onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                      disabled={loading || submitting || savingDraft}
                      startIcon={submitting || savingDraft ? <CircularProgress size={20} /> : index === steps.length - 1 ? <SendIcon /> : null}
                      sx={{ mr: 1 }}
                    >
                      {index === steps.length - 1
                        ? campaignId ? 'Update Campaign' : 'Create Campaign'
                        : 'Continue'}
                    </Button>
                    <Button disabled={index === 0 || loading || submitting || savingDraft} onClick={handleBack}>
                      Back
                    </Button>
                  </Box>
                  {index === 0 && (
                    <Button 
                      variant="outlined" 
                      onClick={handleSaveDraft} 
                      disabled={loading || submitting || savingDraft} 
                      startIcon={savingDraft ? <CircularProgress size={20} /> : <SaveIcon />}
                    >
                      {savingDraft ? 'Saving...' : 'Save Draft'}
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};

export default CreateCampaign;