import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
});

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.active || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
  res.cookie('aurelia_token', token, cookieOptions());
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

export const logout = (_req, res) => {
  res.clearCookie('aurelia_token', {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
  });
  res.json({ message: 'Signed out.' });
};

export const me = (req, res) =>
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone,
    },
  });

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!currentPassword || newPassword.length < 10) {
    return res.status(400).json({ message: 'Provide your current password and a new password of at least 10 characters.' });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ message: 'Password updated. Your current session remains active.' });
});


export const updateProfile = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').trim();

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Provide a valid email address.' });
  }
  if (phone.length > 30) {
    return res.status(400).json({ message: 'Phone number must be 30 characters or fewer.' });
  }

  const user = await User.findById(req.user._id);
  if (!user || !user.active) {
    return res.status(404).json({ message: 'Account not found or inactive.' });
  }

  user.name = name;
  user.email = email;
  user.phone = phone;

  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ message: 'That email address is already in use.' });
    }
    throw error;
  }

  res.json({
    message: 'Profile updated.',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
    },
  });
});
