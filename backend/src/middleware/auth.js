import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.aurelia_token || (
    req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null
  );

  if (!token) return res.status(401).json({ message: 'Please sign in.' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.active) {
    return res.status(401).json({ message: 'Account unavailable.' });
  }

  req.user = user;
  next();
});

export const allowRoles = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }
  next();
};
