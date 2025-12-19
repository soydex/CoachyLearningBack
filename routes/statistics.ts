import { Router, type Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { authenticateToken, requireActiveSubscription, type AuthRequest } from "../middleware/auth";
import User from "../models/User";
import Session from "../models/Session";
import Course from "../models/Course";
import EnergyLog from "../models/EnergyLog";

const router = Router();

// Helper to format date as "Lun", "Mar", etc.
const getDayName = (date: Date) => {
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return days[date.getDay()];
};

// Helper to calculate stats for a single user
const calculateUserStats = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const sessions = await Session.find({
    attendees: new Types.ObjectId(userId),
    status: "COMPLETED",
  } as any);

  // --- Calculate Total Learning Time ---
  const totalSessionMinutes = sessions.reduce((acc, session) => acc + session.duration, 0);

  let totalCourseMinutes = 0;
  user.coursesProgress.forEach(cp => {
    totalCourseMinutes += cp.completedLessonIds.length * 15;
  });

  const totalMinutes = totalSessionMinutes + totalCourseMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const learningTimeFormatted = `${hours}h ${minutes}m`;

  // --- Calculate Completion Rate ---
  const totalProgress = user.coursesProgress.reduce((acc, cp) => acc + cp.progress, 0);
  const completionRate = user.coursesProgress.length > 0
    ? Math.round(totalProgress / user.coursesProgress.length)
    : 0;

  return {
    user,
    sessions,
    learningTimeFormatted,
    completionRate,
    totalMinutes
  };
};

router.get("/team", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const manager = await User.findById(userId);
    if (!manager) return res.status(404).json({ error: "Manager not found" });

    if (!["MANAGER", "ADMIN", "COACH"].includes(manager.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Find all users (except self and ADMINs)
    const teamMembers = await User.find({
      _id: { $ne: manager._id },
      role: { $in: ["USER", "COACH"] } // Only show students and coaches in team view
    });

    const teamStats = await Promise.all(teamMembers.map(async (member) => {
      const stats = await calculateUserStats(member._id.toString());
      if (!stats) return null;

      return {
        id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        learningTime: stats.learningTimeFormatted,
        completionRate: `${stats.completionRate}%`,
        lastActive: member.lastActive,
      };
    }));

    res.json(teamStats.filter(Boolean));

  } catch (error) {
    console.error("Error fetching team statistics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", authenticateToken, requireActiveSubscription, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const stats = await calculateUserStats(userId);
    if (!stats) {
      return res.status(404).json({ error: "User not found" });
    }

    const { user, sessions, learningTimeFormatted, completionRate } = stats;

    // --- Fetch mood logs for the last 7 days ---
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setUTCHours(0, 0, 0, 0);

    const moodLogs = await EnergyLog.find({
      userId: new Types.ObjectId(userId),
      date: { $gte: startDate },
    } as any);

    // Helper to check if two dates are the same day
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getUTCFullYear() === d2.getUTCFullYear() &&
      d1.getUTCMonth() === d2.getUTCMonth() &&
      d1.getUTCDate() === d2.getUTCDate();

    // Build array of last 7 days
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const dailyStats = last7Days.map((date: Date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      // Filter sessions for this day
      const daySessions = sessions.filter(s =>
        s.startTime >= date && s.startTime < nextDay
      );

      // Calculate session-based Energy/Focus from Assessments (legacy fallback)
      let sessionEnergy = 0;
      let sessionFocus = 0;
      let assessmentCount = 0;

      daySessions.forEach(session => {
        const userAssessment = session.assessments.find(a => a.targetId.toString() === userId.toString());
        if (userAssessment) {
          sessionEnergy += ((userAssessment.leadership + userAssessment.adaptability) / 2) * 10;
          sessionFocus += ((userAssessment.communication + userAssessment.emotionalInt) / 2) * 10;
          assessmentCount++;
        }
      });

      const avgSessionEnergy = assessmentCount > 0 ? Math.round(sessionEnergy / assessmentCount) : 0;
      const avgSessionFocus = assessmentCount > 0 ? Math.round(sessionFocus / assessmentCount) : 0;

      // --- Priority-based energy calculation ---
      // 1. Mood log (if submitted that day)
      // 2. Activity-based (lessons completed that day)
      // 3. Session assessments (legacy)
      // 4. Default to 0
      let energy = 0;
      let focus = 0;

      // Check for mood log this day
      const dayMoodLog = moodLogs.find(log => isSameDay(log.date, date));

      if (dayMoodLog) {
        // Mood: 1=Low(33), 2=Medium(66), 3=High(100)
        energy = dayMoodLog.mood * 33;
      } else if (avgSessionEnergy > 0) {
        // Use session assessment if available
        energy = avgSessionEnergy;
      }
      // Note: We could add activity-based calculation here in the future

      // Focus from sessions or activity
      focus = avgSessionFocus > 0 ? avgSessionFocus : Math.min(100, daySessions.length * 25);

      return {
        name: getDayName(date),
        energy: Math.min(100, energy), // 0-100
        focus: Math.min(100, focus),   // 0-100
        date: date.toISOString()
      };
    });

    // --- Average Energy Level ---
    const energyValues = dailyStats.filter(d => d.energy > 0).map(d => d.energy);
    const avgEnergyTotal = energyValues.length > 0
      ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length
      : 0;

    let energyLabel = "Moyenne";
    if (avgEnergyTotal >= 75) energyLabel = "Haute";
    else if (avgEnergyTotal >= 40) energyLabel = "Moyenne";
    else energyLabel = "Basse";

    res.json({
      learningTime: learningTimeFormatted,
      completionRate: `${completionRate}%`,
      energyLevel: energyLabel,
      chartData: dailyStats
    });

  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
