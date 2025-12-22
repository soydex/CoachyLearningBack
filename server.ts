import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dbConnect from './lib/db';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// Import models to ensure they are registered with Mongoose
import './models/User';
import './models/Session';
import './models/Course';
import './models/Notification';
import './models/Quote';
import './models/EnergyLog';
import './models/Conversation';
import './models/Message';

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
import messageRoutes from './routes/messages';

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server for Socket.io
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.37:3000'],
    credentials: true,
    methods: ["GET", "POST"]
  }
});

// Make io available in routes
app.set('io', io);

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
app.use('/api/messages', messageRoutes);
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

// Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    (socket as any).user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id, 'User:', (socket as any).user?.userId);

  // Join user to their own room for personal notifications/messages
  // Using user ID as room name is common for 1-to-1 or user-specific events
  /*
     Note: In Conversation logic, we emit to "conversationId".
     But initially or for notifications we might want to emit to userId.
     
     In messages.ts I did: `io.to(conversation._id.toString()).emit('new_message', message);`
     
     So we MUST ensure clients join the conversation rooms they are part of.
     A simple way is to let client emit "join_conversation" event.
  */

  socket.on('join_conversation', (conversationId) => {
    // TODO: Verify user is participant
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

async function startServer() {
  try {
    console.log(process.env.NODE_ENV);
    console.log('🚀 Starting server...');
    if (!process.env.MONGODB_URI) {
      throw new Error('Missing MONGODB_URI environment variable');
    }
    else if (!process.env.JWT_SECRET) {
      throw new Error('Missing JWT_SECRET environment variable');
    }
    else if (!process.env.AUTH_SECRET) {
      throw new Error('Missing AUTH_SECRET environment variable');
    }
    console.log('✅ All environment variables are set');

    await dbConnect();
    console.log('✅ Connected to MongoDB');

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Explorer available at http://localhost:${PORT}/api-explorer`);
      console.log(`⚡ Socket.io enabled`);
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