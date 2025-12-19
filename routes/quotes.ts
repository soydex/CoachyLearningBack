import express from "express";
import Quote from "../models/Quote";
import { authenticateToken, requireRole, requireActiveSubscription, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Get all quotes (requires active subscription)
router.get("/", authenticateToken, requireActiveSubscription, async (req: any, res) => {
  try {
    const quotes = await Quote.find().sort({ _id: -1 });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching quotes", error });
  }
});

// Get a random quote (requires active subscription)
router.get("/random", authenticateToken, requireActiveSubscription, async (req: any, res) => {
  try {
    const count = await Quote.countDocuments();
    const random = Math.floor(Math.random() * count);
    const quote = await Quote.findOne().skip(random);

    if (!quote) {
      return res.status(404).json({ message: "No quotes found" });
    }

    res.json(quote);
  } catch (error) {
    res.status(500).json({ message: "Error fetching quote", error });
  }
});

// Create a new quote (ADMIN only)
router.post("/", authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { text, author } = req.body;
    if (!text || !author) {
      return res.status(400).json({ message: "Text and author are required" });
    }
    const newQuote = new Quote({ text, author });
    await newQuote.save();
    res.status(201).json(newQuote);
  } catch (error) {
    res.status(500).json({ message: "Error creating quote", error });
  }
});

// Update a quote (ADMIN only)
router.put("/:id", authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { text, author } = req.body;
    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { text, author },
      { new: true, runValidators: true }
    );
    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }
    res.json(quote);
  } catch (error) {
    res.status(500).json({ message: "Error updating quote", error });
  }
});

// Delete a quote (ADMIN only)
router.delete("/:id", authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const quote = await Quote.findByIdAndDelete(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }
    res.json({ message: "Quote deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting quote", error });
  }
});

// Seed initial quotes (ADMIN only - internal use)
// SECURITY: Disable in production or remove entirely
router.post("/seed", authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: "Seed endpoint disabled in production" });
  }

  try {
    const quotes = [
      {
        text: "L'apprentissage est la seule chose que l'esprit n'épuise jamais, ne craint jamais et ne regrette jamais.",
        author: "Léonard de Vinci"
      },
      {
        text: "L'éducation est l'arme la plus puissante qu'on puisse utiliser pour changer le monde.",
        author: "Nelson Mandela"
      },
      {
        text: "Investir dans le savoir rapporte toujours les meilleurs intérêts.",
        author: "Benjamin Franklin"
      },
      {
        text: "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.",
        author: "Sénèque"
      },
      {
        text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.",
        author: "Steve Jobs"
      }
    ];

    await Quote.deleteMany({}); // Clear existing
    await Quote.insertMany(quotes);

    res.json({ message: "Quotes seeded successfully", count: quotes.length });
  } catch (error) {
    res.status(500).json({ message: "Error seeding quotes", error });
  }
});

export default router;
