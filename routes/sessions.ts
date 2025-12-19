import express, { Response } from 'express';
import Session, { SessionZod, AssessmentZod } from '../models/Session';
import { authenticateToken, requireActiveSubscription, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Helper to check if user can modify a session
const canModifySession = (session: any, userId: string, role: string): boolean => {
  if (role === 'ADMIN') return true;
  if (session.coachId?.toString() === userId) return true;
  return false;
};

// GET /api/sessions - Get all sessions
router.get('/', authenticateToken, requireActiveSubscription, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, capsuleId, coachId, status } = req.query;

    const query: any = {};
    if (capsuleId) query.capsuleId = capsuleId;
    if (coachId) query.coachId = coachId;
    if (status) query.status = status;

    const sessions = await Session.find(query)
      .populate('capsuleId', 'name')
      .populate('coachId', 'name email')
      .populate('attendees', 'name email')
      .populate('assessments.raterId', 'name')
      .populate('assessments.targetId', 'name')
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ startTime: -1 });

    const total = await Session.countDocuments(query);

    res.json({
      sessions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/sessions/:id - Get session by ID
router.get('/:id', authenticateToken, requireActiveSubscription, async (req: AuthRequest, res: Response) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('capsuleId', 'name')
      .populate('coachId', 'name email')
      .populate('attendees', 'name email')
      .populate('assessments.raterId', 'name')
      .populate('assessments.targetId', 'name');
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/sessions - Create new session (COACH/ADMIN only)
router.post('/', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = SessionZod.parse(req.body);

    // SECURITY: If not admin, force coachId to be the current user
    if (req.user?.role !== 'ADMIN') {
      (validatedData as any).coachId = req.user?.userId;
    }

    const session = new Session(validatedData);
    await session.save();
    await session.populate('capsuleId', 'name');
    await session.populate('coachId', 'name email');
    await session.populate('attendees', 'name email');
    res.status(201).json(session);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PUT /api/sessions/:id - Update session (owner or ADMIN only)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // SECURITY: Check ownership before update
    const existingSession = await Session.findById(req.params.id);
    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!canModifySession(existingSession, req.user?.userId || '', req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied. Only session coach or admin can modify.' });
    }

    const validatedData = SessionZod.partial().parse(req.body);

    // SECURITY: Prevent non-admins from changing coachId to someone else
    if (req.user?.role !== 'ADMIN' && (validatedData as any).coachId) {
      delete (validatedData as any).coachId;
    }

    const session = await Session.findByIdAndUpdate(
      req.params.id,
      validatedData,
      { new: true, runValidators: true }
    ).populate('capsuleId', 'name')
      .populate('coachId', 'name email')
      .populate('attendees', 'name email');

    res.json(session);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// DELETE /api/sessions/:id - Delete session (owner or ADMIN only)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // SECURITY: Check ownership before delete
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!canModifySession(session, req.user?.userId || '', req.user?.role || '')) {
      return res.status(403).json({ error: 'Access denied. Only session coach or admin can delete.' });
    }

    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /api/sessions/:id/assessments - Add assessment to session (attendees/coach only)
router.post('/:id/assessments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validatedAssessment = AssessmentZod.parse(req.body);

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // SECURITY: Only session attendees, coach, or admin can add assessments
    const userId = req.user?.userId;
    const isAttendee = session.attendees.some((a: any) => a.toString() === userId);
    const isCoach = session.coachId?.toString() === userId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isAttendee && !isCoach && !isAdmin) {
      return res.status(403).json({ error: 'Only session participants can add assessments' });
    }

    session.assessments.push(validatedAssessment as any);
    await session.save();
    await session.populate('capsuleId', 'name');
    await session.populate('coachId', 'name email');
    await session.populate('attendees', 'name email');
    await session.populate('assessments.raterId', 'name');
    await session.populate('assessments.targetId', 'name');

    res.json(session);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to add assessment' });
  }
});

// GET /api/sessions/stats/overview - Get sessions statistics (MANAGER/COACH/ADMIN only)
router.get('/stats/overview', authenticateToken, requireRole(['MANAGER', 'COACH', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const totalSessions = await Session.countDocuments();
    const completedSessions = await Session.countDocuments({ status: 'COMPLETED' });
    const scheduledSessions = await Session.countDocuments({ status: 'SCHEDULED' });

    const totalDuration = await Session.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);

    const upcomingSessions = await Session.find({
      status: 'SCHEDULED',
      startTime: { $gte: new Date() }
    })
      .sort({ startTime: 1 })
      .limit(5)
      .select('startTime duration')
      .populate('coachId', 'name')
      .populate('capsuleId', 'name');

    res.json({
      totalSessions,
      completedSessions,
      scheduledSessions,
      totalCompletedDuration: totalDuration[0]?.total || 0,
      upcomingSessions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session statistics' });
  }
});

export default router;