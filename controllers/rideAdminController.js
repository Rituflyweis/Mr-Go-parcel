const Ride = require("../models/Ride");
const PricingRule = require("../models/PricingRule");
const { successResponse, errorResponse } = require("../utils/response");

// @route GET /api/admin/rides/stats
const getRideStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, activeNow, completedToday, cancelled] = await Promise.all([
      Ride.countDocuments(),
      Ride.countDocuments({ status: { $in: ["driver_assigned", "driver_arriving", "ride_started"] } }),
      Ride.countDocuments({ status: "completed", completedAt: { $gte: todayStart } }),
      Ride.countDocuments({ status: "cancelled" }),
    ]);

    successResponse(res, 200, "Ride stats", { total, activeNow, completedToday, cancelled });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/rides/all
const getAllRides = async (req, res) => {
  try {
    const { status, rideType, search, page = 1, limit = 20, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (rideType) filter.rideType = rideType;
    if (search) filter.$or = [{ rideId: { $regex: search, $options: "i" } }];
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const rides = await Ride.find(filter)
      .populate("customer", "name phone profileImage")
      .populate("driver")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Ride.countDocuments(filter);
    successResponse(res, 200, "All rides", { rides, total, page: Number(page) });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/rides/active
const getActiveTrips = async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now - 3600000);

    const [activeTrips, enRoute, inProgress, safetyAlerts, trips] = await Promise.all([
      Ride.countDocuments({ status: { $in: ["driver_assigned", "driver_arriving", "ride_started"] } }),
      Ride.countDocuments({ status: "driver_arriving" }),
      Ride.countDocuments({ status: "ride_started" }),
      Ride.countDocuments({ status: "ride_started", startedAt: { $lt: oneHourAgo } }),
      Ride.find({ status: { $in: ["driver_assigned", "driver_arriving", "ride_started"] } })
        .populate("customer", "name phone")
        .populate("driver")
        .sort({ updatedAt: -1 })
        .limit(50),
    ]);

    successResponse(res, 200, "Active trips", {
      stats: { activeTrips, enRoute, inProgress, safetyAlerts },
      trips,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/rides/history
const getRideHistory = async (req, res) => {
  try {
    const { from, to, rideType, status, search, page = 1, limit = 20 } = req.query;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const filter = { status: { $in: ["completed", "cancelled"] } };
    if (rideType) filter.rideType = rideType;
    if (status) filter.status = status;
    if (search) filter.rideId = { $regex: search, $options: "i" };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [totalCompleted, totalRevArr, avgRatingArr, cancellationCount, rides] = await Promise.all([
      Ride.countDocuments({ status: "completed", createdAt: { $gte: monthStart } }),
      Ride.aggregate([{ $match: { status: "completed", createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$fare.total" } } }]),
      Ride.aggregate([{ $match: { status: "completed", rating: { $exists: true } } }, { $group: { _id: null, avg: { $avg: "$rating" } } }]),
      Ride.countDocuments({ status: "cancelled", createdAt: { $gte: monthStart } }),
      Ride.find(filter)
        .populate("customer", "name phone profileImage")
        .populate("driver")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
    ]);

    const total = await Ride.countDocuments(filter);
    const totalRevenue = totalRevArr[0]?.total || 0;
    const cancellationRate = totalCompleted > 0 ? parseFloat(((cancellationCount / (totalCompleted + cancellationCount)) * 100).toFixed(1)) : 0;

    // Peak hours
    const peakHours = await Ride.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: { $hour: "$startedAt" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    // Service type breakdown
    const serviceBreakdown = await Ride.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$rideType", count: { $sum: 1 } } },
    ]);

    successResponse(res, 200, "Ride history", {
      stats: {
        totalCompleted,
        totalRevenue,
        avgRating: parseFloat((avgRatingArr[0]?.avg || 0).toFixed(1)),
        cancellationRate,
      },
      peakHours,
      serviceBreakdown,
      rides, total,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── PRICING RULES ─────────────────────────────────────────────────────────────

// @route GET /api/admin/rides/pricing
const getPricingRules = async (req, res) => {
  try {
    const rules = await PricingRule.find().sort({ createdAt: -1 });
    const activeCount = rules.filter(r => r.isActive).length;
    const avgFare = rules.length > 0 ? parseFloat((rules.reduce((s, r) => s + r.baseRate, 0) / rules.length).toFixed(2)) : 0;
    const surgeActive = rules.some(r => r.ruleType === "surge" && r.isActive);

    successResponse(res, 200, "Pricing rules", {
      stats: { activeRules: activeCount, avgFare, surgeActive, lastUpdated: rules[0]?.updatedAt || null },
      rules,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/rides/pricing
const createPricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.create(req.body);
    successResponse(res, 201, "Pricing rule created", { rule });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/rides/pricing/:id
const updatePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return errorResponse(res, 404, "Pricing rule not found");
    successResponse(res, 200, "Pricing rule updated", { rule });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/admin/rides/pricing/:id
const deletePricingRule = async (req, res) => {
  try {
    await PricingRule.findByIdAndDelete(req.params.id);
    successResponse(res, 200, "Pricing rule deleted");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/rides/pricing/:id/toggle
const togglePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findById(req.params.id);
    if (!rule) return errorResponse(res, 404, "Pricing rule not found");
    rule.isActive = !rule.isActive;
    await rule.save();
    successResponse(res, 200, `Rule ${rule.isActive ? "activated" : "deactivated"}`, { rule });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/rides/pricing/calculate
const calculateFare = async (req, res) => {
  try {
    const { distance, duration, rideType = "on_demand", vehicleCategory = "sedan" } = req.body;
    if (!distance || !duration) return errorResponse(res, 422, "distance and duration are required");

    const rule = await PricingRule.findOne({ serviceType: rideType, isActive: true });
    if (!rule) {
      const FARE_CONFIG = { bike: { base: 20, perKm: 8, perMin: 1 }, auto: { base: 30, perKm: 12, perMin: 1.5 }, sedan: { base: 50, perKm: 15, perMin: 2 }, suv: { base: 80, perKm: 20, perMin: 2.5 }, premium: { base: 120, perKm: 25, perMin: 3 } };
      const config = FARE_CONFIG[vehicleCategory] || FARE_CONFIG.sedan;
      const total = config.base + distance * config.perKm + duration * config.perMin;
      return successResponse(res, 200, "Fare calculated (default)", { estimatedFare: parseFloat(total.toFixed(2)), usingDefault: true });
    }

    const fare = rule.baseRate + distance * (rule.perKm || rule.perMile || 0) + duration * (rule.perMinute || 0);
    const finalFare = Math.max(fare * rule.surgeMultiplier, rule.minimumFare);

    successResponse(res, 200, "Fare calculated", {
      estimatedFare: parseFloat(finalFare.toFixed(2)),
      ruleApplied: rule.name,
      breakdown: { baseRate: rule.baseRate, distanceCharge: distance * (rule.perKm || 0), timeCharge: duration * (rule.perMinute || 0), surgeMultiplier: rule.surgeMultiplier },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { getRideStats, getAllRides, getActiveTrips, getRideHistory, getPricingRules, createPricingRule, updatePricingRule, deletePricingRule, togglePricingRule, calculateFare };
