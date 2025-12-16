import express from 'express';
import Organization, { OrganizationZod } from '../models/Organization';

const router = express.Router();

// GET /api/organizations - Get all organizations
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const organizations = await Organization.find()
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Organization.countDocuments();

    res.json({
      organizations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// GET /api/organizations/:id - Get organization by ID
router.get('/:id', async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// POST /api/organizations - Create new organization
router.post('/', async (req, res) => {
  try {
    const validatedData = OrganizationZod.parse(req.body);
    const organization = new Organization(validatedData);
    await organization.save();
    res.status(201).json(organization);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// PUT /api/organizations/:id - Update organization
router.put('/:id', async (req, res) => {
  try {
    const validatedData = OrganizationZod.partial().parse(req.body);
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      validatedData,
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// DELETE /api/organizations/:id - Delete organization
router.delete('/:id', async (req, res) => {
  try {
    const organization = await Organization.findByIdAndDelete(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// GET /api/organizations/stats/overview - Get organizations statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalOrganizations = await Organization.countDocuments();
    const recentOrganizations = await Organization.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name createdAt');

    res.json({
      totalOrganizations,
      recentOrganizations
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization statistics' });
  }
});

export default router;