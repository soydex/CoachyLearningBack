import express from 'express';
import User, { UserZod } from '../models/User';
import Feedback from '../models/Feedback';
import Notification from '../models/Notification';
import Session from '../models/Session';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/users - Get all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;

    const query: any = {};
    if (role) query.role = role;

    const users = await User.find(query)
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
    const user = await User.findById(req.params.id);
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
    );

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
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;

    // Check permissions (self or admin)
    if (req.user?.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to delete this user' });
    }

    // 1. Delete all feedback left by user
    await Feedback.deleteMany({ userId });

    // 2. Delete all notifications for this user
    await Notification.deleteMany({ userId });

    // 3. Remove from session attendees
    await Session.updateMany(
      { attendees: userId },
      { $pull: { attendees: userId } }
    );

    // 4. Remove assessments involving this user (as rater or target)
    await Session.updateMany(
      {
        $or: [
          { 'assessments.raterId': userId },
          { 'assessments.targetId': userId }
        ]
      },
      {
        $pull: {
          assessments: {
            $or: [
              { raterId: userId },
              { targetId: userId }
            ]
          }
        }
      }
    );

    // 5. Final user deletion
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
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

    // Calculate progress
    try {

      const CourseModel = (await import('../models/Course')).default;
      const course = await CourseModel.findOne({ id: courseId });

      if (course) {
        const totalLessons = course.modules.reduce((acc: number, m: any) => acc + m.lessons.length, 0);
        if (totalLessons > 0) {
          courseProgress.progress = Math.round((courseProgress.completedLessonIds.length / totalLessons) * 100);
        } else {
          courseProgress.progress = 100; // If no lessons, technically complete? Or 0? Let's say 100 if completed ids >= 0? No, 0 is safer.
          if (course.modules.length === 0) courseProgress.progress = 100; // Empty course is complete
        }
      }
    } catch (err) {
      console.error("Error calculating progress:", err);
    }

    // Update last access
    courseProgress.lastAccess = new Date();

    await user.save();

    res.json({
      message: 'Lesson completion toggled',
      isCompleted,
      completedLessonIds: courseProgress.completedLessonIds,
      progress: courseProgress.progress
    });

  } catch (error) {
    console.error('Error toggling lesson completion:', error);
    res.status(500).json({ error: 'Failed to toggle lesson completion' });
  }
});


export default router;