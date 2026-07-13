const Driver = require("../models/Driver");
const User = require("../models/User");
const Parcel = require("../models/Parcel");
const { successResponse, errorResponse } = require("../utils/response");
const { getETA } = require("../utils/maps");

// @route POST /api/driver/register
const registerDriver = async (req, res) => {
  try {
    const { vehicleType, vehicleNumber, vehicleModel, licenseNumber, aadharNumber, panNumber } = req.body;

    const existing = await Driver.findOne({ user: req.user._id });
    if (existing) return errorResponse(res, 409, "Driver profile already exists");

    const files = req.files || {};
    const driver = await Driver.create({
      user: req.user._id,
      vehicleType,
      vehicleNumber,
      vehicleModel,
      licenseNumber,
      aadharNumber,
      panNumber,
      licenseImage: files.licenseImage?.[0]?.path || "",
      vehicleImage: files.vehicleImage?.[0]?.path || "",
      aadharImage: files.aadharImage?.[0]?.path || "",
      panImage: files.panImage?.[0]?.path || "",
    });

    // Update user role
    await User.findByIdAndUpdate(req.user._id, { role: "driver" });

    successResponse(res, 201, "Driver registered successfully. Awaiting admin approval.", { driver });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/driver/location
const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const driver = await Driver.findOneAndUpdate(
      { user: req.user._id },
      {
        currentLocation: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      },
      { new: true }
    );
    if (!driver) return errorResponse(res, 404, "Driver profile not found");

    // Calculate ETA to active parcel pickup if driver has an assigned order
    let eta = null;
    if (driver.isAvailable === false) {
      const activeParcel = await Parcel.findOne({
        driver: driver._id,
        status: { $in: ["driver_assigned", "picked_up"] },
      });
      if (activeParcel) {
        const dest = activeParcel.status === "driver_assigned"
          ? activeParcel.pickupAddress
          : activeParcel.deliveryAddress;
        if (dest?.location?.coordinates?.length === 2) {
          eta = await getETA(latitude, longitude, dest.location.coordinates[1], dest.location.coordinates[0]).catch(() => null);
        }
      }
    }

    successResponse(res, 200, "Location updated", { location: driver.currentLocation, eta });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/driver/toggle-online
const toggleOnline = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver not found");
    if (!driver.isApproved) return errorResponse(res, 403, "Driver not approved by admin yet");

    driver.isOnline = !driver.isOnline;
    await driver.save();
    successResponse(res, 200, `Driver is now ${driver.isOnline ? "online" : "offline"}`, {
      isOnline: driver.isOnline,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/driver/my-orders
const getDriverOrders = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver not found");

    const { status, page = 1, limit = 10 } = req.query;
    const filter = { driver: driver._id };
    if (status) filter.status = status;

    const parcels = await Parcel.find(filter)
      .populate("customer", "name phone email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Parcel.countDocuments(filter);
    successResponse(res, 200, "Orders fetched", { parcels, total, page: Number(page) });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/driver/order/:parcelId/accept
const acceptOrder = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver not found");

    const parcel = await Parcel.findById(req.params.parcelId);
    if (!parcel) return errorResponse(res, 404, "Parcel not found");
    if (parcel.status !== "pending") return errorResponse(res, 409, "Order is no longer available");

    parcel.driver = driver._id;
    parcel.status = "driver_assigned";
    parcel.trackingHistory.push({
      status: "driver_assigned",
      message: "Driver has been assigned to your parcel",
      timestamp: new Date(),
      updatedBy: req.user._id,
    });
    await parcel.save();

    successResponse(res, 200, "Order accepted", { parcel });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/driver/order/:parcelId/update-status
const updateOrderStatus = async (req, res) => {
  try {
    const { status, message, location } = req.body;
    const driver = await Driver.findOne({ user: req.user._id });

    const parcel = await Parcel.findOne({ _id: req.params.parcelId, driver: driver._id });
    if (!parcel) return errorResponse(res, 404, "Order not found");

    const validTransitions = {
      driver_assigned: ["picked_up"],
      picked_up: ["in_transit"],
      in_transit: ["out_for_delivery"],
      out_for_delivery: ["delivered", "failed"],
    };

    if (!validTransitions[parcel.status]?.includes(status)) {
      return errorResponse(res, 422, `Cannot transition from '${parcel.status}' to '${status}'`);
    }

    parcel.status = status;
    if (status === "picked_up") parcel.pickedUpAt = new Date();
    if (status === "delivered") {
      parcel.deliveredAt = new Date();
      parcel.paymentStatus = parcel.paymentMethod === "cash" ? "paid" : parcel.paymentStatus;
      driver.totalDeliveries += 1;
      driver.totalEarnings += parcel.pricing.total;
      await driver.save();
    }

    parcel.trackingHistory.push({
      status,
      message: message || `Parcel status updated to ${status}`,
      location,
      timestamp: new Date(),
      updatedBy: req.user._id,
    });

    await parcel.save();
    successResponse(res, 200, "Status updated", { parcel });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/driver/earnings
const getEarnings = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver not found");

    const { period = "all" } = req.query;
    let dateFilter = {};
    const now = new Date();

    if (period === "today") {
      dateFilter = { deliveredAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } };
    } else if (period === "week") {
      dateFilter = { deliveredAt: { $gte: new Date(now.setDate(now.getDate() - 7)) } };
    } else if (period === "month") {
      dateFilter = { deliveredAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) } };
    }

    const deliveries = await Parcel.find({
      driver: driver._id,
      status: "delivered",
      ...dateFilter,
    }).select("pricing trackingId deliveredAt createdAt");

    const totalEarnings = deliveries.reduce((sum, p) => sum + p.pricing.total, 0);
    successResponse(res, 200, "Earnings fetched", {
      totalEarnings,
      totalDeliveries: deliveries.length,
      deliveries,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/driver/bank-details
const updateBankDetails = async (req, res) => {
  try {
    const { accountNumber, ifscCode, bankName, accountHolderName } = req.body;
    const driver = await Driver.findOneAndUpdate(
      { user: req.user._id },
      { bankDetails: { accountNumber, ifscCode, bankName, accountHolderName } },
      { new: true }
    );
    successResponse(res, 200, "Bank details updated", { driver });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  registerDriver,
  updateLocation,
  toggleOnline,
  getDriverOrders,
  acceptOrder,
  updateOrderStatus,
  getEarnings,
  updateBankDetails,
};
