import express from 'express';
import { Types } from 'mongoose';
import Capsule, { CapsuleZod, TransactionZod } from '../models/Capsule';

const router = express.Router();

// GET /api/capsules - Get all capsules
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, organizationId, status } = req.query;

    const query: any = {};
    if (organizationId) query.organizationId = organizationId;
    if (status) query.status = status;

    const capsules = await Capsule.find(query)
      .populate('organizationId', 'name')
      .populate('history.userId', 'name email')
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Capsule.countDocuments(query);

    res.json({
      capsules,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch capsules' });
  }
});

// GET /api/capsules/:id - Get capsule by ID
router.get('/:id', async (req, res) => {
  try {
    const capsule = await Capsule.findById(req.params.id)
      .populate('organizationId', 'name')
      .populate('history.userId', 'name email');
    if (!capsule) {
      return res.status(404).json({ error: 'Capsule not found' });
    }
    res.json(capsule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch capsule' });
  }
});

// POST /api/capsules - Create new capsule
router.post('/', async (req, res) => {
  try {
    const validatedData = CapsuleZod.parse(req.body);
    const capsule = new Capsule(validatedData);
    await capsule.save();
    await capsule.populate('organizationId', 'name');
    res.status(201).json(capsule);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create capsule' });
  }
});

// PUT /api/capsules/:id - Update capsule
router.put('/:id', async (req, res) => {
  try {
    const validatedData = CapsuleZod.partial().parse(req.body);
    const capsule = await Capsule.findByIdAndUpdate(
      req.params.id,
      validatedData,
      { new: true, runValidators: true }
    ).populate('organizationId', 'name');

    if (!capsule) {
      return res.status(404).json({ error: 'Capsule not found' });
    }

    res.json(capsule);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update capsule' });
  }
});

// DELETE /api/capsules/:id - Delete capsule
router.delete('/:id', async (req, res) => {
  try {
    const capsule = await Capsule.findByIdAndDelete(req.params.id);
    if (!capsule) {
      return res.status(404).json({ error: 'Capsule not found' });
    }
    res.json({ message: 'Capsule deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete capsule' });
  }
});

// POST /api/capsules/:id/transactions - Add transaction to capsule
router.post('/:id/transactions', async (req, res) => {
  try {
    const validatedTransaction = TransactionZod.parse(req.body);

    const capsule = await Capsule.findById(req.params.id);
    if (!capsule) {
      return res.status(404).json({ error: 'Capsule not found' });
    }

    // Calculate new remaining hours
    const newRemainingHours = validatedTransaction.action === 'DEBIT'
      ? capsule.remainingHours - validatedTransaction.amount
      : capsule.remainingHours + validatedTransaction.amount;

    if (newRemainingHours < 0) {
      return res.status(400).json({ error: 'Insufficient hours remaining' });
    }

    // Convert userId string to ObjectId
    const transaction = {
      ...validatedTransaction,
      userId: new Types.ObjectId(validatedTransaction.userId)
    };

    capsule.history.push(transaction as any);
    capsule.remainingHours = newRemainingHours;

    await capsule.save();
    await capsule.populate('organizationId', 'name');
    await capsule.populate('history.userId', 'name email');

    res.json(capsule);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// GET /api/capsules/stats/overview - Get capsules statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalCapsules = await Capsule.countDocuments();
    const activeCapsules = await Capsule.countDocuments({ status: 'ACTIVE' });
    const expiredCapsules = await Capsule.countDocuments({ status: 'EXPIRED' });

    const totalHours = await Capsule.aggregate([
      { $group: { _id: null, total: { $sum: '$remainingHours' } } }
    ]);

    const recentCapsules = await Capsule.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name remainingHours status createdAt')
      .populate('organizationId', 'name');

    res.json({
      totalCapsules,
      activeCapsules,
      expiredCapsules,
      totalRemainingHours: totalHours[0]?.total || 0,
      recentCapsules
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch capsule statistics' });
  }
});

export default router;