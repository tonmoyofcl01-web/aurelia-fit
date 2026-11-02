import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Gym, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
});

const publicUser = async (user) => {
  const gym = user.gym ? await Gym.findById(user.gym).select('name') : null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    gym: gym ? { id: gym._id, name: gym.name } : null,
    gymName: gym?.name || 'Aurelia Fit',
  };
};

const createSession = async (user, res) => {
  const token = jwt.sign(
    { id: user._id, gym: user.gym },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
  res.cookie('aurelia_token', token, cookieOptions());
  return publicUser(user);
};

export const register = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const gymName = String(req.body?.gymName || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').trim();
  const password = String(req.body?.password || '');

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ message: 'Your name must be between 2 and 80 characters.' });
  }
  if (gymName.length < 2 || gymName.length > 100) {
    return res.status(400).json({ message: 'Gym name must be between 2 and 100 characters.' });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (phone.length > 30) {
    return res.status(400).json({ message: 'Phone number must be 30 characters or fewer.' });
  }
  if (password.length < 10 || password.length > 128) {
    return res.status(400).json({ message: 'Password must be between 10 and 128 characters.' });
  }

  if (await User.exists({ email })) {
    return res.status(409).json({ message: 'An account with this email already exists. Sign in instead.' });
  }

  let gym;
  let createdUser;
  try {
    gym = await Gym.create({ name: gymName, email, phone: phone || undefined, currency: 'BDT' });
    createdUser = await User.create({
      name,
      email,
      phone: phone || undefined,
      password: await bcrypt.hash(password, 12),
      role: 'owner',
      active: true,
      gym: gym._id,
    });
    const safeUser = await createSession(createdUser, res);
    return res.status(201).json({ message: 'Your gym workspace has been created.', user: safeUser });
  } catch (error) {
    if (createdUser?._id) await User.findByIdAndDelete(createdUser._id).catch(() => {});
    if (gym?._id) await Gym.findByIdAndDelete(gym._id).catch(() => {});
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists. Sign in instead.' });
    }
    throw error;
  }
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
  if (!user.gym) {
    return res.status(403).json({ message: 'This account is not connected to a gym workspace. Contact support.' });
  }

  const safeUser = await createSession(user, res);
  res.json({ user: safeUser });
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

export const me = asyncHandler(async (req, res) => {
  res.json({ user: await publicUser(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!currentPassword || newPassword.length < 10 || newPassword.length > 128) {
    return res.status(400).json({ message: 'Provide your current password and a new password of 10–128 characters.' });
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

  const user = await User.findOne({ _id: req.user._id, gym: req.user.gym });
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

  res.json({ message: 'Profile updated.', user: await publicUser(user) });
});
