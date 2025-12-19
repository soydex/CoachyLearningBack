import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dbConnect from './lib/db';

// Import models to ensure they are registered with Mongoose
import './models/User';
import './models/Session';
import './models/Course';
import './models/Notification';
import './models/Quote';
import './models/EnergyLog';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import sessionRoutes from './routes/sessions';
import courseRoutes from './routes/courses';
import notificationRoutes from './routes/notifications';
import statisticsRoutes from './routes/statistics';
import feedbackRoutes from './routes/feedback';
import apiExplorerRoutes from './routes/api-explorer';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import quoteRoutes from './routes/quotes';
import energyRoutes from './routes/energy';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.37:3000'],
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: false, // Disable CORP to allow cross-origin resource sharing
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));
// SECURITY: Custom morgan format to prevent JWT token leakage in logs
morgan.token('sanitized-auth', (req: any) =>
  req.headers.authorization ? '[REDACTED]' : '-'
);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms - auth: :sanitized-auth'));
app.use(express.json({ limit: '10mb' })); // SECURITY: Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// SECURITY: Rate limiting to prevent brute force and DoS attacks
import rateLimit from 'express-rate-limit';

// Strict limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for registration 
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: { error: 'Trop d\'inscriptions. Réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Trop de requêtes. Veuillez ralentir.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Serve static files
app.use(express.static('public'));

// SECURITY: Apply rate limiters
app.use('/api', apiLimiter); // General limit on all API routes

// Routes with specific limiters for auth
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/energy-logs', energyRoutes);
app.use('/api-explorer', apiExplorerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Coach y Média API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      courses: '/api/courses',
      sessions: '/api/sessions',
      feedback: '/api/feedback',
      apiExplorer: '/api-explorer'
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    await dbConnect();
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Explorer available at http://localhost:${PORT}/api-explorer`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;