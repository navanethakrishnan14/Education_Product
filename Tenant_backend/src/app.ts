import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth.routes';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());

// Always allow the common local Vite origins; additional origins can be configured
// with a comma-separated CORS_ORIGIN value in the backend .env file.
const localOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const origins = new Set([...localOrigins, ...configuredOrigins]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.has('*') || origins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 204,
}));

// Explicitly finish browser preflight requests before routes are evaluated.
app.options('*', cors({
  origin(origin, callback) {
    if (!origin || origins.has('*') || origins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: '20kb' }));

app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'tenant-backend', status: 'healthy' });
});

app.use('/api/v1/auth', authRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Error && err.message === 'Origin is not allowed by CORS') {
    return res.status(403).json({ success: false, message: err.message });
  }
  console.error(err);
  return res.status(500).json({ success: false, message: 'Internal server error.' });
});
