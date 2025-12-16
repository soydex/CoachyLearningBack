import express from 'express';
import Session, { SessionZod, AssessmentZod } from '../models/Session';

const router = express.Router();

// GET /api/sessions - Get all sessions
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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

// POST /api/sessions - Create new session
router.post('/', async (req, res) => {
  try {
    const validatedData = SessionZod.parse(req.body);
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

// PUT /api/sessions/:id - Update session
router.put('/:id', async (req, res) => {
  try {
    const validatedData = SessionZod.partial().parse(req.body);
    const session = await Session.findByIdAndUpdate(
      req.params.id,
      validatedData,
      { new: true, runValidators: true }
    ).populate('capsuleId', 'name')
     .populate('coachId', 'name email')
     .populate('attendees', 'name email');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /api/sessions/:id/assessments - Add assessment to session
router.post('/:id/assessments', async (req, res) => {
  try {
    const validatedAssessment = AssessmentZod.parse(req.body);

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.assessments.push(validatedAssessment);
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

// GET /api/sessions/stats/overview - Get sessions statistics
router.get('/stats/overview', async (req, res) => {
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