import {
  Attendance,
  Gym,
  Member,
  Membership,
  MembershipPlan,
  Notification,
  Payment,
  Trainer,
  WorkoutPlan,
} from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const configs = {
  members: { model: Member, search: ['name', 'email', 'phone', 'memberId'] },
  trainers: { model: Trainer, search: ['name', 'email', 'phone', 'specialization'] },
  plans: { model: MembershipPlan, search: ['name', 'description'] },
  memberships: { model: Membership, search: [], populate: ['member', 'plan', 'trainer'] },
  attendance: { model: Attendance, search: [], populate: ['member'] },
  payments: { model: Payment, search: [], populate: ['member', 'membership'] },
  workouts: { model: WorkoutPlan, search: [], populate: ['member', 'trainer'] },
};

export const readRoles = {
  members: ['owner', 'admin', 'receptionist', 'trainer'],
  trainers: ['owner', 'admin', 'receptionist', 'trainer'],
  plans: ['owner', 'admin', 'receptionist'],
  memberships: ['owner', 'admin', 'receptionist'],
  attendance: ['owner', 'admin', 'receptionist', 'trainer'],
  payments: ['owner', 'admin', 'receptionist'],
  workouts: ['owner', 'admin', 'trainer'],
};

export const roles = {
  members: ['owner', 'admin', 'receptionist'],
  trainers: ['owner', 'admin'],
  plans: ['owner', 'admin'],
  memberships: ['owner', 'admin', 'receptionist'],
  attendance: ['owner', 'admin', 'receptionist', 'trainer'],
  payments: ['owner', 'admin', 'receptionist'],
  workouts: ['owner', 'admin', 'trainer'],
};

const editableFields = {
  members: ['name', 'email', 'phone', 'gender', 'dateOfBirth', 'address', 'emergencyContact', 'status', 'notes'],
  trainers: ['name', 'email', 'phone', 'specialization', 'experience', 'status'],
  plans: ['name', 'durationMonths', 'price', 'description', 'features', 'active'],
  memberships: ['member', 'plan', 'startDate', 'amount', 'trainer', 'status'],
  payments: ['member', 'membership', 'amount', 'method', 'status', 'reference', 'note'],
  workouts: ['title', 'member', 'trainer', 'startDate', 'endDate', 'days', 'notes'],
};

const pick = (source, allowed) =>
  Object.fromEntries(allowed.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));

const tenant = (req) => ({ gym: req.gymId });
const notFound = (message = 'Record not found in this gym workspace.') => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};
const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const bangladeshDate = (value = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);

const addMonths = (dateValue, months) => {
  const start = new Date(dateValue);
  const day = start.getDate();
  start.setDate(1);
  start.setMonth(start.getMonth() + months);
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  start.setDate(Math.min(day, lastDay));
  return start;
};

const buildMembershipDates = async (payload, gymId) => {
  const [plan, member] = await Promise.all([
    MembershipPlan.findOne({ _id: payload.plan, gym: gymId }),
    Member.findOne({ _id: payload.member, gym: gymId }),
  ]);
  if (!plan || !plan.active) throw badRequest('Select an active membership plan from your workspace.');
  if (!member || member.status !== 'active') throw badRequest('Select an active member from your workspace.');

  const startDate = new Date(payload.startDate);
  if (Number.isNaN(startDate.getTime())) throw badRequest('Enter a valid membership start date.');
  payload.startDate = startDate;
  payload.endDate = addMonths(startDate, plan.durationMonths);
  payload.amount = payload.amount === undefined || payload.amount === '' ? plan.price : Number(payload.amount);
  if (!Number.isFinite(payload.amount) || payload.amount < 0) throw badRequest('Enter a valid membership amount.');
  return payload;
};

const validateOptionalTrainer = async (trainerId, gymId) => {
  if (!trainerId) return;
  const trainer = await Trainer.findOne({ _id: trainerId, gym: gymId, status: 'active' });
  if (!trainer) throw badRequest('Select an active trainer from your workspace.');
};

export const listResource = (key) =>
  asyncHandler(async (req, res) => {
    const config = configs[key];
    if (!config) return res.status(404).json({ message: 'Resource not found.' });

    // Every list query begins with the authenticated user's workspace.
    const filter = tenant(req);
    if (req.query.status && ['members', 'trainers', 'memberships'].includes(key)) {
      filter.status = req.query.status;
    }
    if (key === 'plans' && req.query.active !== undefined) {
      filter.active = req.query.active === 'true';
    }

    if (req.query.search) {
      const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const expression = new RegExp(escaped, 'i');
      if (config.search.length) {
        filter.$or = config.search.map((field) => ({ [field]: expression }));
      } else if (['memberships', 'attendance', 'payments', 'workouts'].includes(key)) {
        const scoped = { gym: req.gymId };
        const [memberIds, trainerIds, planIds] = await Promise.all([
          Member.find({ ...scoped, $or: [{ name: expression }, { memberId: expression }] }).distinct('_id'),
          Trainer.find({ ...scoped, name: expression }).distinct('_id'),
          MembershipPlan.find({ ...scoped, name: expression }).distinct('_id'),
        ]);
        if (key === 'memberships') {
          filter.$or = [
            { member: { $in: memberIds } },
            { trainer: { $in: trainerIds } },
            { plan: { $in: planIds } },
          ];
        } else if (key === 'attendance') {
          filter.member = { $in: memberIds };
        } else if (key === 'payments') {
          filter.$or = [
            { member: { $in: memberIds } },
            { reference: expression },
            { method: expression },
          ];
        } else {
          filter.$or = [
            { member: { $in: memberIds } },
            { trainer: { $in: trainerIds } },
            { title: expression },
            { notes: expression },
          ];
        }
      }
    }

    if (key === 'attendance' && req.query.date) filter.date = String(req.query.date);
    if (key === 'payments' && req.query.status) filter.status = req.query.status;

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    let query = config.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    for (const field of config.populate || []) query = query.populate(field);

    const [data, total] = await Promise.all([
      query,
      config.model.countDocuments(filter),
    ]);
    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  });

export const createResource = (key) =>
  asyncHandler(async (req, res) => {
    const config = configs[key];
    if (!config) return res.status(404).json({ message: 'Resource not found.' });
    const payload = key === 'attendance'
      ? pick(req.body || {}, ['member'])
      : pick(req.body || {}, editableFields[key] || []);

    // A client cannot choose or override the tenant ID.
    payload.gym = req.gymId;
    if (key === 'memberships' && !payload.trainer) delete payload.trainer;
    if (key === 'payments' && !payload.membership) delete payload.membership;
    if (key === 'workouts' && !payload.trainer) delete payload.trainer;

    if (key === 'members' && !payload.memberId) {
      payload.memberId = `AF-${Date.now().toString().slice(-8)}`;
    }

    if (key === 'memberships') {
      await buildMembershipDates(payload, req.gymId);
      await validateOptionalTrainer(payload.trainer, req.gymId);
      const overlapping = await Membership.findOne({
        ...tenant(req),
        member: payload.member,
        status: 'active',
        startDate: { $lt: payload.endDate },
        endDate: { $gt: payload.startDate },
      });
      if (overlapping) return res.status(409).json({ message: 'This member already has an active membership during those dates.' });
    }

    if (key === 'payments') {
      const member = await Member.findOne({ _id: payload.member, gym: req.gymId });
      if (!member) throw badRequest('Select a valid member from your workspace.');
      if (payload.membership) {
        const membership = await Membership.findOne({ _id: payload.membership, gym: req.gymId });
        if (!membership || String(membership.member) !== String(payload.member)) {
          throw badRequest('Choose a membership belonging to the selected member in your workspace.');
        }
      }
      payload.status ??= 'paid';
      if (payload.status === 'paid') payload.paidAt = new Date();
      else delete payload.paidAt;
    }

    if (key === 'attendance') {
      const member = await Member.findOne({ _id: payload.member, gym: req.gymId });
      if (!member || member.status !== 'active') throw badRequest('Select an active member from your workspace.');
      const openRecord = await Attendance.findOne({ ...tenant(req), member: member._id, checkOut: null });
      if (openRecord) return res.status(409).json({ message: 'This member is already checked in.' });
      payload.date = bangladeshDate();
      payload.checkIn = new Date();
      payload.checkOut = null;
    }

    if (key === 'workouts') {
      const member = await Member.findOne({ _id: payload.member, gym: req.gymId });
      if (!member) throw badRequest('Select a valid member from your workspace.');
      await validateOptionalTrainer(payload.trainer, req.gymId);
    }

    const doc = await config.model.create(payload);
    res.status(201).json({ data: doc });
  });

export const updateResource = (key) =>
  asyncHandler(async (req, res) => {
    const config = configs[key];
    if (!config) return res.status(404).json({ message: 'Resource not found.' });
    const doc = await config.model.findOne({ _id: req.params.id, gym: req.gymId });
    if (!doc) return res.status(404).json({ message: 'Record not found in this gym workspace.' });

    const payload = pick(req.body || {}, editableFields[key] || []);
    if (key === 'memberships' && payload.trainer === '') delete payload.trainer;
    if (key === 'payments' && payload.membership === '') payload.membership = null;
    if (key === 'workouts' && payload.trainer === '') delete payload.trainer;

    if (key === 'memberships' && (payload.member || payload.plan || payload.startDate)) {
      const combined = {
        member: payload.member || doc.member,
        plan: payload.plan || doc.plan,
        startDate: payload.startDate || doc.startDate,
        amount: payload.amount ?? doc.amount,
      };
      await buildMembershipDates(combined, req.gymId);
      await validateOptionalTrainer(payload.trainer !== undefined ? payload.trainer : doc.trainer, req.gymId);
      const overlapping = await Membership.findOne({
        ...tenant(req),
        _id: { $ne: doc._id },
        member: combined.member,
        status: 'active',
        startDate: { $lt: combined.endDate },
        endDate: { $gt: combined.startDate },
      });
      if (overlapping) return res.status(409).json({ message: 'This member already has an active membership during those dates.' });
      Object.assign(payload, { endDate: combined.endDate, startDate: combined.startDate, amount: combined.amount });
    } else if (key === 'memberships' && payload.trainer !== undefined) {
      await validateOptionalTrainer(payload.trainer, req.gymId);
    }

    if (key === 'payments' && (payload.membership !== undefined || payload.member !== undefined)) {
      const membershipId = payload.membership !== undefined ? payload.membership : doc.membership;
      const memberId = payload.member || doc.member;
      const member = await Member.findOne({ _id: memberId, gym: req.gymId });
      if (!member) throw badRequest('Select a valid member from your workspace.');
      if (membershipId) {
        const membership = await Membership.findOne({ _id: membershipId, gym: req.gymId });
        if (!membership || String(membership.member) !== String(memberId)) {
          throw badRequest('Choose a membership belonging to the selected member in your workspace.');
        }
      }
    }

    if (key === 'payments') {
      if (payload.status !== undefined) {
        if (payload.status === 'paid') {
          payload.paidAt = doc.status === 'paid' ? (doc.paidAt || doc.createdAt || new Date()) : new Date();
        } else {
          payload.paidAt = null;
        }
      } else if (doc.status === 'paid' && !doc.paidAt) {
        payload.paidAt = doc.createdAt || new Date();
      }
    }

    if (key === 'workouts') {
      const memberId = payload.member || doc.member;
      if (!(await Member.exists({ _id: memberId, gym: req.gymId }))) {
        throw badRequest('Select a valid member from your workspace.');
      }
      await validateOptionalTrainer(payload.trainer !== undefined ? payload.trainer : doc.trainer, req.gymId);
    }

    Object.assign(doc, payload);
    await doc.save();
    res.json({ data: doc });
  });

export const deleteResource = (key) =>
  asyncHandler(async (req, res) => {
    const config = configs[key];
    if (!config) return res.status(404).json({ message: 'Resource not found.' });
    const id = req.params.id;
    const doc = await config.model.findOne({ _id: id, gym: req.gymId });
    if (!doc) return res.status(404).json({ message: 'Record not found in this gym workspace.' });

    if (key === 'members') {
      const linked = await Promise.all([
        Membership.exists({ ...tenant(req), member: id }),
        Payment.exists({ ...tenant(req), member: id }),
        Attendance.exists({ ...tenant(req), member: id }),
        WorkoutPlan.exists({ ...tenant(req), member: id }),
      ]);
      if (linked.some(Boolean)) return res.status(409).json({ message: 'This member has history. Mark the member inactive instead of deleting the record.' });
    }
    if (key === 'trainers') {
      const linked = await Promise.all([
        Membership.exists({ ...tenant(req), trainer: id }),
        WorkoutPlan.exists({ ...tenant(req), trainer: id }),
      ]);
      if (linked.some(Boolean)) return res.status(409).json({ message: 'This trainer is assigned to existing records and cannot be deleted.' });
    }
    if (key === 'plans' && (await Membership.exists({ ...tenant(req), plan: id }))) {
      return res.status(409).json({ message: 'This plan is used by existing memberships. Deactivate it instead.' });
    }
    if (key === 'memberships' && (await Payment.exists({ ...tenant(req), membership: id }))) {
      return res.status(409).json({ message: 'This membership has payment history. Keep the record and change its status instead.' });
    }

    await doc.deleteOne();
    res.json({ message: 'Record deleted.' });
  });

export const checkOut = asyncHandler(async (req, res) => {
  const record = await Attendance.findOne({ ...tenant(req), member: req.params.memberId, checkOut: null }).sort({ checkIn: -1 });
  if (!record) return res.status(404).json({ message: 'No active check-in found in this workspace.' });
  record.checkOut = new Date();
  await record.save();
  res.json({ data: record });
});

export const dashboard = asyncHandler(async (req, res) => {
  const gym = tenant(req);
  const now = new Date();
  const today = bangladeshDate(now);
  const [localYear, localMonth] = today.split('-').map(Number);
  const dhakaOffsetMs = 6 * 60 * 60 * 1000;
  const monthStart = new Date(Date.UTC(localYear, localMonth - 1, 1) - dhakaOffsetMs);
  const sixMonthsAgo = new Date(Date.UTC(localYear, localMonth - 6, 1) - dhakaOffsetMs);
  const soon = new Date(new Date(`${today}T23:59:59.999+06:00`).getTime() + 7 * 24 * 60 * 60 * 1000);

  await Membership.updateMany(
    { ...gym, status: 'active', endDate: { $lt: now } },
    { $set: { status: 'expired' } },
  );

  const [
    members,
    activeMembers,
    trainers,
    activeMemberships,
    expiredMemberships,
    expiring,
    attendanceToday,
    pendingPayments,
    revenue,
    monthRevenue,
    membershipStats,
    recentMembers,
    recentPayments,
  ] = await Promise.all([
    Member.countDocuments(gym),
    Member.countDocuments({ ...gym, status: 'active' }),
    Trainer.countDocuments({ ...gym, status: 'active' }),
    Membership.countDocuments({ ...gym, status: 'active', endDate: { $gte: now } }),
    Membership.countDocuments({ ...gym, status: 'expired' }),
    Membership.countDocuments({ ...gym, status: 'active', endDate: { $gte: now, $lte: soon } }),
    Attendance.countDocuments({ ...gym, date: today }),
    Payment.aggregate([
      { $match: { ...gym, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...gym, status: 'paid' } },
      { $addFields: { effectivePaidAt: { $ifNull: ['$paidAt', '$createdAt'] } } },
      { $match: { effectivePaidAt: { $gte: monthStart, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...gym, status: 'paid' } },
      { $addFields: { effectivePaidAt: { $ifNull: ['$paidAt', '$createdAt'] } } },
      { $match: { effectivePaidAt: { $gte: sixMonthsAgo, $lte: now } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$effectivePaidAt', timezone: '+06:00' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
    Membership.aggregate([
      { $match: gym },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Member.find(gym).sort({ createdAt: -1 }).limit(5),
    Payment.find(gym).populate('member', 'name memberId').sort({ createdAt: -1 }).limit(5),
  ]);

  res.json({
    stats: {
      members,
      activeMembers,
      trainers,
      activeMemberships,
      expiredMemberships,
      expiring,
      attendanceToday,
      pendingPayments: pendingPayments[0]?.total || 0,
      monthRevenue: revenue[0]?.total || 0,
    },
    revenue: monthRevenue,
    membershipStats,
    recentMembers,
    recentPayments,
  });
});

export const getSettings = asyncHandler(async (req, res) => {
  const gym = await Gym.findById(req.gymId);
  if (!gym) throw notFound('Gym workspace not found.');
  res.json({ data: gym });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'phone', 'address', 'openingHours', 'currency'];
  const payload = pick(req.body || {}, allowed);
  const gym = await Gym.findById(req.gymId);
  if (!gym) throw notFound('Gym workspace not found.');
  Object.assign(gym, payload);
  await gym.save();
  res.json({ data: gym });
});

export const reports = asyncHandler(async (req, res) => {
  const today = bangladeshDate();
  const localYear = today.slice(0, 4);
  const fromValue = req.query.from || `${localYear}-01-01`;
  const toValue = req.query.to || today;
  const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  if (!isDate(fromValue) || !isDate(toValue)) {
    return res.status(400).json({ message: 'Use valid dates in YYYY-MM-DD format.' });
  }
  const from = new Date(`${fromValue}T00:00:00.000+06:00`);
  const to = new Date(`${toValue}T23:59:59.999+06:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return res.status(400).json({ message: 'Choose a valid reporting date range.' });
  }

  const gym = tenant(req);
  const [revenue, paymentStats, attendance, membershipStats, registrations] = await Promise.all([
    Payment.aggregate([
      { $match: { ...gym, status: 'paid' } },
      { $addFields: { effectivePaidAt: { $ifNull: ['$paidAt', '$createdAt'] } } },
      { $match: { effectivePaidAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$effectivePaidAt', timezone: '+06:00' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Payment.aggregate([
      { $match: gym },
      { $addFields: { reportDate: { $cond: [{ $eq: ['$status', 'paid'] }, { $ifNull: ['$paidAt', '$createdAt'] }, '$createdAt'] } } },
      { $match: { reportDate: { $gte: from, $lte: to } } },
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Attendance.countDocuments({ ...gym, checkIn: { $gte: from, $lte: to } }),
    Membership.aggregate([
      { $match: { ...gym, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Member.countDocuments({ ...gym, createdAt: { $gte: from, $lte: to } }),
  ]);

  res.json({ revenue, paymentStats, attendance, membershipStats, registrations });
});

export const listNotifications = asyncHandler(async (req, res) => {
  res.json({ data: await Notification.find(tenant(req)).sort({ createdAt: -1 }).limit(30) });
});

export const markNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...tenant(req) },
    { read: true },
    { new: true },
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found in this workspace.' });
  res.json({ data: notification });
});
