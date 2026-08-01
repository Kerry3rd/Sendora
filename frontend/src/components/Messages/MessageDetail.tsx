import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { messageService } from '../../services/message.service';
import { ScheduledMessage, MessageLog } from '../../types/message.types';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Clock,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download
} from 'lucide-react';

export const MessageDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState<ScheduledMessage | null>(null);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [logPage, setLogPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    if (id) {
      fetchMessage();
      fetchLogs();
    }
  }, [id, logPage]);

  const fetchMessage = async () => {
    try {
      const data = await messageService.getMessage(id!);
      setMessage(data);
    } catch (error) {
      toast.error('Failed to load message');
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await messageService.getMessageLogs(id!, {
        page: logPage,
        limit: 50,
      });
      setLogs(response.logs);
      
      // Calculate stats
      const statsMap: Record<string, number> = {};
      response.stats.forEach(stat => {
        statsMap[stat.status] = parseInt(stat.count);
      });
      setStats(statsMap);
      setTotalLogs(response.pagination.total);
    } catch (error) {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async () => {
    if (!window.confirm('Send this message immediately?')) return;
    try {
      await messageService.triggerNow(id!);
      toast.success('Message triggered');
      setTimeout(() => {
        fetchMessage();
        fetchLogs();
      }, 2000);
    } catch (error) {
      toast.error('Failed to trigger message');
    }
  };

  const handlePause = async () => {
    try {
      await messageService.pauseMessage(id!);
      toast.success('Message paused');
      fetchMessage();
    } catch (error) {
      toast.error('Failed to pause message');
    }
  };

  const handleResume = async () => {
    try {
      await messageService.resumeMessage(id!);
      toast.success('Message resumed');
      fetchMessage();
    } catch (error) {
      toast.error('Failed to resume message');
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Status', 'Contact', 'Email/Phone', 'Sent At', 'Error'].join(','),
      ...logs.map(log => [
        log.status,
        log.contactId,
        log.contactEmail || log.contactPhone || '',
        format(new Date(log.sentAt), 'yyyy-MM-dd HH:mm:ss'),
        log.error || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-${id}-logs.csv`;
    a.click();
  };

  if (loading || !message) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/messages')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} className="mr-1" />
          Back to Messages
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{message.name}</h1>
            <p className="text-gray-600">{message.subject}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate(`/messages/edit/${message.id}`)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Edit
            </button>
            {message.status === 'paused' ? (
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Resume
              </button>
            ) : message.status !== 'completed' && (
              <button
                onClick={handlePause}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Pause
              </button>
            )}
            <button
              onClick={handleTrigger}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Send Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold">{message.sentCount + message.failedCount}</p>
            </div>
            <Users size={24} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sent</p>
              <p className="text-2xl font-bold text-green-600">{message.sentCount}</p>
            </div>
            <CheckCircle size={24} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">{message.failedCount}</p>
            </div>
            <XCircle size={24} className="text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold">
                {message.sentCount + message.failedCount > 0
                  ? Math.round((message.sentCount / (message.sentCount + message.failedCount)) * 100)
                  : 0}%
              </p>
            </div>
            <RefreshCw size={24} className="text-purple-500" />
          </div>
        </div>
      </div>

      {/* Message Details */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow col-span-2">
          <h2 className="text-lg font-semibold mb-4">Message Content</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Schedule Details</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Start:</span>
              <span className="text-sm font-medium">
                {format(new Date(message.startDate), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Time:</span>
              <span className="text-sm font-medium">{message.repeatTime}</span>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Repeat:</span>
              <span className="text-sm font-medium capitalize">{message.repeatType}</span>
            </div>
            {message.repeatDay !== undefined && (
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">Repeat Day:</span>
                <span className="text-sm font-medium">{message.repeatDay}</span>
              </div>
            )}
            {message.endDate && (
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">End:</span>
                <span className="text-sm font-medium">
                  {format(new Date(message.endDate), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            <div className="pt-3 border-t">
              <div className="flex items-center space-x-2">
                <Users size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">Target:</span>
                <span className="text-sm font-medium capitalize">{message.targetType}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {message.targetIds.length} items selected
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Delivery Logs</h2>
          <button
            onClick={exportLogs}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Contact</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Destination</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Sent At</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                      log.status === 'sent' ? 'bg-green-100 text-green-800' :
                      log.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.status === 'sent' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      <span>{log.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">{log.contactId}</td>
                  <td className="px-4 py-2 text-sm">{log.contactEmail || log.contactPhone}</td>
                  <td className="px-4 py-2 text-sm">
                    {format(new Date(log.sentAt), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-2 text-sm text-red-600">{log.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <p className="text-center text-gray-500 py-8">No logs yet</p>
        )}

        {/* Pagination */}
        {totalLogs > 50 && (
          <div className="flex justify-center mt-4 space-x-2">
            <button
              onClick={() => setLogPage(p => Math.max(1, p - 1))}
              disabled={logPage === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {logPage} of {Math.ceil(totalLogs / 50)}
            </span>
            <button
              onClick={() => setLogPage(p => p + 1)}
              disabled={logPage >= Math.ceil(totalLogs / 50)}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};