import Session from "../models/Session.js";

export const create = (data) => Session.create(data);

export const findByTokenHash = (tokenHash) =>
  Session.findOne({ tokenHash });

export const findByIdForUser = (sessionId, userId) =>
  Session.findOne({ _id: sessionId, userId });

export const findActiveByUserId = (userId) => {
  const now = new Date();
  return Session.find({
    userId,
    revoked: false,
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });
};

export const countActiveByUserId = (userId) =>
  Session.countDocuments({ userId, revoked: false });

export const findOldestActive = (userId, limit) =>
  Session.find({ userId, revoked: false })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select("_id");

export const deleteById = (id) => Session.deleteOne({ _id: id });

export const deleteByTokenHash = (tokenHash) =>
  Session.deleteOne({ tokenHash });

export const deleteAllByUserId = (userId) =>
  Session.deleteMany({ userId });

export const deleteOthersByUserId = (userId, tokenHash) =>
  Session.deleteMany({
    userId,
    tokenHash: { $ne: tokenHash },
  });

export const deleteManyByIds = (ids) =>
  Session.deleteMany({ _id: { $in: ids } });

export const save = (session) => session.save();
