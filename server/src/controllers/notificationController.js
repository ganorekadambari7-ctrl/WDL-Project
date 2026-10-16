import Notification from '../models/Notification.js';

/**
 * GET /api/notifications
 * Get user's own notifications and unread counter.
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(40)
        .populate('sender', 'name username role'),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification owned by current user as read.
 */
export const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found or access denied.' });
    }

    notif.isRead = true;
    await notif.save();

    res.json({ message: 'Notification marked as read.', notification: notif });
  } catch (err) {
    console.error('markAsRead error:', err);
    res.status(500).json({ message: 'Failed to update notification.' });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications for current user as read.
 */
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    res.status(500).json({ message: 'Failed to mark all as read.' });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification owned by current user.
 */
export const deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found or access denied.' });
    }

    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    console.error('deleteNotification error:', err);
    res.status(500).json({ message: 'Failed to delete notification.' });
  }
};
