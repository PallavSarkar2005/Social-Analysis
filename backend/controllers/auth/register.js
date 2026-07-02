import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { sendTokenResponse } from "../../services/authService.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "user",
      plan: "free",
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      isEmailVerified: true,
      isVerified: true,
    });

    await sendTokenResponse(user, 201, req, res);
  } catch (error) {
    next(error);
  }
};
