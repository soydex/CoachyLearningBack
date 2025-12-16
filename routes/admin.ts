import express from 'express';
import User from '../models/User';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// GET /api/admin/users - Get all users with their stats
router.get('/users', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -legacyWPHash')
      .populate('organizationId', 'name');
    
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
