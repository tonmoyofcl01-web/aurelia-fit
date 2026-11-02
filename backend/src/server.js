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
const port = process.env.PORT || 5000;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});
app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/register', rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please try again later.' },
}));
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

/**
 * One-time migration for the original single-gym installation.
 * All records that predate tenant IDs are attached to the existing (oldest)
 * gym workspace. New registrations always create a separate workspace and
 * cannot inherit these records.
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

  const missingTenant = { $or: [{ gym: { $exists: false } }, { gym: null }] };
  const tenantModels = [User, Member, Trainer, MembershipPlan, Membership, Attendance, Payment, WorkoutPlan, Notification];
  for (const TenantModel of tenantModels) {
    await TenantModel.updateMany(missingTenant, { $set: { gym: legacyGym._id } });
  }
  return legacyGym;
}

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from backend/.env.');
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
  } else {
    console.warn('OWNER_EMAIL or OWNER_PASSWORD is missing; no initial owner was created.');
  }

  app.listen(port, () => console.log(`Aurelia Fit API running on port ${port}`));
}

start().catch((error) => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
