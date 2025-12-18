import express from 'express';
import Notification from '../models/Notification';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// GET /api/notifications - Get all notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications - Create a new notification (Coach, Manager, Admin only)
router.post('/', authenticateToken, requireRole(['COACH', 'MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const notification = new Notification({
      id: `notif-${Date.now()}`,
      title,
      message,
      date: new Date().toISOString(),
      isRead: false,
      type: type || 'info',
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// DELETE /api/notifications/:id - Delete a notification (Admin only)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ id: req.params.id });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;

