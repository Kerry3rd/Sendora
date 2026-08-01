import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { messageService } from '../../services/message.service';
import { ScheduledMessage } from '../../types/message.types';
import { toast } from 'react-hot-toast';
import {
  Clock,
  Mail,
  MessageSquare,
  Bell,
  Play,
  Pause,
  Trash2,
  Eye,
  Edit,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

export const MessageList: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed' | 'paused'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchMessages();
  }, [filter, typeFilter, page]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await messageService.getMessages({
        page,
        limit: 20,
        status: filter !== 'all' ? filter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      });
      setMessages(response.messages);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      toast.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await messageService.pauseMessage(id);
      toast.success('Message paused');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to pause message');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await messageService.resumeMessage(id);
      toast.success('Message resumed');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to resume message');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this scheduled message?')) return;
    try {
      await messageService.deleteMessage(id);
      toast.success('Message deleted');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const handleTrigger = async (id: string) => {
    if (!window.confirm('Send this message immediately?')) return;
    try {
      await messageService.triggerNow(id);
      toast.success('Message triggered');
      setTimeout(fetchMessages, 2000);
    } catch (error) {
      toast.error('Failed to trigger message');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="text-green-500" />;
      case 'pending': return <Clock size={16} className="text-blue-500" />;
      case 'processing': return <RefreshCw size={16} className="text-yellow-500 animate-spin" />;
      case 'failed': return <XCircle size={16} className="text-red-500" />;
      case 'paused': return <Pause size={16} className="text-gray-500" />;
      default: return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail size={16} className="text-purple-500" />;
      case 'sms': return <MessageSquare size={16} className="text-green-500" />;
      default: return <Bell size={16} className="text-blue-500" />;
    }
  };

  const getRepeatText = (message: ScheduledMessage) => {
    switch (message.repeatType) {
      case 'once': return 'Once';
      case 'daily': return 'Daily';
      case 'weekly': return `Weekly on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][message.repeatDay || 0]}`;
      case 'monthly': return `Monthly on day ${message.repeatDay}`;
      default: return message.repeatType;
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Scheduled Messages</h1>
          <p className="text-gray-600">Manage your automated messages</p>
        </div>
        <button
          onClick={() => navigate('/messages/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>+</span>
          <span>Schedule Message</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Status:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border rounded p-2 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="border rounded p-2 text-sm"
          >
            <option value="all">All</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>

        <button
          onClick={fetchMessages}
          className="ml-auto text-gray-600 hover:text-gray-900"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Message List */}
      <div className="space-y-4">
        {messages.map(message => (
          <div key={message.id} className="bg-white rounded-lg shadow hover:shadow-md transition">
            <div className="p-6">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getTypeIcon(message.messageType)}
                  <div>
                    <h3 className="text-lg font-semibold">{message.name}</h3>
                    <p className="text-sm text-gray-600">{message.subject}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(message.status)}`}>
                    {getStatusIcon(message.status)}
                    <span>{message.status}</span>
                  </span>
                  <div className="relative group">
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <MoreVertical size={16} />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border hidden group-hover:block z-10">
                      <button
                        onClick={() => navigate(`/messages/${message.id}`)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Eye size={16} />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={() => navigate(`/messages/edit/${message.id}`)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Edit size={16} />
                        <span>Edit</span>
                      </button>
                      {message.status === 'paused' ? (
                        <button
                          onClick={() => handleResume(message.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Play size={16} />
                          <span>Resume</span>
                        </button>
                      ) : message.status !== 'completed' && message.status !== 'failed' && (
                        <button
                          onClick={() => handlePause(message.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Pause size={16} />
                          <span>Pause</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleTrigger(message.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <RefreshCw size={16} />
                        <span>Send Now</span>
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => handleDelete(message.id)}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center space-x-2"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Schedule</span>
                  <span className="font-medium">{getRepeatText(message)}</span>
                  <span className="text-gray-600 block text-xs">{message.repeatTime}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Next Send</span>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(message.nextScheduledAt), { addSuffix: true })}
                  </span>
                  <span className="text-gray-600 block text-xs">
                    {format(new Date(message.nextScheduledAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Target</span>
                  <span className="font-medium capitalize">{message.targetType}</span>
                  <span className="text-gray-600 block text-xs">
                    {message.targetIds.length} selected
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Stats</span>
                  <div className="flex space-x-3">
                    <span className="text-green-600">✓ {message.sentCount}</span>
                    {message.failedCount > 0 && (
                      <span className="text-red-600">✗ {message.failedCount}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar for active messages */}
              {(message.status === 'pending' || message.status === 'processing') && message.sentCount + message.failedCount > 0 && (
                <div className="mt-4">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600"
                      style={{
                        width: `${((message.sentCount + message.failedCount) / (message.sentCount + message.failedCount + 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <Clock size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No scheduled messages yet</p>
            <button
              onClick={() => navigate('/messages/new')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Schedule your first message
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};