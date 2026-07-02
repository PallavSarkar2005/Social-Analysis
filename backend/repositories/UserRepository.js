import User from "../models/User.js";

export const findById = (id) => User.findById(id);

export const findByEmail = (email) => User.findOne({ email });

export const findByGoogleId = (googleId, excludeUserId) =>
  User.findOne({
    googleId,
    _id: { $ne: excludeUserId },
  });

export const create = (data) => User.create(data);

export const save = (user) => user.save();

export const deleteById = (id) => User.findByIdAndDelete(id);
