const Parcel = require("../models/Parcel");
const Driver = require("../models/Driver");
const { successResponse, errorResponse } = require("../utils/response");

// @route GET /api/admin/parcels/stats
const getParcelStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, inTransit, deliveredToday, pendingPickup, active, failed, scheduled] = await Promise.all([
      Parcel.countDocuments(),
      Parcel.countDocuments({ status: "in_transit" }),
      Parcel.countDocuments({ status: "delivered", deliveredAt: { $gte: todayStart } }),
      Parcel.countDocuments({ status: "pending" }),
      Parcel.countDocuments({ status: { $in: ["driver_assigned", "picked_up", "in_transit", "out_for_delivery"] } }),
      Parcel.countDocuments({ status: { $in: ["failed", "cancelled"] } }),
      Parcel.countDocuments({ scheduledPickupTime: { $gte: now } }),
    ]);

    successResponse(res, 200, "Parcel stats", {
      total, inTransit, deliveredToday, pendingPickup, active, failed, scheduled,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/parcels/all
const getAllParcels = async (req, res) => {
  try {
    const { status, search, type, page = 1, limit = 20, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.parcelType = type;
    if (search) {
      filter.$or = [
        { trackingId: { $regex: search, $options: "i" } },
        { "pickupAddress.name": { $regex: search, $options: "i" } },
        { "deliveryAddress.name": { $regex: search, $options: "i" } },
        { "pickupAddress.phone": { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const parcels = await Parcel.find(filter)
      .populate("customer", "name phone email")
      .populate({ path: "driver", select: "vehicleType vehicleNumber rating", populate: { path: "user", select: "name phone" } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Parcel.countDocuments(filter);
    successResponse(res, 200, "All parcels", { parcels, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/parcels/active
const getActiveParcels = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = { status: { $in: ["driver_assigned", "picked_up", "in_transit", "out_for_delivery"] } };
    if (status) filter.status = status;
    if (search) filter.$or = [{ trackingId: { $regex: search, $options: "i" } }];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeNow, outForDelivery, pickedUp, delayed, parcels] = await Promise.all([
      Parcel.countDocuments({ status: { $in: ["driver_assigned", "picked_up", "in_transit", "out_for_delivery"] } }),
      Parcel.countDocuments({ status: "out_for_delivery" }),
      Parcel.countDocuments({ status: "picked_up" }),
      Parcel.countDocuments({ status: "in_transit", updatedAt: { $lt: new Date(now - 2 * 3600000) } }),
      Parcel.find(filter)
        .populate({ path: "driver", select: "vehicleType currentLocation rating", populate: { path: "user", select: "name phone" } })
        .populate("customer", "name phone")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
    ]);

    const total = await Parcel.countDocuments(filter);
    successResponse(res, 200, "Active parcels", {
      stats: { activeNow, outForDelivery, pickedUp, delayed },
      parcels, total,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/parcels/scheduled
const getScheduledParcels = async (req, res) => {
  try {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [total, todayScheduled, recurringOrders, pendingConfirmation, parcels] = await Promise.all([
      Parcel.countDocuments({ scheduledPickupTime: { $gte: now } }),
      Parcel.countDocuments({ scheduledPickupTime: { $gte: now, $lte: todayEnd } }),
      Parcel.countDocuments({ scheduledPickupTime: { $gte: now }, status: "pending" }),
      Parcel.countDocuments({ scheduledPickupTime: { $gte: now }, status: "pending", paymentStatus: "pending" }),
      Parcel.find({ scheduledPickupTime: { $gte: now } })
        .populate("customer", "name phone")
        .populate({ path: "driver", populate: { path: "user", select: "name phone" } })
        .sort({ scheduledPickupTime: 1 })
        .limit(50),
    ]);

    successResponse(res, 200, "Scheduled parcels", {
      stats: { total, todayScheduled, recurringOrders, pendingConfirmation },
      parcels,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/parcels/failed
const getFailedParcels = async (req, res) => {
  try {
    const { search, failureReason, page = 1, limit = 20 } = req.query;
    const filter = { status: { $in: ["failed", "cancelled"] } };
    if (search) filter.$or = [{ trackingId: { $regex: search, $options: "i" } }];

    const [totalFailed, recipientUnavailable, addressIssues, otherReasons, parcels] = await Promise.all([
      Parcel.countDocuments({ status: { $in: ["failed", "cancelled"] } }),
      Parcel.countDocuments({ status: "failed", cancelReason: { $regex: "recipient", $options: "i" } }),
      Parcel.countDocuments({ status: "failed", cancelReason: { $regex: "address", $options: "i" } }),
      Parcel.countDocuments({ status: "failed" }),
      Parcel.find(filter)
        .populate("customer", "name phone")
        .populate({ path: "driver", populate: { path: "user", select: "name phone" } })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
    ]);

    const total = await Parcel.countDocuments(filter);
    successResponse(res, 200, "Failed parcels", {
      stats: { totalFailed, recipientUnavailable, addressIssues, otherReasons },
      parcels, total,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/parcels/tracking
const getLiveTrackingStats = async (req, res) => {
  try {
    const { trackingId } = req.query;
    if (trackingId) {
      const parcel = await Parcel.findOne({ trackingId })
        .populate("customer", "name phone")
        .populate({ path: "driver", populate: { path: "user", select: "name phone profileImage" } });
      if (!parcel) return errorResponse(res, 404, "Parcel not found");
      return successResponse(res, 200, "Parcel found", { parcel });
    }

    const [beingTracked, outForDelivery, inTransit] = await Promise.all([
      Parcel.countDocuments({ status: { $in: ["driver_assigned", "picked_up", "in_transit", "out_for_delivery"] } }),
      Parcel.countDocuments({ status: "out_for_delivery" }),
      Parcel.countDocuments({ status: "in_transit" }),
    ]);

    const avgETA = 18;
    successResponse(res, 200, "Live tracking stats", {
      stats: { beingTracked, outForDelivery, inTransit, avgETA },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/parcels/create
const adminCreateParcel = async (req, res) => {
  try {
    const { tid } = require("../utils/generateOTP");
    const parcel = await Parcel.create({ ...req.body, customer: req.user._id });
    successResponse(res, 201, "Parcel created", { parcel });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { getParcelStats, getAllParcels, getActiveParcels, getScheduledParcels, getFailedParcels, getLiveTrackingStats, adminCreateParcel };
