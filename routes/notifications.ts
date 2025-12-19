import express from 'express';
import Notification from '../models/Notification';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Types } from 'mongoose';

const router = express.Router();

// GET /api/notifications - Get notifications for the current user
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    // Find notifications that are either global (no userId) or specifically for this user
    const notifications = await Notification.find({
      $or: [
        { userId: { $exists: false } }, // Global
        { userId: null },              // Global
        { userId: new Types.ObjectId(userId) } // Personal
      ]
    }).sort({ createdAt: -1 }).limit(50);

    // Map to include a per-user isRead status
    const formattedNotifications = notifications.map(n => {
      const doc = n.toObject();
      let isRead = doc.isRead;

      if (!doc.userId) {
        // For global notifications, check if user is in readBy array
        isRead = doc.readBy?.some((id: any) => id.toString() === userId.toString()) || false;
      }

      return {
        ...doc,
        isRead
      };
    });

    res.json(formattedNotifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark a notification as read
router.patch('/:id/read', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id: paramId } = req.params;

    // Try to find by custom id first, then by _id
    let notification = await Notification.findOne({ id: paramId });
    if (!notification && Types.ObjectId.isValid(paramId)) {
      notification = await Notification.findById(paramId);
    }

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const doc: any = notification;

    if (doc.userId) {
      // Personal notification
      if (doc.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      doc.isRead = true;
    } else {
      // Global notification - add user to readBy if not already there
      if (!doc.readBy) {
        doc.readBy = [];
      }
      if (!doc.readBy.some((id: any) => id.toString() === userId.toString())) {
        doc.readBy.push(new Types.ObjectId(userId));
      }
    }

    await doc.save();
    res.json({ success: true, isRead: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// PATCH /api/notifications/mark-all-read - Mark all as read
router.patch('/mark-all-read', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userObjectId = new Types.ObjectId(userId);

    // Update personal notifications
    await Notification.updateMany(
      { userId: userObjectId, isRead: false },
      { $set: { isRead: true } }
    );

    // Update global notifications (add user to readBy)
    await Notification.updateMany(
      {
        $or: [{ userId: { $exists: false } }, { userId: null }],
        readBy: { $ne: userObjectId }
      },
      { $addToSet: { readBy: userObjectId } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// POST /api/notifications - Create a new notification (Coach, Manager, Admin only)
router.post('/', authenticateToken, requireRole(['COACH', 'MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { title, message, type, targetUserId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const notification = new Notification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title,
      message,
      date: new Date(),
      isRead: false,
      type: type || 'info',
      userId: targetUserId ? new Types.ObjectId(targetUserId) : null,
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id: paramId } = req.params;

    // Try to find by custom id first, then by _id
    let notification = await Notification.findOne({ id: paramId });
    if (!notification && Types.ObjectId.isValid(paramId)) {
      notification = await Notification.findById(paramId);
    }

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Only Admin can delete global notifications
    // Users can delete their own personal notifications
    if (notification.userId) {
      if (notification.userId.toString() !== req.user.userId.toString() && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete global notifications' });
    }

    await Notification.deleteOne({ _id: notification._id });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
