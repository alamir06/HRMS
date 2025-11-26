import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import pool from "./config/database.js";
import path from "path";
//By Group1:Routes
import appRouter from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

//By Group1:Make Database Pool Available Globally
app.locals.pool = pool;

//By Group1:Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

//By Group1:Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

//By Group1:Request logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

//By Group1:Main Routes
app.use('/api', appRouter);

//By Group1:Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT 1 as test');
    connection.release();
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'Connected',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'Error', 
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message 
    });
  }
});

//By Group1:API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'HRMS API',
    version: '1.0.0',
    description: 'Human Resource Management System API',
    endpoints: {
      auth: '/api/auth',
      employees: '/api/employees',
      attendance: '/api/attendance',
      leave: '/api/leave'
    },
    documentation: '/api-docs'
  });
});

//By Group1:Error handling middleware (AFTER routes)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
});

//By Group1:404 handler (LAST middleware)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    message: 'The requested endpoint does not exist'
  });
});

//By Group1:Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

//By Group1:Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server gracefully...');
  await pool.end();
  console.log('Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Server terminated');
  await pool.end();
  process.exit(0);
});

//By Group1:Start server
async function startServer() {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Cannot start server without database connection');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`HRMS Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API Base URL: http://localhost:${PORT}/api`);
    console.log(`Started at: ${new Date().toISOString()}`);
  });
}

//By Group1:Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

//By Group1:Start the application
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
