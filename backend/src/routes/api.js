import { Router } from 'express';
import { allowRoles, protect } from '../middleware/auth.js';
import { changePassword, login, logout, me, updateProfile } from '../controllers/authController.js';
import * as controller from '../controllers/resourceController.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', app: 'Aurelia Fit API' }));
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/me', protect, me);
router.patch('/auth/password', protect, changePassword);
router.patch('/auth/profile', protect, updateProfile);

router.use(protect);
router.get('/dashboard', allowRoles('owner', 'admin', 'receptionist', 'trainer'), controller.dashboard);

const routes = [
  ['members', 'members'],
  ['trainers', 'trainers'],
  ['plans', 'plans'],
  ['memberships', 'memberships'],
  ['attendance', 'attendance'],
  ['payments', 'payments'],
  ['workouts', 'workouts'],
];

for (const [path, key] of routes) {
  const allowedRoles = controller.roles[key];
  const readableRoles = controller.readRoles[key];
  router.get(`/${path}`, allowRoles(...readableRoles), controller.listResource(key));
  router.post(`/${path}`, allowRoles(...allowedRoles), controller.createResource(key));
  router.patch(`/${path}/:id`, allowRoles(...allowedRoles), controller.updateResource(key));
  router.delete(`/${path}/:id`, allowRoles('owner', 'admin'), controller.deleteResource(key));
}

router.patch('/attendance/checkout/:memberId', allowRoles('owner', 'admin', 'receptionist', 'trainer'), controller.checkOut);
router.get('/reports', allowRoles('owner', 'admin'), controller.reports);
router.get('/settings', allowRoles('owner', 'admin'), controller.getSettings);
router.patch('/settings', allowRoles('owner', 'admin'), controller.updateSettings);
router.get('/notifications', allowRoles('owner', 'admin', 'receptionist', 'trainer'), controller.listNotifications);
router.patch('/notifications/:id/read', allowRoles('owner', 'admin', 'receptionist', 'trainer'), controller.markNotification);

export default router;
