# Coach y Média Backend API

Backend API REST pour Coach y Média V2 - Construit avec Bun, TypeScript, Express.js et MongoDB.

## 🚀 Démarrage rapide

### Prérequis
- [Bun](https://bun.sh/) installé
- MongoDB local installé et démarré

### Installation
```bash
cd Back
bun install
```

### Configuration
1. Copiez le fichier `.env.example` vers `.env`
2. Modifiez la connexion MongoDB si nécessaire (par défaut: `mongodb://localhost:27017/coachy_db`)

### Lancement
```bash
bun run server.ts
```

Le serveur démarrera sur `http://localhost:3001`

## 📚 API Explorer

Une interface web interactive est disponible pour explorer et tester l'API :

**URL :** `http://localhost:3001/api-explorer`

Cette interface permet de :
- Voir toutes les routes API avec leurs méthodes HTTP
- Tester les endpoints directement depuis le navigateur
- Voir les réponses en temps réel

## 📋 Routes API

### Utilisateurs (`/api/users`)
- `GET /api/users` - Liste tous les utilisateurs (pagination supportée)
- `GET /api/users/:id` - Récupère un utilisateur par ID
- `POST /api/users` - Crée un nouvel utilisateur
- `PUT /api/users/:id` - Met à jour un utilisateur
- `DELETE /api/users/:id` - Supprime un utilisateur
- `GET /api/users/stats/overview` - Statistiques des utilisateurs

### Organisations (`/api/organizations`)
- `GET /api/organizations` - Liste toutes les organisations
- `GET /api/organizations/:id` - Récupère une organisation par ID
- `POST /api/organizations` - Crée une nouvelle organisation
- `PUT /api/organizations/:id` - Met à jour une organisation
- `DELETE /api/organizations/:id` - Supprime une organisation
- `GET /api/organizations/stats/overview` - Statistiques des organisations

### Capsules (`/api/capsules`)
- `GET /api/capsules` - Liste toutes les capsules
- `GET /api/capsules/:id` - Récupère une capsule par ID
- `POST /api/capsules` - Crée une nouvelle capsule
- `PUT /api/capsules/:id` - Met à jour une capsule
- `DELETE /api/capsules/:id` - Supprime une capsule
- `POST /api/capsules/:id/transactions` - Ajoute une transaction à une capsule
- `GET /api/capsules/stats/overview` - Statistiques des capsules

### Sessions (`/api/sessions`)
- `GET /api/sessions` - Liste toutes les sessions
- `GET /api/sessions/:id` - Récupère une session par ID
- `POST /api/sessions` - Crée une nouvelle session
- `PUT /api/sessions/:id` - Met à jour une session
- `DELETE /api/sessions/:id` - Supprime une session
- `POST /api/sessions/:id/assessments` - Ajoute une évaluation à une session
- `GET /api/sessions/stats/overview` - Statistiques des sessions

## 🔧 Fonctionnalités

### Validation
Toutes les routes utilisent Zod pour la validation des données entrantes.

### Pagination
Les routes GET supportent la pagination avec les paramètres :
- `page` : numéro de page (défaut: 1)
- `limit` : nombre d'éléments par page (défaut: 10)

### Population
Les relations MongoDB sont automatiquement populées pour un accès facile aux données liées.

### Gestion d'erreurs
Gestion complète des erreurs avec messages appropriés.

## 🗃️ Modèles de données

### User
```typescript
{
  organizationId: ObjectId,
  email: string,
  name: string,
  role: 'USER' | 'MANAGER' | 'COACH' | 'ADMIN',
  password?: string,
  legacyWPHash?: string,
  coachProfile: object,
  stats: {
    sessionsCompleted: number,
    lastAssessmentDate?: Date
  }
}
```

### Organization
```typescript
{
  name: string,
  settings: object
}
```

### Capsule
```typescript
{
  organizationId: ObjectId,
  name: string,
  totalHoursInitial: number,
  remainingHours: number,
  status: 'ACTIVE' | 'EXPIRED',
  expirationDate: Date,
  history: [{
    action: 'DEBIT' | 'CREDIT',
    amount: number,
    date: Date,
    userId: ObjectId,
    reason: string
  }]
}
```

### Session
```typescript
{
  capsuleId: ObjectId,
  coachId: ObjectId,
  attendees: ObjectId[],
  startTime: Date,
  endTime: Date,
  duration: number,
  status: 'SCHEDULED' | 'COMPLETED',
  videoUrl: string,
  assessments: [{
    raterId: ObjectId,
    targetId: ObjectId,
    leadership: number,
    communication: number,
    adaptability: number,
    emotionalInt: number,
    comment: string
  }]
}
```

## 🧪 Test de l'API

Utilisez l'API Explorer intégré ou des outils comme Postman/cURL :

```bash
# Test de santé
curl http://localhost:3001/health

# Créer une organisation
curl -X POST http://localhost:3001/api/organizations \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Test Organization"}'

# Lister les utilisateurs
curl http://localhost:3001/api/users
```

## 📊 Statistiques

Chaque ressource dispose d'un endpoint `/stats/overview` pour obtenir des statistiques générales.

## 🔒 Sécurité

- Validation des données avec Zod
- Sanitisation des entrées
- Gestion des erreurs sécurisée
- Headers de sécurité avec Helmet

---

**Interface web disponible :** `http://localhost:3001/api-explorer`