import { Router, type Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { authenticateToken, type AuthRequest } from "../middleware/auth";
import User from "../models/User";
import Session from "../models/Session";
import Course from "../models/Course";

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
        lastActive: member.coursesProgress.length > 0
          ? member.coursesProgress.sort((a, b) => b.lastAccess.getTime() - a.lastAccess.getTime())[0].lastAccess
          : null
      };
    }));

    res.json(teamStats.filter(Boolean));

  } catch (error) {
    console.error("Error fetching team statistics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
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

    // --- Calculate Daily Stats (Last 7 Days) ---
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const dailyStats = last7Days.map(date => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      // Filter sessions for this day
      const daySessions = sessions.filter(s =>
        s.startTime >= date && s.startTime < nextDay
      );

      // Calculate Energy/Focus from Assessments
      // We look for assessments where targetId is the user
      let totalEnergy = 0;
      let totalFocus = 0;
      let assessmentCount = 0;

      daySessions.forEach(session => {
        const userAssessment = session.assessments.find(a => a.targetId.toString() === userId.toString());
        if (userAssessment) {
          // Proxy: Energy = (Leadership + Adaptability) / 2 * 10
          // Proxy: Focus = (Communication + EmotionalInt) / 2 * 10
          totalEnergy += ((userAssessment.leadership + userAssessment.adaptability) / 2) * 10;
          totalFocus += ((userAssessment.communication + userAssessment.emotionalInt) / 2) * 10;
          assessmentCount++;
        }
      });

      const avgEnergy = assessmentCount > 0 ? Math.round(totalEnergy / assessmentCount) : 0;
      const avgFocus = assessmentCount > 0 ? Math.round(totalFocus / assessmentCount) : 0;

      return {
        name: getDayName(date),
        energy: avgEnergy, // 0-100
        focus: avgFocus,   // 0-100
        date: date.toISOString()
      };
    });

    // --- Average Energy Level ---
    // Calculate average energy across all available data points
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
