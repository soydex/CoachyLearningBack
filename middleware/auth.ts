import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// SECURITY: Crash immediately if JWT_SECRET is not set - never use a fallback
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;

    // Update lastActive timestamp in the background
    const User = (await import("../models/User")).default;
    User.findByIdAndUpdate(decoded.userId, { lastActive: new Date() }).exec().catch(err => {
      console.error("Failed to update lastActive:", err);
    });

    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid token." });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Access denied. Insufficient permissions." });
    }

    next();
  };
};

export const requireActiveSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  // Admins bypass subscription check
  if (req.user.role === "ADMIN") {
    return next();
  }

  try {
    const User = (await import("../models/User")).default;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isSubscriptionActive =
      user.subscription?.isActive &&
      (!user.subscription.expirationDate ||
        new Date(user.subscription.expirationDate) > new Date());

    if (!isSubscriptionActive) {
      return res.status(403).json({
        error: "Subscription inactive",
        code: "SUBSCRIPTION_INACTIVE",
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({ error: "Internal server error during subscription check." });
  }
};
