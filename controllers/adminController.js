// Admin Controller — v1.1
const User = require("../models/User");
const Driver = require("../models/Driver");
const Parcel = require("../models/Parcel");
const Payment = require("../models/Payment");
const PromoCode = require("../models/PromoCode");
const { successResponse, errorResponse } = require("../utils/response");

// @route GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers, totalDrivers, totalParcels, deliveredParcels,
      cancelledParcels, pendingParcels, totalRevenue
    ] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      Driver.countDocuments(),
      Parcel.countDocuments(),
      Parcel.countDocuments({ status: "delivered" }),
      Parcel.countDocuments({ status: "cancelled" }),
      Parcel.countDocuments({ status: "pending" }),
      Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const recentOrders = await Parcel.find()
      .populate("customer", "name phone")
      .sort({ createdAt: -1 })
      .limit(10);

    successResponse(res, 200, "Dashboard data", {
      stats: {
        totalUsers,
        totalDrivers,
        totalParcels,
        deliveredParcels,
        cancelledParcels,
        pendingParcels,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
      recentOrders,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

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

    const drivers = await Driver.find(filter)
      .populate("user", "name phone email profileImage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

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
    const driver = await Driver.findByIdAndUpdate(req.params.id, { isApproved }, { new: true })
      .populate("user", "name phone email");
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
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

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

    const parcel = await Parcel.findByIdAndUpdate(
      req.params.id,
      {
        driver: driverId,
        status: "driver_assigned",
        $push: {
          trackingHistory: {
            status: "driver_assigned",
            message: "Admin assigned a driver",
            timestamp: new Date(),
            updatedBy: req.user._id,
          },
        },
      },
      { new: true }
    );

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

    if (period === "day") groupBy = { $dayOfMonth: "$createdAt" };
    else if (period === "week") groupBy = { $week: "$createdAt" };
    else groupBy = { $month: "$createdAt" };

    const revenue = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    successResponse(res, 200, "Revenue report", { revenue });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getDashboard,
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
};
