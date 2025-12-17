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

// PUT /api/courses/:id - Update course details
router.put('/:id', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const { title, category } = req.body;
    const course = await Course.findOne({ id: req.params.id });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (title) course.title = title;
    if (category) course.category = category;

    await course.save();
    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /api/courses/:id - Delete a course
router.delete('/:id', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const result = await Course.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// PUT /api/courses/:id/modules/:moduleId - Update a module
router.put('/:id/modules/:moduleId', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const { title } = req.body;
    const course = await Course.findOne({ id: req.params.id });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const module = course.modules.find(m => m.id === req.params.moduleId);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (title) module.title = title;

    await course.save();
    res.json(module);
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// DELETE /api/courses/:id/modules/:moduleId - Delete a module
router.delete('/:id/modules/:moduleId', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const course = await Course.findOne({ id: req.params.id });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const initialLength = course.modules.length;
    course.modules = course.modules.filter(m => m.id !== req.params.moduleId);

    if (course.modules.length === initialLength) {
      return res.status(404).json({ error: 'Module not found' });
    }

    await course.save();
    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// PUT /api/courses/:id/modules/:moduleId/lessons/:lessonId - Update a lesson
router.put('/:id/modules/:moduleId/lessons/:lessonId', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const { title, type, duration, content, questions } = req.body;
    const course = await Course.findOne({ id: req.params.id });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const module = course.modules.find(m => m.id === req.params.moduleId);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const lesson = module.lessons.find(l => l.id === req.params.lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (title) lesson.title = title;
    if (type) lesson.type = type;
    if (duration) lesson.duration = duration;
    if (content !== undefined) lesson.content = content;
    if (questions) lesson.questions = questions;

    await course.save();
    res.json(lesson);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// DELETE /api/courses/:id/modules/:moduleId/lessons/:lessonId - Delete a lesson
router.delete('/:id/modules/:moduleId/lessons/:lessonId', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const course = await Course.findOne({ id: req.params.id });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const module = course.modules.find(m => m.id === req.params.moduleId);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const initialLength = module.lessons.length;
    module.lessons = module.lessons.filter(l => l.id !== req.params.lessonId);

    if (module.lessons.length === initialLength) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    await course.save();
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// POST /api/courses/:id/progress - Update course progress
router.post('/:id/progress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { lessonId, isCompleted } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find or create course progress
    let courseProgress = user.coursesProgress?.find(cp => cp.courseId === req.params.id);
    
    if (!courseProgress) {
      if (!user.coursesProgress) user.coursesProgress = [];
      user.coursesProgress.push({
        courseId: req.params.id,
        completedLessonIds: [],
        progress: 0,
        score: 0,
        lastAccess: new Date()
      });
      courseProgress = user.coursesProgress[user.coursesProgress.length - 1];
    }

    // Update completed lessons
    if (isCompleted) {
      if (!courseProgress.completedLessonIds.includes(lessonId)) {
        courseProgress.completedLessonIds.push(lessonId);
      }
    } else {
      courseProgress.completedLessonIds = courseProgress.completedLessonIds.filter(id => id !== lessonId);
    }

    courseProgress.lastAccess = new Date();

    // Calculate progress percentage
    const course = await Course.findOne({ id: req.params.id });
    if (course) {
      let totalLessons = 0;
      course.modules.forEach(m => totalLessons += m.lessons.length);
      if (totalLessons > 0) {
        courseProgress.progress = Math.round((courseProgress.completedLessonIds.length / totalLessons) * 100);
      }
    }

    await user.save();
    res.json(courseProgress);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// POST /api/courses/:id/lessons/:lessonId/quiz/submit - Submit quiz answers
router.post('/:id/lessons/:lessonId/quiz/submit', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { answers } = req.body; // Object with questionId: answerIndex
    const userId = req.user?.userId;
    const courseId = req.params.id;
    const lessonId = req.params.lessonId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const course = await Course.findOne({ id: courseId });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const allLessons = course.modules.flatMap(m => m.lessons);
    const lesson = allLessons.find(l => l.id === lessonId);
    
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (lesson.type !== 'QUIZ') {
      return res.status(400).json({ error: 'Lesson is not a quiz' });
    }

    // Calculate score
    let correctCount = 0;
    const totalQuestions = lesson.questions.length;
    const results = lesson.questions.map(q => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctAnswerIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        isCorrect,
        correctAnswer: q.correctAnswerIndex
      };
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70; // 70% passing grade

    // Update user progress if passed
    if (passed) {
      const user = await User.findById(userId);
      if (user) {
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

        if (!courseProgress.completedLessonIds.includes(lessonId)) {
          courseProgress.completedLessonIds.push(lessonId);
        }

        // Recalculate overall course progress
        const totalLessons = allLessons.length;
        const completedCount = courseProgress.completedLessonIds.length;
        courseProgress.progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        courseProgress.lastAccess = new Date();
        
        await user.save();
      }
    }

    res.json({
      passed,
      score,
      results
    });

  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// GET /api/courses/:id/certificate - Get course certificate
router.get('/:id/certificate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const courseId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const course = await Course.findOne({ id: courseId });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const courseProgress = user.coursesProgress.find(cp => cp.courseId === courseId);
    if (!courseProgress) {
      return res.status(403).json({ error: 'Course not started' });
    }

    // Check if all lessons are completed
    const allLessons = course.modules.flatMap(m => m.lessons);
    const totalLessons = allLessons.length;
    const completedCount = courseProgress.completedLessonIds.length;

    if (completedCount < totalLessons) {
      return res.status(403).json({ error: 'Course not completed' });
    }

    // Generate certificate data (mock for now)
    const certificate = {
      id: `cert-${userId}-${courseId}`,
      studentName: user.name,
      courseTitle: course.title,
      completionDate: new Date(),
      organization: 'CoachyLearning'
    };

    res.json(certificate);

  } catch (error) {
    console.error('Certificate error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

export default router;
