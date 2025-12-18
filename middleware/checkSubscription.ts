import { Request, Response, NextFunction } from "express";
import User from "../models/User";

interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

/**
 * Middleware to check if the user has an active subscription.
 * Returns 403 if subscription is inactive or expired.
 */
export const checkSubscription = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({
                error: "UNAUTHORIZED",
                message: "Authentification requise.",
            });
        }

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                error: "USER_NOT_FOUND",
                message: "Utilisateur introuvable.",
            });
        }

        // Check if subscription exists and is active
        if (!user.subscription?.isActive) {
            return res.status(403).json({
                error: "SUBSCRIPTION_INACTIVE",
                message: "Votre abonnement n'est pas actif. Contactez-nous pour le réactiver.",
            });
        }

        // Check expiration date if set
        if (
            user.subscription.expirationDate &&
            new Date(user.subscription.expirationDate) < new Date()
        ) {
            return res.status(403).json({
                error: "SUBSCRIPTION_EXPIRED",
                message: "Votre abonnement a expiré. Contactez-nous pour le renouveler.",
            });
        }

        next();
    } catch (error) {
        console.error("Subscription check error:", error);
        res.status(500).json({
            error: "SERVER_ERROR",
            message: "Erreur lors de la vérification de l'abonnement.",
        });
    }
};
