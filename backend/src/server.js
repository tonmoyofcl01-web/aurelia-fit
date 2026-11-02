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
import { User } from './models/index.js';

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

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from backend/.env.');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }

  await connectDB();

  if (process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD) {
    const email = process.env.OWNER_EMAIL.toLowerCase();
    const existingOwner = await User.findOne({ email });

    if (!existingOwner) {
      await User.create({
        name: process.env.OWNER_NAME || 'Gym Owner',
        email,
        password: await bcrypt.hash(process.env.OWNER_PASSWORD, 12),
        role: 'owner',
      });
      console.log('Initial owner account created. Change its password after login.');
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
