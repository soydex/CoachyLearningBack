import { Router, type Response } from "express";
import { Types } from "mongoose";
import { authenticateToken, requireActiveSubscription, type AuthRequest } from "../middleware/auth";
import EnergyLog, { EnergyLogZod } from "../models/EnergyLog";

const router = Router();

// Helper to get today's date at midnight (UTC)
const getTodayMidnight = () => {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    return now;
};

/**
 * POST /energy-logs
 * Submit or update today's mood check
 */
router.post("/", authenticateToken, requireActiveSubscription, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Validate input
        const parsed = EnergyLogZod.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid mood value. Must be 1, 2, or 3." });
        }

        const { mood } = parsed.data;
        const today = getTodayMidnight();

        // Upsert: create or update today's mood
        const log = await EnergyLog.findOneAndUpdate(
            { userId: new Types.ObjectId(userId), date: today } as any,
            { $set: { mood } },
            { upsert: true, new: true, returnDocument: 'after' }
        );

        res.status(200).json({
            message: "Mood check saved",
            log: {
                date: log?.date,
                mood: log?.mood,
            },
        });
    } catch (error) {
        console.error("Error saving energy log:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * GET /energy-logs
 * Get user's mood logs for the last N days
 */
router.get("/", authenticateToken, requireActiveSubscription, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const days = parseInt(req.query.days as string) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setUTCHours(0, 0, 0, 0);

        const logs = await EnergyLog.find({
            userId: new Types.ObjectId(userId),
            date: { $gte: startDate },
        } as any).sort({ date: -1 });

        res.json(logs.map(log => ({
            date: log.date,
            mood: log.mood,
        })));
    } catch (error) {
        console.error("Error fetching energy logs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * GET /energy-logs/today
 * Check if user has already submitted mood today
 */
router.get("/today", authenticateToken, requireActiveSubscription, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const today = getTodayMidnight();
        const log = await EnergyLog.findOne({
            userId: new Types.ObjectId(userId),
            date: today,
        } as any);

        res.json({
            hasSubmitted: !!log,
            mood: log?.mood || null,
        });
    } catch (error) {
        console.error("Error checking today's mood:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
