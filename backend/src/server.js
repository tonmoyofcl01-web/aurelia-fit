import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import api from './routes/api.js';
import { notFound, errorHandler } from './middleware/error.js';
import {
  Attendance,
  Gym,
  Member,
  Membership,
  MembershipPlan,
  Notification,
  Payment,
  Trainer,
  User,
  WorkoutPlan,
} from './models/index.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
}));
app.use('/api/auth/register', rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please try again later.' },
}));

/**
 * One-time migration for the original single-gym installation.
 * Existing records without a gym are assigned to the original (oldest) gym.
 * This is idempotent and runs before any API route is handled.
 */
async function ensureLegacyWorkspace() {
  let legacyGym = await Gym.findOne().sort({ createdAt: 1 });

  if (!legacyGym) {
    legacyGym = await Gym.create({
      name: process.env.GYM_NAME || 'Aurelia Fit',
      email: process.env.OWNER_EMAIL || undefined,
      currency: 'BDT',
    });
  }

  const missingTenant = {
    $or: [{ gym: { $exists: false } }, { gym: null }],
  };
  const tenantModels = [
    User,
    Member,
    Trainer,
    MembershipPlan,
    Membership,
    Attendance,
    Payment,
    WorkoutPlan,
    Notification,
  ];

  for (const TenantModel of tenantModels) {
    await TenantModel.updateMany(missingTenant, { $set: { gym: legacyGym._id } });
  }

  return legacyGym;
}

let initializationPromise;

/**
 * Initialize MongoDB and the legacy workspace exactly once per runtime.
 * The promise is shared by concurrent requests and reset after a failure so
 * a later invocation can retry instead of keeping a permanently rejected promise.
 */
export async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing from the backend environment.');
      }
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must contain at least 32 characters.');
      }

      await connectDB();
      const legacyGym = await ensureLegacyWorkspace();

      if (process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD) {
        const email = process.env.OWNER_EMAIL.toLowerCase();
        const existingOwner = await User.findOne({ email });

        if (!existingOwner) {
          await User.create({
            name: process.env.OWNER_NAME || 'Gym Owner',
            email,
            password: await bcrypt.hash(process.env.OWNER_PASSWORD, 12),
            role: 'owner',
            gym: legacyGym._id,
          });
          console.log('Initial owner account created. Change its password after login.');
        } else if (!existingOwner.gym) {
          existingOwner.gym = legacyGym._id;
          await existingOwner.save();
        }
      }

      return legacyGym;
    })().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }

  return initializationPromise;
}

// Vercel invokes the exported Express app per request. Ensure DB setup is
// complete before health checks, login, registration, or protected API routes.
app.use(async (_req, _res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

// Vercel's Express runtime needs the app export. Local development starts the
// listener from bootstrap.js instead, so there is no double-listen conflict.
export default app;
