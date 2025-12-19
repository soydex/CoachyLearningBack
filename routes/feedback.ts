import { Router, Response } from 'express';
import Feedback, { FeedbackZod } from '../models/Feedback';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Submit feedback
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { courseId, lessonId, rating, comment } = req.body;

    // Validate input
    const validation = FeedbackZod.safeParse({
      userId,
      courseId,
      lessonId,
      rating,
      comment
    });

    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if feedback already exists for this user/lesson? 
    // For now, let's allow multiple or update existing. 
    // Let's update if exists to prevent spamming.

    const feedback = await Feedback.findOneAndUpdate(
      { userId, courseId, lessonId },
      { rating, comment },
      { new: true, upsert: true }
    );

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get global feedback stats (Admin/Coach)
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // SECURITY: Only admins and coaches can see all feedback stats
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'COACH') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs et coachs' });
    }

    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalFeedbacks: { $sum: 1 },
          ratingsDistribution: {
            $push: "$rating"
          }
        }
      }
    ]);

    const recentFeedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name');

    res.json({
      overview: stats[0] || { averageRating: 0, totalFeedbacks: 0, ratingsDistribution: [] },
      recent: recentFeedbacks
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feedback for a course (ADMIN/COACH only)
// SECURITY FIX: Was exposing user emails to any authenticated user
router.get('/course/:courseId', authenticateToken, async (req: AuthRequest, res) => {
  // SECURITY: Only admins and coaches can see feedback details
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'COACH') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs et coachs' });
  }

  try {
    const { courseId } = req.params;
    const feedbacks = await Feedback.find({ courseId }).populate('userId', 'name email');
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
