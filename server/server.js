import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDBStatus } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import configRoutes from './routes/configRoutes.js';
import planRoutes from './routes/planRoutes.js';
import studentPortalRoutes from './routes/studentPortalRoutes.js';
import janmashtamiRoutes from './routes/janmashtamiRoutes.js';
import cardRoutes from './routes/cardRoutes.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Security & Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow localhost, Firebase Hosting, and Render domains
    const allowed = [
      'localhost',
      '127.0.0.1',
      'web.app',
      'firebaseapp.com',
      'onrender.com'
    ];
    const isAllowed = allowed.some(domain => origin.includes(domain));
    if (isAllowed || origin.startsWith('http://') || origin.startsWith('https://')) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'bypass-tunnel-reminder', 'Accept', 'Origin']
}));

app.use(express.json({ limit: '10mb' }));

// Health & Database Connection Diagnostic Endpoint
app.get('/api/status', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    success: true,
    application: "Krishna Kripa — Bhagavad Gita Attendance Management",
    timestamp: new Date().toISOString(),
    database: {
      type: "MongoDB Atlas",
      ...dbStatus
    }
  });
});

// Mount Authenticated API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/config', configRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/student/portal', studentPortalRoutes);
app.use('/api/janmashtami', janmashtamiRoutes);
app.use('/api/id-card', cardRoutes);

// 404 Handler for unhandled API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found.`
  });
});

// Safe Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Backend Server Error]', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'An internal server error occurred.' 
      : (err.message || 'Server error')
  });
});

// Start Express Server and Connect to MongoDB Atlas
app.listen(PORT, async () => {
  console.log(`\x1b[35m[Krishna Kripa Backend]\x1b[0m Server running on http://127.0.0.1:${PORT}`);
  
  // Connect to Atlas
  const connected = await connectDB();
  if (connected) {
    console.log("\x1b[32m[Krishna Kripa Backend]\x1b[0m MongoDB Atlas connected. Ready for authentic production requests.");
  } else {
    console.warn("\x1b[33m[Notice]\x1b[0m Waiting for valid MONGODB_URI in .env to connect to MongoDB Atlas.");
  }
});
