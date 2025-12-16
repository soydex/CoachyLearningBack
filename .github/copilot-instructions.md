# CoachyLearning Copilot Instructions

## Project Context
This is a monorepo for an e-learning platform ("CoachyLearning") consisting of a Next.js frontend and a Bun/Express backend.

- **Root**: `/Users/tristansimon-derouard/Documents/elearning/CoachyLearning`
- **Frontend**: `./Front` (Next.js 15, React 19, Tailwind CSS v4)
- **Backend**: `./Back` (Bun, Express, MongoDB, Mongoose)

## Frontend Guidelines (`./Front`)

### Architecture & Patterns
- **Framework**: Next.js 15 (App Router). Use `src/app` for pages and layouts.
- **Styling**: Tailwind CSS v4. Use utility classes.
- **Icons**: `lucide-react`.
- **Charts**: `recharts`.
- **State Management**: React Context (e.g., `src/context/NotificationContext.tsx`) for global state; local state for components.
- **API Integration**: Centralize `fetch` calls in `src/services/api.ts`. Do not make raw `fetch` calls in components.
- **Types**: Define shared interfaces in `src/types.ts`.

### Coding Standards
- **Linting/Formatting**: Use `biome` (configured in `biome.json`). Run `bun run lint` or `bun run format`.
- **Components**: Functional components with TypeScript interfaces for props.
- **Data Fetching**: Use `useEffect` for client-side fetching in components (as seen in `src/app/page.tsx`). Handle loading and error states.

## Backend Guidelines (`./Back`)

### Architecture & Patterns
- **Runtime**: Bun.
- **Server**: Express.js. Entry point is `server.ts`.
- **Database**: MongoDB with Mongoose. Connection logic in `lib/db.ts`.
- **Models**: Mongoose schemas in `models/`.
  - **Validation**: Define Zod schemas alongside Mongoose schemas for runtime validation (e.g., `CapsuleZod` in `models/Capsule.ts`).
- **Routes**: Express routers in `routes/`. Register them in `server.ts`.

### Key Models
- `User`: Roles (USER, MANAGER, COACH, ADMIN).
- `Organization`: Settings and configuration.
- `Capsule`: Credit system with transaction history.
- `Session`: Coaching sessions with assessments.
- `Course`: E-learning content structure (Modules -> Lessons/Quizzes).
- `Notification`: User notifications.

### Development Workflow
- **Start Server**: `bun run dev` (runs `server.ts`).
- **Seed Database**: `bun run seed` (runs `seed.ts`). **Run this after changing models.**
- **API Explorer**: Available at `/api-explorer` when server is running.

## Common Workflows

### Adding a New Feature
1.  **Backend**:
    - Create/Update Mongoose model in `Back/models/`.
    - Add Zod validation.
    - Create route in `Back/routes/`.
    - Register route in `Back/server.ts`.
    - Update `Back/seed.ts` with mock data.
2.  **Frontend**:
    - Update types in `Front/src/types.ts`.
    - Add fetch function in `Front/src/services/api.ts`.
    - Create/Update components in `Front/src/components/`.

### Debugging
- **CORS**: Configured in `Back/server.ts` to allow `http://localhost:3000`.
- **Database**: Check `Back/lib/db.ts` for connection issues.
