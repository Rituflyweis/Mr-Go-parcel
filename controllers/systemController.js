const SystemSetting = require("../models/SystemSetting");
const User = require("../models/User");
const Driver = require("../models/Driver");
const Payment = require("../models/Payment");
const Parcel = require("../models/Parcel");
const Ride = require("../models/Ride");
const { successResponse, errorResponse } = require("../utils/response");

// ── SYSTEM SETTINGS ───────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = [
  { key: "company_name", value: "GoParcel", category: "general" },
  { key: "support_email", value: "support@goparcel.com", category: "general" },
  { key: "support_phone", value: "+1-800-GOPARCEL", category: "general" },
  { key: "default_timezone", value: "America/New_York", category: "general" },
  { key: "operational_hours", value: { monday: { open: "06:00", close: "23:00", enabled: true }, tuesday: { open: "06:00", close: "23:00", enabled: true }, wednesday: { open: "06:00", close: "23:00", enabled: true }, thursday: { open: "06:00", close: "23:00", enabled: true }, friday: { open: "06:00", close: "23:00", enabled: true }, saturday: { open: "06:00", close: "23:00", enabled: true }, sunday: { open: "06:00", close: "23:00", enabled: true } }, category: "general" },
  { key: "default_currency", value: "USD", category: "pricing" },
  { key: "surge_pricing_enabled", value: true, category: "pricing" },
  { key: "base_delivery_fee", value: 5.0, category: "pricing" },
  { key: "email_notifications_enabled", value: true, category: "notifications" },
  { key: "push_notifications_enabled", value: true, category: "notifications" },
  { key: "sms_notifications_enabled", value: false, category: "notifications" },
  { key: "nemt_service_enabled", value: true, category: "services" },
  { key: "notary_service_enabled", value: true, category: "services" },
  { key: "movers_service_enabled", value: true, category: "services" },
  { key: "shuttle_service_enabled", value: true, category: "services" },
  { key: "two_factor_auth_enabled", value: false, category: "security" },
  { key: "session_timeout_minutes", value: 60, category: "security" },
  { key: "new_driver_auto_approve", value: false, category: "features" },
  { key: "maintenance_mode", value: false, category: "features" },
];

// @route GET /api/admin/system/settings
const getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    let settings = await SystemSetting.find(category ? { category } : {});

    // Seed defaults if empty
    if (settings.length === 0) {
      await SystemSetting.insertMany(DEFAULT_SETTINGS.map(s => ({ ...s, updatedBy: req.user._id })));
      settings = await SystemSetting.find(category ? { category } : {});
    }

    // Group by category
    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = s.value;
    });

    successResponse(res, 200, "Settings fetched", { settings: grouped, raw: settings });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/system/settings
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body; // { key: value, key2: value2 }
    if (!settings || typeof settings !== "object") return errorResponse(res, 422, "settings object required");

    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        SystemSetting.findOneAndUpdate(
          { key },
          { value, updatedBy: req.user._id },
          { upsert: true, new: true }
        )
      );
    }
    await Promise.all(updates);
    successResponse(res, 200, "Settings updated", { updatedKeys: Object.keys(settings) });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── ADMIN USERS ───────────────────────────────────────────────────────────────

// @route GET /api/admin/system/admins
const getAdminUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = { role: "admin" };
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];

    const admins = await User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const total = await User.countDocuments(filter);
    const activeNow = await User.countDocuments({ role: "admin", isActive: true });

    successResponse(res, 200, "Admin users", {
      stats: { total, activeNow },
      admins,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/system/admins
const createAdminUser = async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const { name, email, phone, password, countryCode = "+1" } = req.body;
    if (!name || !email || !password) return errorResponse(res, 422, "name, email, password required");

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) return errorResponse(res, 409, "Email or phone already exists");

    const user = await User.create({
      name, email, phone, countryCode, password,
      role: "admin", isVerified: true,
      referralCode: "ADM" + Date.now().toString().slice(-5),
    });

    successResponse(res, 201, "Admin user created", { user });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── CUSTOMER MANAGEMENT ───────────────────────────────────────────────────────

// @route GET /api/admin/system/customers
const getCustomers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = { role: "customer" };
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (status === "blocked") filter.isBlocked = true;
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { phone: { $regex: search, $options: "i" } }];

    const [total, active, inactive, blocked] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "customer", isActive: true }),
      User.countDocuments({ role: "customer", isActive: false }),
      User.countDocuments({ role: "customer", isBlocked: true }),
    ]);

    const totalRevArr = await Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]);
    const avgOrderValue = totalRevArr[0] ? parseFloat((totalRevArr[0].total / totalRevArr[0].count).toFixed(2)) : 0;

    const customers = await User.find(filter)
      .select("-password -otp -otpExpiry")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    successResponse(res, 200, "Customers", {
      stats: {
        total, active, inactive, blocked,
        totalRevenue: totalRevArr[0]?.total || 0,
        avgOrderValue,
        segments: { premiumMembers: 0, highValue: 0, frequentUsers: 0, atRisk: 0 },
      },
      customers,
      total: await User.countDocuments(filter),
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── REPORTS & ANALYTICS ───────────────────────────────────────────────────────

// @route GET /api/admin/system/analytics
const getAnalytics = async (req, res) => {
  try {
    const { period = "30days" } = req.query;
    const now = new Date();
    let daysBack = 30;
    if (period === "7days") daysBack = 7;
    if (period === "90days") daysBack = 90;
    if (period === "365days") daysBack = 365;

    const from = new Date(now); from.setDate(from.getDate() - daysBack); from.setHours(0,0,0,0);
    const prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - daysBack);

    const [currRevArr, prevRevArr, currOrders, prevOrders, avgOrderArr, successRate] = await Promise.all([
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: from } } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: prevFrom, $lt: from } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Parcel.countDocuments({ createdAt: { $gte: from } }),
      Parcel.countDocuments({ createdAt: { $gte: prevFrom, $lt: from } }),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: from } } }, { $group: { _id: null, avg: { $avg: "$amount" } } }]),
      Parcel.countDocuments({ status: "delivered", createdAt: { $gte: from } }),
    ]);

    const currRev = currRevArr[0]?.total || 0;
    const prevRev = prevRevArr[0]?.total || 1;
    const revenueGrowth = parseFloat((((currRev - prevRev) / prevRev) * 100).toFixed(1));
    const orderGrowth = prevOrders > 0 ? parseFloat((((currOrders - prevOrders) / prevOrders) * 100).toFixed(1)) : 0;

    // Revenue by service
    const revenueByService = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: from } } },
      { $group: { _id: "$method", total: { $sum: "$amount" } } },
    ]);

    // Weekly order breakdown
    const weeklyBreakdown = await Parcel.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: { $dayOfWeek: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Top zones
    const topZones = await Parcel.aggregate([
      { $match: { "pickupAddress.city": { $exists: true, $ne: "" }, createdAt: { $gte: from } } },
      { $group: { _id: "$pickupAddress.city", orders: { $sum: 1 }, revenue: { $sum: "$pricing.total" } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    successResponse(res, 200, "Analytics", {
      period,
      topCards: {
        totalRevenue: { value: currRev, growthPercent: revenueGrowth },
        totalOrders:  { value: currOrders, growthPercent: orderGrowth },
        avgOrderValue: { value: parseFloat((avgOrderArr[0]?.avg || 0).toFixed(2)) },
        successRate:  { value: currOrders > 0 ? parseFloat(((successRate / currOrders) * 100).toFixed(1)) : 0 },
      },
      revenueByService,
      weeklyBreakdown,
      topZones,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── DRIVER MANAGEMENT EXTRAS ──────────────────────────────────────────────────

// @route GET /api/admin/system/driver-management
const getDriverManagement = async (req, res) => {
  try {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0,0,0,0);

    const [total, activeNow, totalEarningsArr, avgRatingArr] = await Promise.all([
      Driver.countDocuments({ isApproved: true }),
      Driver.countDocuments({ isApproved: true, isOnline: true }),
      Driver.aggregate([{ $group: { _id: null, total: { $sum: "$totalEarnings" } } }]),
      Driver.aggregate([{ $match: { totalRatings: { $gt: 0 } } }, { $group: { _id: null, avg: { $avg: "$rating" } } }]),
    ]);

    const weeklyTrips = await Parcel.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: weekStart } } },
      { $group: { _id: { $dayOfWeek: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    successResponse(res, 200, "Driver management", {
      stats: {
        totalDrivers: total,
        activeNow,
        avgRating: parseFloat((avgRatingArr[0]?.avg || 0).toFixed(1)),
        totalEarnings: totalEarningsArr[0]?.total || 0,
      },
      weeklyTrips,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/system/onboarding
const getOnboarding = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalApplications, pendingReview, approved, approvalRate] = await Promise.all([
      Driver.countDocuments({ createdAt: { $gte: monthStart } }),
      Driver.countDocuments({ isApproved: false }),
      Driver.countDocuments({ isApproved: true, createdAt: { $gte: monthStart } }),
      Driver.countDocuments({ isApproved: true }),
    ]);

    const totalDrivers = await Driver.countDocuments();
    const rate = totalDrivers > 0 ? parseFloat(((approvalRate / totalDrivers) * 100).toFixed(1)) : 0;

    const weeklyApplications = await Driver.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: { $week: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const recentApplications = await Driver.find({ isApproved: false })
      .populate("user", "name email phone profileImage")
      .sort({ createdAt: -1 })
      .limit(20);

    successResponse(res, 200, "Onboarding", {
      stats: { totalApplications, pendingReview, approved, approvalRate: rate },
      weeklyApplications,
      recentApplications,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/system/performance
const getPerformanceAnalytics = async (req, res) => {
  try {
    const [avgRatingArr, totalTrips] = await Promise.all([
      Driver.aggregate([{ $match: { totalRatings: { $gt: 0 } } }, { $group: { _id: null, avg: { $avg: "$rating" } } }]),
      Parcel.countDocuments({ status: "delivered" }),
    ]);

    const delivered = await Parcel.countDocuments({ status: "delivered" });
    const total = await Parcel.countDocuments();
    const onTimeRate = total > 0 ? parseFloat(((delivered / total) * 100).toFixed(1)) : 0;

    const totalRevArr = await Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);

    const topDrivers = await Driver.find({ isApproved: true, totalRatings: { $gt: 0 } })
      .populate("user", "name profileImage")
      .sort({ rating: -1, totalDeliveries: -1 })
      .limit(10)
      .select("user totalEarnings totalDeliveries rating vehicleType");

    const ratingDistribution = await Driver.aggregate([
      { $match: { totalRatings: { $gt: 0 } } },
      { $bucket: { groupBy: "$rating", boundaries: [1, 2, 3, 4, 4.5, 5.1], default: "other", output: { count: { $sum: 1 } } } },
    ]);

    successResponse(res, 200, "Performance analytics", {
      topCards: {
        avgRating: parseFloat((avgRatingArr[0]?.avg || 0).toFixed(1)),
        totalTrips,
        onTimeRate,
        totalRevenue: totalRevArr[0]?.total || 0,
      },
      topDrivers,
      ratingDistribution,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { getSettings, updateSettings, getAdminUsers, createAdminUser, getCustomers, getAnalytics, getDriverManagement, getOnboarding, getPerformanceAnalytics };
