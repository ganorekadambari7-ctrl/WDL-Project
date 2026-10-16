import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { notificationApi } from '../services/api';

function timeAgo(dateString) {
  if (!dateString) return '';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await notificationApi.list();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Non-critical background failure
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds for background updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignored
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationApi.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignored
      }
    }

    setOpen(false);

    // If related to a course or learning event, navigate to Learning page
    if (notif.course || notif.type.includes('course') || notif.type.includes('certificate')) {
      navigate('/learning');
    }
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationApi.remove(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      // Re-fetch to update counter accurately
      fetchNotifications();
    } catch {
      // Ignored
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'course_submitted':
        return <BookOpen size={16} className="text-indigo-600" />;
      case 'certificate_submitted':
        return <Clock size={16} className="text-amber-600" />;
      case 'certificate_verified':
        return <CheckCircle2 size={16} className="text-emerald-600" />;
      case 'certificate_rejected':
        return <XCircle size={16} className="text-rose-600" />;
      default:
        return <Award size={16} className="text-purple-600" />;
    }
  };

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        aria-label="Open notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Bell size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Course submissions and certificate verifications will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-start gap-3 p-3.5 cursor-pointer transition-colors hover:bg-slate-50/80 ${
                    !item.isRead ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  <div className="mt-0.5 rounded-lg bg-white p-2 shadow-xs border border-slate-100 shrink-0">
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-xs truncate ${!item.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {item.metadata?.remarks && (
                      <div className="mt-1.5 rounded-md bg-slate-100/80 px-2 py-1 text-[11px] text-slate-700 border border-slate-200/50">
                        <span className="font-semibold text-slate-500 uppercase text-[9px] block">Remarks:</span>
                        {item.metadata.remarks}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1">
                    {!item.isRead && (
                      <span className="size-2 rounded-full bg-indigo-600" title="Unread" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item._id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                      title="Delete notification"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 p-2 text-center bg-slate-50/50">
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/learning'); }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Go to Learning & Development →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
