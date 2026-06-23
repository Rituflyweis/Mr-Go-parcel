const User = require("../models/User");
const Driver = require("../models/Driver");
const { successResponse, errorResponse } = require("../utils/response");
const generateOTP = require("../utils/generateOTP");
const sendEmail = require("../utils/sendEmail");

// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, countryCode = "+1", password, role } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) return errorResponse(res, 409, "Email or phone already registered");

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const referralCode = name.slice(0, 3).toUpperCase() + Date.now().toString().slice(-5);
    const fullPhone = countryCode.startsWith("+")
      ? countryCode + phone
      : "+" + countryCode + phone;

    const user = await User.create({
      name,
      email,
      phone,
      countryCode,
      fullPhone,
      password,
      role: role || "customer",
      otp,
      otpExpiry,
      referralCode,
    });

    sendEmail({
      to: email,
      subject: "Go Parcel - Verify Your Account",
      html: `<h2>Welcome to Go Parcel!</h2><p>Your OTP is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p><p>If you don't receive OTP, use default OTP: <strong>1234</strong></p>`,
    });

    successResponse(res, 201, "Registration successful. Please verify OTP.", {
      userId: user._id,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId).select("+otp +otpExpiry");
    if (!user) return errorResponse(res, 404, "User not found");

    const isDefaultOTP = otp === "1234";
    if (!isDefaultOTP && user.otp !== otp) return errorResponse(res, 422, "Invalid OTP");
    if (!isDefaultOTP && new Date() > user.otpExpiry) return errorResponse(res, 410, "OTP expired");

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = user.generateToken();
    successResponse(res, 200, "Account verified successfully", { token, user });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, phone, countryCode, password } = req.body;

    if (!password || (!email && !phone)) {
      return errorResponse(res, 422, "Please provide email/phone and password");
    }

    // Match by email OR phone (with or without country code)
    let query;
    if (email) {
      query = { email };
    } else if (countryCode) {
      const fullPhone = countryCode.startsWith("+") ? countryCode + phone : "+" + countryCode + phone;
      query = { $or: [{ phone }, { fullPhone }] };
    } else {
      query = { phone };
    }
    const user = await User.findOne(query).select("+password");
    if (!user) return errorResponse(res, 401, "Invalid credentials");

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return errorResponse(res, 401, "Invalid credentials");

    if (!user.isVerified) return errorResponse(res, 403, "Please verify your account first");
    if (user.isBlocked) return errorResponse(res, 403, "Your account has been blocked");

    const token = user.generateToken();

    let driverInfo = null;
    if (user.role === "driver") {
      driverInfo = await Driver.findOne({ user: user._id });
    }

    successResponse(res, 200, "Login successful", { token, user, driverInfo });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/auth/send-otp
const sendOTP = async (req, res) => {
  try {
    const { email, phone } = req.body;
    const query = email ? { email } : { phone };
    const user = await User.findOne(query);
    if (!user) return errorResponse(res, 404, "User not found");

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendEmail({
      to: user.email,
      subject: "Go Parcel - OTP",
      html: `<p>Your OTP is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p><p>If OTP not received, use default OTP: <strong>1234</strong></p>`,
    });

    successResponse(res, 200, "OTP sent successfully. Default OTP is 1234 if email not received.");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;
    const user = await User.findById(userId).select("+otp +otpExpiry");
    if (!user) return errorResponse(res, 404, "User not found");

    if (user.otp !== otp) return errorResponse(res, 422, "Invalid OTP");
    if (new Date() > user.otpExpiry) return errorResponse(res, 410, "OTP expired");

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    successResponse(res, 200, "Password reset successful");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let driverInfo = null;
    if (user.role === "driver") {
      driverInfo = await Driver.findOne({ user: user._id });
    }
    successResponse(res, 200, "Profile fetched", { user, driverInfo });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/auth/update-profile
const updateProfile = async (req, res) => {
  try {
    const { name, address, fcmToken } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (address) updates.address = address;
    if (fcmToken) updates.fcmToken = fcmToken;
    if (req.file) updates.profileImage = req.file.path;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    successResponse(res, 200, "Profile updated", { user });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return errorResponse(res, 401, "Current password is incorrect");

    user.password = newPassword;
    await user.save();
    successResponse(res, 200, "Password changed successfully");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { register, verifyOTP, login, sendOTP, resetPassword, getMe, updateProfile, changePassword };
