import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { z } from "zod";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Validation schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["USER", "MANAGER", "COACH", "ADMIN"]).default("USER"),
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);

    // Check if user exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return res
        .status(400)
        .json({
          error:
            "Un compte avec cet email existe déjà. Essayez de vous connecter.",
        });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user with default subscription
    const user = (await User.create([
      {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        subscription: { isActive: true, plan: "monthly", activatedAt: new Date() },
        stats: { sessionsCompleted: 0 },
      },
    ] as any)) as IUser[];

    const createdUser = user[0];

    // Generate token
    const token = jwt.sign(
      {
        userId: createdUser._id,
        role: createdUser.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        subscription: createdUser.subscription,
        coursesProgress: createdUser.coursesProgress,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return res.status(400).json({
        error: "Données invalides",
        details: fieldErrors,
      });
    }
    console.error("Register error:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de l'inscription. Veuillez réessayer." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const validatedData = LoginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      return res
        .status(401)
        .json({ error: "Aucun compte trouvé avec cet email." });
    }

    if (!user.password) {
      return res
        .status(401)
        .json({
          error: "Ce compte utilise une méthode de connexion différente.",
        });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      validatedData.password,
      user.password
    );
    if (!isValidPassword) {
      return res.status(401).json({ error: "Mot de passe incorrect." });
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        avatarUrl: user.avatarUrl,
        coursesProgress: user.coursesProgress,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Données invalides",
        details: error.issues,
      });
    }
    console.error("Login error:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la connexion. Veuillez réessayer." });
  }
});

import { authenticateToken } from "../middleware/auth";

// POST /api/auth/change-password
router.post("/change-password", authenticateToken, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current and new password are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({ error: "User has no password set" });
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid current password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to update password" });
  }
});

export default router;
