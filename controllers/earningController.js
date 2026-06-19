const Driver = require("../models/Driver");
const Parcel = require("../models/Parcel");
const Ride = require("../models/Ride");
const { successResponse, errorResponse } = require("../utils/response");

// @route GET /api/earnings/dashboard
const getEarningsDashboard = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver profile not found");
    if (!driver.isApproved) return errorResponse(res, 403, "Driver not approved yet");

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parcel earnings
    const [todayParcels, weekParcels, monthParcels] = await Promise.all([
      Parcel.find({ driver: driver._id, status: "delivered", deliveredAt: { $gte: startOfToday } }),
      Parcel.find({ driver: driver._id, status: "delivered", deliveredAt: { $gte: startOfWeek } }),
      Parcel.find({ driver: driver._id, status: "delivered", deliveredAt: { $gte: startOfMonth } }),
    ]);

    // Ride earnings
    const [todayRides, weekRides, monthRides] = await Promise.all([
      Ride.find({ driver: driver._id, status: "completed", completedAt: { $gte: startOfToday } }),
      Ride.find({ driver: driver._id, status: "completed", completedAt: { $gte: startOfWeek } }),
      Ride.find({ driver: driver._id, status: "completed", completedAt: { $gte: startOfMonth } }),
    ]);

    const sum = (arr, field) => arr.reduce((acc, item) => acc + (item[field] || item?.fare?.total || 0), 0);

    const parcelToday = sum(todayParcels, "pricing.total");
    const parcelWeek = sum(weekParcels, "pricing.total");
    const parcelMonth = sum(monthParcels, "pricing.total");

    const rideToday = todayRides.reduce((acc, r) => acc + (r.fare?.total || 0), 0);
    const rideWeek = weekRides.reduce((acc, r) => acc + (r.fare?.total || 0), 0);
    const rideMonth = monthRides.reduce((acc, r) => acc + (r.fare?.total || 0), 0);

    successResponse(res, 200, "Earnings dashboard", {
      summary: {
        today: {
          totalEarnings: parseFloat((parcelToday + rideToday).toFixed(2)),
          parcelEarnings: parseFloat(parcelToday.toFixed(2)),
          rideEarnings: parseFloat(rideToday.toFixed(2)),
          deliveries: todayParcels.length + todayRides.length,
        },
        thisWeek: {
          totalEarnings: parseFloat((parcelWeek + rideWeek).toFixed(2)),
          parcelEarnings: parseFloat(parcelWeek.toFixed(2)),
          rideEarnings: parseFloat(rideWeek.toFixed(2)),
          deliveries: weekParcels.length + weekRides.length,
        },
        thisMonth: {
          totalEarnings: parseFloat((parcelMonth + rideMonth).toFixed(2)),
          parcelEarnings: parseFloat(parcelMonth.toFixed(2)),
          rideEarnings: parseFloat(rideMonth.toFixed(2)),
          deliveries: monthParcels.length + monthRides.length,
        },
        allTime: {
          totalEarnings: driver.totalEarnings,
          totalDeliveries: driver.totalDeliveries,
          rating: driver.rating,
          walletBalance: 0,
        },
      },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/earnings/history
const getEarningsHistory = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver profile not found");

    const { period = "month", page = 1, limit = 20 } = req.query;
    const now = new Date();
    let startDate;
    if (period === "today") startDate = new Date(now.setHours(0, 0, 0, 0));
    else if (period === "week") { startDate = new Date(now); startDate.setDate(now.getDate() - 7); }
    else if (period === "month") startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else startDate = new Date("2020-01-01");

    const [parcels, rides] = await Promise.all([
      Parcel.find({ driver: driver._id, status: "delivered", deliveredAt: { $gte: startDate } })
        .select("trackingId parcelType pricing deliveredAt")
        .sort({ deliveredAt: -1 }),
      Ride.find({ driver: driver._id, status: "completed", completedAt: { $gte: startDate } })
        .select("rideId rideType fare completedAt")
        .sort({ completedAt: -1 }),
    ]);

    const history = [
      ...parcels.map((p) => ({
        type: "parcel",
        id: p.trackingId,
        category: p.parcelType,
        amount: p.pricing?.total || 0,
        date: p.deliveredAt,
      })),
      ...rides.map((r) => ({
        type: "ride",
        id: r.rideId,
        category: r.rideType,
        amount: r.fare?.total || 0,
        date: r.completedAt,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const paginated = history.slice((page - 1) * limit, page * limit);
    const totalAmount = history.reduce((acc, item) => acc + item.amount, 0);

    successResponse(res, 200, "Earnings history fetched", {
      history: paginated,
      total: history.length,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/earnings/tips
const getEarningTips = async (req, res) => {
  try {
    const tips = [
      { title: "Peak Hours Bonus", description: "Earn 1.5x during 8-10 AM and 6-9 PM", icon: "clock" },
      { title: "Complete 10 Rides Daily", description: "Get ₹200 bonus on completing 10 rides in a day", icon: "target" },
      { title: "Maintain 4.5+ Rating", description: "High rated drivers get priority orders", icon: "star" },
      { title: "Airport Transfers", description: "Earn 30% more on airport trips", icon: "flight" },
      { title: "HerDrive Program", description: "Women drivers earn 15% extra on HerDrive rides", icon: "heart" },
      { title: "Refer a Driver", description: "Earn ₹500 for every driver you refer who completes 50 rides", icon: "users" },
    ];
    successResponse(res, 200, "Earning tips fetched", { tips });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { getEarningsDashboard, getEarningsHistory, getEarningTips };
