# Coach y Média Backend

Backend minimal pour Coach y Média V2 utilisant Bun + TypeScript + MongoDB.

## Installation

```bash
cd CoachyLearning/Back
bun install
```

## Configuration

1. Copiez `.env.example` vers `.env` et remplissez les variables :
   ```bash
   cp .env.example .env
   ```

2. Assurez-vous d'avoir une instance MongoDB (locale ou Atlas).

## Modèles de Données

- **User** : Utilisateurs avec rôles (USER, MANAGER, COACH, ADMIN), sécurité (bcrypt/phpass), stats.
- **Organization** : Organisations avec settings.
- **Capsule** : Crédits d'heures avec historique atomique des transactions.
- **Session** : Sessions de coaching avec évaluations radar.

Schemas embedded :
- **UserStats** : Stats utilisateur.
- **Transaction** : Historique des débits/crédits.
- **Assessment** : Évaluations avec scores 0-10 pour leadership, communication, etc.

## Lancement

```bash
bun run dev
```

## Structure

```
Back/
├── index.ts          # Point d'entrée
├── lib/
│   └── db.ts         # Connexion MongoDB singleton
├── models/
│   ├── User.ts
│   ├── Organization.ts
│   ├── Capsule.ts
│   └── Session.ts
├── package.json
├── .env.example
└── README.md
```