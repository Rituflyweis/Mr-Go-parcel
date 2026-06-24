// Admin Controller — v1.2
const User = require("../models/User");
const Driver = require("../models/Driver");
const Parcel = require("../models/Parcel");
const Payment = require("../models/Payment");
const PromoCode = require("../models/PromoCode");
const Ride = require("../models/Ride");
const { successResponse, errorResponse } = require("../utils/response");

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const startOf = (period) => {
  const now = new Date();
  if (period === "today")  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week")   { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (period === "month")  return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year")   return new Date(now.getFullYear(), 0, 1);
  return new Date("2020-01-01");
};

const yesterday = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

// @route GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yestStart   = yesterday();

    // ── Top stat cards ──────────────────────────────────────────────
    const [
      totalCustomers, totalDrivers,
      totalParcels, totalRides,
      activeDrivers, liveOrders,
      pendingApprovals, failedOrders,
      revenueTodayArr, revenueYestArr,
      ordersTodayCount, ordersYestCount,
    ] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      Driver.countDocuments({ isApproved: true }),
      Parcel.countDocuments(),
      Ride.countDocuments(),
      Driver.countDocuments({ isApproved: true, isOnline: true }),
      Parcel.countDocuments({ status: { $in: ["pending", "driver_assigned", "picked_up", "in_transit", "out_for_delivery"] } }),
      Driver.countDocuments({ isApproved: false }),
      Parcel.countDocuments({ status: { $in: ["failed", "cancelled"] } }),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: yestStart, $lt: todayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Parcel.countDocuments({ createdAt: { $gte: todayStart } }),
      Parcel.countDocuments({ createdAt: { $gte: yestStart, $lt: todayStart } }),
    ]);

    // ── Card 1: Total Revenue ────────────────────────────────────────
    const revenueToday    = revenueTodayArr[0]?.total || 0;
    const revenueYest     = revenueYestArr[0]?.total  || 0;
    const revenueGrowth   = revenueYest > 0
      ? parseFloat((((revenueToday - revenueYest) / revenueYest) * 100).toFixed(1))
      : revenueToday > 0 ? 100 : 0;
    const totalRevenueAll = await Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);

    // ── Card 2: Total Orders ─────────────────────────────────────────
    const totalOrders   = totalParcels + totalRides;
    const ordersYest    = ordersYestCount;
    const orderGrowth   = ordersYest > 0
      ? parseFloat((((ordersTodayCount - ordersYest) / ordersYest) * 100).toFixed(1))
      : ordersTodayCount > 0 ? 100 : 0;

    // ── Card 3: Active Drivers ───────────────────────────────────────
    const activeDriversYest = await Driver.countDocuments({
      isApproved: true,
      updatedAt: { $gte: yestStart, $lt: todayStart },
    });
    const activeDriversGrowth = activeDriversYest > 0
      ? parseFloat((((activeDrivers - activeDriversYest) / activeDriversYest) * 100).toFixed(1))
      : activeDrivers > 0 ? 100 : 0;

    // ── Card 4: Completion Rate ──────────────────────────────────────
    const deliveredCount      = await Parcel.countDocuments({ status: "delivered" });
    const completionRate      = totalParcels > 0 ? parseFloat(((deliveredCount / totalParcels) * 100).toFixed(1)) : 0;
    const deliveredYest       = await Parcel.countDocuments({ status: "delivered", updatedAt: { $gte: yestStart, $lt: todayStart } });
    const totalYest           = await Parcel.countDocuments({ createdAt: { $lt: todayStart } });
    const completionRateYest  = totalYest > 0 ? ((deliveredYest / totalYest) * 100) : 0;
    const completionGrowth    = completionRateYest > 0
      ? parseFloat(((completionRate - completionRateYest)).toFixed(1))
      : 0;

    // ── Secondary stats (5 boxes) ────────────────────────────────────
    const openTickets = 0; // Will be from support/ticket module when added

    // ── Revenue trend (last 7 days) ──────────────────────────────────
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const revenueTrend = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    // ── Hourly active orders (today) ─────────────────────────────────
    const hourlyOrders = await Parcel.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    // ── Revenue by service ───────────────────────────────────────────
    const [parcelRevenue, rideRevenue] = await Promise.all([
      Payment.aggregate([{ $match: { status: "success", method: { $ne: "wallet" } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "success", gateway: "wallet" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const revenueByService = {
      parcel:      parcelRevenue[0]?.total || 0,
      ride:        rideRevenue[0]?.total || 0,
      nemt:        0,
      specialized: 0,
      shuttle:     0,
    };

    // ── Service breakdown (order counts) ────────────────────────────
    const [parcelCount, rideCount] = await Promise.all([
      Parcel.countDocuments(),
      Ride.countDocuments(),
    ]);

    const serviceBreakdown = {
      parcel:      parcelCount,
      ride:        rideCount,
      nemt:        0,
      specialized: 0,
      shuttle:     0,
    };

    // ── Weekly summary ───────────────────────────────────────────────
    const weekStart = startOf("week");
    const [weekOrders, weekCompleted, weekCancelled, weekAvgArr] = await Promise.all([
      Parcel.countDocuments({ createdAt: { $gte: weekStart } }),
      Parcel.countDocuments({ status: "delivered", createdAt: { $gte: weekStart } }),
      Parcel.countDocuments({ status: { $in: ["cancelled", "failed"] }, createdAt: { $gte: weekStart } }),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: weekStart } } }, { $group: { _id: null, avg: { $avg: "$amount" } } }]),
    ]);

    const weeklySummary = {
      totalOrders: weekOrders,
      completed:   weekCompleted,
      cancelled:   weekCancelled,
      successRate: weekOrders > 0 ? parseFloat(((weekCompleted / weekOrders) * 100).toFixed(1)) : 0,
      avgOrderValue: parseFloat((weekAvgArr[0]?.avg || 0).toFixed(2)),
    };

    // ── Customer insights ────────────────────────────────────────────
    const weekAgo = startOf("week");
    const [totalCust, newThisWeek, activeUsers] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "customer", createdAt: { $gte: weekAgo } }),
      User.countDocuments({ role: "customer", isActive: true }),
    ]);

    const avgRating = await Driver.aggregate([
      { $match: { totalRatings: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);

    const customerInsights = {
      totalCustomers: totalCust,
      newThisWeek,
      activeUsers,
      retentionRate: totalCust > 0 ? parseFloat(((activeUsers / totalCust) * 100).toFixed(1)) : 0,
      avgRating: parseFloat((avgRating[0]?.avg || 4.5).toFixed(1)),
    };

    // ── Top drivers ──────────────────────────────────────────────────
    const topDrivers = await Driver.find({ isApproved: true })
      .populate("user", "name profileImage")
      .sort({ totalEarnings: -1 })
      .limit(5)
      .select("user totalEarnings totalDeliveries rating vehicleType");

    // ── Recent orders (fix: driver key included) ──────────────────────
    const recentOrders = await Parcel.find()
      .populate("customer", "name phone profileImage")
      .populate({ path: "driver", select: "vehicleType vehicleNumber rating", populate: { path: "user", select: "name phone profileImage" } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("trackingId parcelType status pricing customer driver createdAt distance");

    // ── Recent rides ─────────────────────────────────────────────────
    const recentRides = await Ride.find()
      .populate("customer", "name phone")
      .populate("driver")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("rideId rideType status fare customer driver createdAt");

    // ── Live tracking counts ─────────────────────────────────────────
    const liveTracking = {
      activeParcels: await Parcel.countDocuments({ status: { $in: ["driver_assigned", "picked_up", "in_transit", "out_for_delivery"] } }),
      activeRides:   await Ride.countDocuments({ status: { $in: ["driver_assigned", "driver_arriving", "ride_started"] } }),
      specialized:   0,
    };

    // ── Recent activity ──────────────────────────────────────────────
    const recentActivity = [
      ...(await Parcel.find().sort({ createdAt: -1 }).limit(3).select("trackingId status createdAt").lean()).map(p => ({
        type: "parcel", message: `New parcel order #${p.trackingId}`, status: p.status, time: p.createdAt,
      })),
      ...(await Driver.find({ isApproved: false }).sort({ createdAt: -1 }).limit(2).populate("user", "name").select("user createdAt").lean()).map(d => ({
        type: "driver", message: `New driver application: ${d.user?.name}`, status: "pending", time: d.createdAt,
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

    successResponse(res, 200, "Dashboard data", {

      // ── TOP 4 STAT CARDS (with % growth vs yesterday) ──────────────
      topCards: {
        totalRevenue: {
          value:        totalRevenueAll[0]?.total || 0,
          todayValue:   revenueToday,
          yesterdayValue: revenueYest,
          growthPercent: revenueGrowth,    // e.g. +124.5
          growthLabel:  "vs yesterday",
        },
        totalOrders: {
          value:         totalOrders,
          todayCount:    ordersTodayCount,
          yesterdayCount: ordersYest,
          growthPercent: orderGrowth,       // e.g. +18.2
          growthLabel:  "vs yesterday",
        },
        activeDrivers: {
          value:         activeDrivers,
          growthPercent: activeDriversGrowth, // e.g. +8.1
          growthLabel:  "vs yesterday",
          totalApproved: totalDrivers,
        },
        completionRate: {
          value:         completionRate,     // e.g. 94.2
          growthPercent: completionGrowth,   // e.g. +2.2
          growthLabel:  "vs yesterday",
          deliveredCount,
          totalParcels,
        },
      },

      // ── 5 SECONDARY STAT BOXES ─────────────────────────────────────
      quickStats: {
        liveOrders:       { value: liveOrders,       label: "Live Orders" },
        pendingApprovals: { value: pendingApprovals,  label: "Pending Approvals" },
        failedOrders:     { value: failedOrders,      label: "Failed Orders" },
        openTickets:      { value: openTickets,        label: "Open Tickets" },
        totalCustomers:   { value: totalCustomers,    label: "Total Customers" },
      },
      revenueTrend,
      hourlyOrders,
      revenueByService,
      serviceBreakdown,
      liveTracking,
      topDrivers,
      recentOrders,
      recentRides,
      recentActivity,
      weeklySummary,
      customerInsights,
      alerts: {
        slaBreaches: failedOrders,
        openTickets: 0,
        pendingApprovals,
      },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ─── SECTION-WISE APIS ────────────────────────────────────────────────────────

// @route GET /api/admin/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yestStart  = yesterday();

    const [totalRev, todayRev, yestRev, totalOrders, activeDrivers, completionArr] = await Promise.all([
      Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: yestStart, $lt: todayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Parcel.countDocuments(),
      Driver.countDocuments({ isApproved: true, isOnline: true }),
      Parcel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const delivered = completionArr.find(s => s._id === "delivered")?.count || 0;
    const total     = completionArr.reduce((s, i) => s + i.count, 0);

    successResponse(res, 200, "Stats fetched", {
      totalRevenue: totalRev[0]?.total || 0,
      todayRevenue: todayRev[0]?.total || 0,
      revenueGrowth: parseFloat(((((todayRev[0]?.total || 0) - (yestRev[0]?.total || 1)) / Math.max(yestRev[0]?.total || 1, 1)) * 100).toFixed(1)),
      totalOrders,
      activeDrivers,
      completionRate: total > 0 ? parseFloat(((delivered / total) * 100).toFixed(1)) : 0,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/dashboard/revenue-trend
const getRevenueTrend = async (req, res) => {
  try {
    const { period = "7days" } = req.query;
    let daysBack = 7;
    if (period === "30days") daysBack = 30;
    if (period === "90days") daysBack = 90;

    const from = new Date();
    from.setDate(from.getDate() - (daysBack - 1));
    from.setHours(0, 0, 0, 0);

    const trend = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: from } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$amount" },
          orders:  { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    successResponse(res, 200, "Revenue trend", { trend, period });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/dashboard/hourly-orders
const getHourlyOrders = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const hourly = await Parcel.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Fill all 24 hours
    const filled = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h.toString().padStart(2, "0")}:00`,
      count: hourly.find(x => x._id === h)?.count || 0,
    }));

    successResponse(res, 200, "Hourly orders", { hourly: filled });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/dashboard/top-drivers
const getTopDrivers = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const drivers = await Driver.find({ isApproved: true })
      .populate("user", "name profileImage phone")
      .sort({ totalEarnings: -1 })
      .limit(Number(limit))
      .select("user totalEarnings totalDeliveries rating vehicleType vehicleNumber isOnline");

    successResponse(res, 200, "Top drivers", { drivers });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/dashboard/recent-activity
const getRecentActivity = async (req, res) => {
  try {
    const [recentParcels, pendingDrivers] = await Promise.all([
      Parcel.find().sort({ createdAt: -1 }).limit(5).select("trackingId status createdAt pricing").lean(),
      Driver.find({ isApproved: false }).sort({ createdAt: -1 }).limit(3).populate("user", "name").select("user createdAt").lean(),
    ]);

    const activity = [
      ...recentParcels.map(p => ({
        type: "parcel",
        icon: "package",
        message: `New parcel order #${p.trackingId}`,
        status: p.status,
        amount: p.pricing?.total,
        time: p.createdAt,
      })),
      ...pendingDrivers.map(d => ({
        type: "driver",
        icon: "user",
        message: `New driver application: ${d.user?.name || "Unknown"}`,
        status: "pending",
        time: d.createdAt,
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    successResponse(res, 200, "Recent activity", { activity });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/dashboard/regional-performance
const getRegionalPerformance = async (req, res) => {
  try {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const prevWeekStart = new Date(now); prevWeekStart.setDate(now.getDate() - 14);

    const [current, previous] = await Promise.all([
      Parcel.aggregate([
        { $match: { "pickupAddress.city": { $exists: true, $ne: "" }, createdAt: { $gte: weekStart } } },
        { $group: { _id: "$pickupAddress.city", orders: { $sum: 1 }, revenue: { $sum: "$pricing.total" } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
      Parcel.aggregate([
        { $match: { "pickupAddress.city": { $exists: true, $ne: "" }, createdAt: { $gte: prevWeekStart, $lt: weekStart } } },
        { $group: { _id: "$pickupAddress.city", orders: { $sum: 1 }, revenue: { $sum: "$pricing.total" } } },
      ]),
    ]);

    const prevMap = {};
    previous.forEach(p => { prevMap[p._id] = p; });

    const regional = current.map(c => {
      const prev = prevMap[c._id];
      const prevRevenue = prev?.revenue || 0;
      const growthPercent = prevRevenue > 0
        ? parseFloat((((c.revenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
        : c.revenue > 0 ? 100 : 0;

      return {
        city: c._id,
        orders: c.orders,
        revenue: parseFloat(c.revenue.toFixed(2)),
        previousRevenue: parseFloat(prevRevenue.toFixed(2)),
        growthPercent,                      // +12.5 or -3.2
        trend: growthPercent >= 0 ? "up" : "down",
      };
    });

    successResponse(res, 200, "Regional performance", { regional });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ─── EXISTING ROUTES ──────────────────────────────────────────────────────────

// @route GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const total = await User.countDocuments(filter);
    successResponse(res, 200, "Users fetched", { users, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/users/:id/block
const blockUser = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked }, { new: true });
    if (!user) return errorResponse(res, 404, "User not found");
    successResponse(res, 200, `User ${isBlocked ? "blocked" : "unblocked"}`, { user });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/drivers
const getAllDrivers = async (req, res) => {
  try {
    const { isApproved, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (isApproved !== undefined) filter.isApproved = isApproved === "true";
    const drivers = await Driver.find(filter).populate("user", "name phone email profileImage").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const total = await Driver.countDocuments(filter);
    successResponse(res, 200, "Drivers fetched", { drivers, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/drivers/:id/approve
const approveDriver = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const driver = await Driver.findByIdAndUpdate(req.params.id, { isApproved }, { new: true }).populate("user", "name phone email");
    if (!driver) return errorResponse(res, 404, "Driver not found");
    successResponse(res, 200, `Driver ${isApproved ? "approved" : "rejected"}`, { driver });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/orders
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.trackingId = { $regex: search, $options: "i" };
    const parcels = await Parcel.find(filter)
      .populate("customer", "name phone email")
      .populate({ path: "driver", populate: { path: "user", select: "name phone" } })
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const total = await Parcel.countDocuments(filter);
    successResponse(res, 200, "Orders fetched", { parcels, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/orders/:id/assign-driver
const assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;
    const driver = await Driver.findById(driverId);
    if (!driver) return errorResponse(res, 404, "Driver not found");
    if (!driver.isApproved) return errorResponse(res, 403, "Driver not approved");
    const parcel = await Parcel.findByIdAndUpdate(req.params.id, {
      driver: driverId,
      status: "driver_assigned",
      $push: { trackingHistory: { status: "driver_assigned", message: "Admin assigned a driver", timestamp: new Date(), updatedBy: req.user._id } },
    }, { new: true });
    if (!parcel) return errorResponse(res, 404, "Parcel not found");
    successResponse(res, 200, "Driver assigned", { parcel });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/promo
const createPromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.create(req.body);
    successResponse(res, 201, "Promo code created", { promo });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/promo
const getAllPromoCodes = async (req, res) => {
  try {
    const promos = await PromoCode.find().sort({ createdAt: -1 });
    successResponse(res, 200, "Promo codes", { promos });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/promo/:id
const updatePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!promo) return errorResponse(res, 404, "Promo code not found");
    successResponse(res, 200, "Promo code updated", { promo });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/admin/promo/:id
const deletePromoCode = async (req, res) => {
  try {
    await PromoCode.findByIdAndDelete(req.params.id);
    successResponse(res, 200, "Promo code deleted");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/revenue
const getRevenueReport = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    let groupBy;
    if (period === "day")   groupBy = { $dayOfMonth: "$createdAt" };
    else if (period === "week") groupBy = { $week: "$createdAt" };
    else groupBy = { $month: "$createdAt" };

    const revenue = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: groupBy, totalRevenue: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    successResponse(res, 200, "Revenue report", { revenue });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/search?q=john
const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return errorResponse(res, 422, "Search query must be at least 2 characters");

    const regex = { $regex: q, $options: "i" };

    const [users, drivers, parcels, rides] = await Promise.all([
      User.find({ $or: [{ name: regex }, { email: regex }, { phone: regex }] }).limit(5).select("name email phone role profileImage"),
      Driver.find({ $or: [{ vehicleNumber: regex }] }).populate("user", "name phone").limit(5).select("vehicleType vehicleNumber isApproved rating"),
      Parcel.find({ $or: [{ trackingId: regex }, { "pickupAddress.city": regex }, { "deliveryAddress.city": regex }] }).limit(5).select("trackingId status parcelType pricing createdAt").populate("customer", "name phone"),
      Ride.find({ rideId: regex }).limit(5).select("rideId rideType status fare createdAt").populate("customer", "name phone"),
    ]);

    successResponse(res, 200, "Search results", {
      query: q,
      results: { users, drivers, parcels, rides },
      counts: { users: users.length, drivers: drivers.length, parcels: parcels.length, rides: rides.length },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/export/orders
const exportOrders = async (req, res) => {
  try {
    const { status, from, to, format = "json" } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const parcels = await Parcel.find(filter)
      .populate("customer", "name phone email")
      .populate({ path: "driver", populate: { path: "user", select: "name phone" } })
      .sort({ createdAt: -1 })
      .select("trackingId parcelType status pricing customer driver pickupAddress deliveryAddress createdAt distance paymentMethod paymentStatus");

    const data = parcels.map(p => ({
      trackingId:      p.trackingId,
      parcelType:      p.parcelType,
      status:          p.status,
      total:           p.pricing?.total,
      paymentMethod:   p.paymentMethod,
      paymentStatus:   p.paymentStatus,
      customerName:    p.customer?.name,
      customerPhone:   p.customer?.phone,
      driverName:      p.driver?.user?.name || "Not assigned",
      pickupCity:      p.pickupAddress?.city,
      deliveryCity:    p.deliveryAddress?.city,
      distanceKm:      p.distance,
      createdAt:       p.createdAt,
    }));

    successResponse(res, 200, "Orders export data", {
      total: data.length,
      exportedAt: new Date(),
      filters: { status, from, to },
      data,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/export/users
const exportUsers = async (req, res) => {
  try {
    const { role, from, to } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("name email phone role isVerified isBlocked wallet countryCode createdAt");

    const data = users.map(u => ({
      name:        u.name,
      email:       u.email,
      phone:       u.phone,
      countryCode: u.countryCode,
      role:        u.role,
      isVerified:  u.isVerified,
      isBlocked:   u.isBlocked,
      walletBalance: u.wallet,
      joinedAt:    u.createdAt,
    }));

    successResponse(res, 200, "Users export data", {
      total: data.length,
      exportedAt: new Date(),
      filters: { role, from, to },
      data,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/export/drivers
const exportDrivers = async (req, res) => {
  try {
    const { isApproved } = req.query;
    const filter = {};
    if (isApproved !== undefined) filter.isApproved = isApproved === "true";

    const drivers = await Driver.find(filter)
      .populate("user", "name email phone countryCode createdAt")
      .select("vehicleType vehicleNumber vehicleModel licenseNumber isApproved isOnline totalEarnings totalDeliveries rating");

    const data = drivers.map(d => ({
      name:           d.user?.name,
      email:          d.user?.email,
      phone:          d.user?.phone,
      vehicleType:    d.vehicleType,
      vehicleNumber:  d.vehicleNumber,
      vehicleModel:   d.vehicleModel,
      licenseNumber:  d.licenseNumber,
      isApproved:     d.isApproved,
      isOnline:       d.isOnline,
      totalEarnings:  d.totalEarnings,
      totalDeliveries: d.totalDeliveries,
      rating:         d.rating,
      joinedAt:       d.user?.createdAt,
    }));

    successResponse(res, 200, "Drivers export data", {
      total: data.length,
      exportedAt: new Date(),
      data,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/notifications/all
const getAllNotifications = async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    const { type, isRead, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type)   filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === "true";

    const notifications = await Notification.find(filter)
      .populate("user", "name email phone role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    successResponse(res, 200, "All notifications", { notifications, total, unreadCount, page: Number(page), limit: Number(limit) });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/notifications/broadcast
const broadcastNotification = async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    const { title, message, type = "system", targetRole } = req.body;
    if (!title || !message) return errorResponse(res, 422, "title and message are required");

    const userFilter = {};
    if (targetRole) userFilter.role = targetRole;
    const users = await User.find(userFilter).select("_id");

    const notifications = users.map(u => ({ user: u._id, title, message, type }));
    await Notification.insertMany(notifications);

    successResponse(res, 201, `Notification sent to ${users.length} users`, {
      sentTo: users.length,
      targetRole: targetRole || "all",
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getDashboard,
  getDashboardStats,
  getRevenueTrend,
  getHourlyOrders,
  getTopDrivers,
  getRecentActivity,
  getRegionalPerformance,
  getAllUsers,
  blockUser,
  getAllDrivers,
  approveDriver,
  getAllOrders,
  assignDriver,
  createPromoCode,
  getAllPromoCodes,
  updatePromoCode,
  deletePromoCode,
  getRevenueReport,
  globalSearch,
  exportOrders,
  exportUsers,
  exportDrivers,
  getAllNotifications,
  broadcastNotification,
};
