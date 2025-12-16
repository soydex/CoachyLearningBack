import express from 'express';
import Course from '../models/Course';
import User from '../models/User';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is available or I'll use a helper

const router = express.Router();

// Helper for simple ID generation if uuid is not installed
const generateId = () => Math.random().toString(36).substring(2, 15);

// GET /api/courses - Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/courses/:id - Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findOne({ id: req.params.id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// POST /api/courses - Create a new course (Coach/Admin only)
router.post('/', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const { title, category } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const newCourse = new Course({
      id: `c-${generateId()}`,
      title,
      category,
      modules: []
    });

    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// POST /api/courses/:id/modules - Add a module to a course
router.post('/:id/modules', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Module title is required' });
    }

    const course = await Course.findOne({ id: req.params.id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const newModule = {
      id: `m-${generateId()}`,
      title,
      lessons: [],
      isOpen: false
    };

    course.modules.push(newModule);
    await course.save();

    res.status(201).json(newModule);
  } catch (error) {
    console.error('Add module error:', error);
    res.status(500).json({ error: 'Failed to add module' });
  }
});

// POST /api/courses/:id/modules/:moduleId/lessons - Add a lesson to a module
router.post('/:id/modules/:moduleId/lessons', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const { title, type, duration, content, questions } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    const course = await Course.findOne({ id: req.params.id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const moduleIndex = course.modules.findIndex(m => m.id === req.params.moduleId);
    if (moduleIndex === -1) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const newLesson = {
      id: `l-${generateId()}`,
      title,
      type,
      duration: duration || '5 min',
      content: content || '',
      questions: questions || [],
      steps: []
    };

    course.modules[moduleIndex].lessons.push(newLesson);
    await course.save();

    res.status(201).json(newLesson);
  } catch (error) {
    console.error('Add lesson error:', error);
    res.status(500).json({ error: 'Failed to add lesson' });
  }
});

// POST /api/courses/:id/lessons/:lessonId/complete - Mark a lesson as complete or incomplete
router.post('/:id/lessons/:lessonId/complete', authenticateToken, async (req: any, res) => {
  try {
    const courseId = req.params.id;
    const lessonId = req.params.lessonId;
    const userId = req.user?.userId;
    const { completed = true } = req.body; // Default to true for backward compatibility

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    // 1. Verify course and lesson exist
    const course = await Course.findOne({ id: courseId });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const allLessons = course.modules.flatMap(m => m.lessons);
    const lesson = allLessons.find(l => l.id === lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // 2. Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 3. Update progress
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

    if (completed) {
      // Add lesson if not already completed
      if (!courseProgress.completedLessonIds.includes(lessonId)) {
        courseProgress.completedLessonIds.push(lessonId);
      }
    } else {
      // Remove lesson if present
      courseProgress.completedLessonIds = courseProgress.completedLessonIds.filter(id => id !== lessonId);
    }

    // Recalculate progress
    const totalLessons = allLessons.length;
    const completedCount = courseProgress.completedLessonIds.length;
    courseProgress.progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    courseProgress.lastAccess = new Date();

    await user.save();

    res.json({ 
      message: completed ? 'Lesson completed' : 'Lesson uncompleted', 
      progress: courseProgress.progress,
      completedLessonIds: courseProgress.completedLessonIds 
    });

  } catch (error) {
    console.error('Complete lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson status' });
  }
});

export default router;
