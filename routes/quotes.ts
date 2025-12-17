import express from "express";
import Quote from "../models/Quote";

const router = express.Router();

// Get a random quote
router.get("/random", async (req, res) => {
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

// Seed initial quotes (internal use or one-time setup)
router.post("/seed", async (req, res) => {
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
