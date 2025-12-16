import express from 'express';
import User, { UserZod } from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/users - Get all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, organizationId, role } = req.query;

    const query: any = {};
    if (organizationId) query.organizationId = organizationId;
    if (role) query.role = role;

    const users = await User.find(query)
      .populate('organizationId', 'name')
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('organizationId', 'name');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
  try {
    const validatedData = UserZod.parse(req.body);
    const user = new User(validatedData);
    await user.save();
    await user.populate('organizationId', 'name');
    res.status(201).json(user);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const validatedData = UserZod.partial().parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      validatedData,
      { new: true, runValidators: true }
    ).populate('organizationId', 'name');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/users/stats/overview - Get users statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt');

    res.json({
      totalUsers,
      usersByRole,
      recentUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// DELETE /api/users/:id/courses/:courseId - Remove course acquisition
router.delete('/:id/courses/:courseId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    const courseId = req.params.courseId;

    // Ensure user is modifying their own data or is admin
    if (req.user?.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove the course progress entry
    user.coursesProgress = user.coursesProgress.filter(cp => cp.courseId !== courseId);
    await user.save();

    res.json({ 
      message: 'Course acquisition removed',
      coursesProgress: user.coursesProgress 
    });
  } catch (error) {
    console.error('Remove course acquisition error:', error);
    res.status(500).json({ error: 'Failed to remove course acquisition' });
  }
});
// POST /api/users/:userId/courses/:courseId/lessons/:lessonId/toggle - Toggle lesson completion
router.post('/:userId/courses/:courseId/lessons/:lessonId/toggle', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId, courseId, lessonId } = req.params;

    // Ensure user is modifying their own data or is admin
    if (req.user?.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find or create course progress
    let courseProgress = user.coursesProgress.find(cp => cp.courseId === courseId);
    if (!courseProgress) {
      courseProgress = {
        courseId,
        completedLessonIds: [],
        progress: 0,
        score: 0,
        lastAccess: new Date()
      };
      user.coursesProgress.push(courseProgress);
    }

    // Toggle lesson completion
    const lessonIndex = courseProgress.completedLessonIds.indexOf(lessonId);
    let isCompleted = false;
    
    if (lessonIndex > -1) {
      // Remove lesson (uncomplete)
      courseProgress.completedLessonIds.splice(lessonIndex, 1);
      isCompleted = false;
    } else {
      // Add lesson (complete)
      courseProgress.completedLessonIds.push(lessonId);
      isCompleted = true;
    }

    // Update last access
    courseProgress.lastAccess = new Date();

    await user.save();

    res.json({ 
      message: 'Lesson completion toggled', 
      isCompleted, 
      completedLessonIds: courseProgress.completedLessonIds 
    });

  } catch (error) {
    console.error('Error toggling lesson completion:', error);
    res.status(500).json({ error: 'Failed to toggle lesson completion' });
  }
});


export default router;