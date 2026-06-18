const Ride = require("../models/Ride");
const Driver = require("../models/Driver");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");

// Fare config per vehicle per km
const FARE_CONFIG = {
  bike:     { base: 20, perKm: 8,  perMin: 1 },
  auto:     { base: 30, perKm: 12, perMin: 1.5 },
  sedan:    { base: 50, perKm: 15, perMin: 2 },
  suv:      { base: 80, perKm: 20, perMin: 2.5 },
  premium:  { base: 120, perKm: 25, perMin: 3 },
};

// Ride type surcharge
const RIDE_TYPE_SURCHARGE = {
  on_demand:        1.0,
  carpool:          0.7,  // 30% cheaper
  herdrive:         1.1,  // 10% extra (women safety)
  night_safe:       1.2,  // 20% extra (night surcharge)
  airport_transfer: 1.3,  // 30% extra
};

const calculateFare = (vehicleCategory, distance, duration, rideType, surgeMultiplier = 1) => {
  const config = FARE_CONFIG[vehicleCategory] || FARE_CONFIG.sedan;
  const typeMultiplier = RIDE_TYPE_SURCHARGE[rideType] || 1;

  const baseFare = config.base;
  const distanceCharge = parseFloat((distance * config.perKm).toFixed(2));
  const timeCharge = parseFloat((duration * config.perMin).toFixed(2));
  const subtotal = baseFare + distanceCharge + timeCharge;
  const total = parseFloat((subtotal * typeMultiplier * surgeMultiplier).toFixed(2));

  return { baseFare, distanceCharge, timeCharge, surgeMultiplier, discount: 0, total };
};

// @route POST /api/ride/estimate
const getFareEstimate = async (req, res) => {
  try {
    const { vehicleCategory = "sedan", distance, duration = 20, rideType = "on_demand" } = req.body;

    if (!distance) return errorResponse(res, 422, "distance is required (in km)");

    const fare = calculateFare(vehicleCategory, distance, duration, rideType);

    successResponse(res, 200, "Fare estimated", {
      vehicleCategory,
      rideType,
      distance,
      estimatedDuration: duration,
      fare,
      allOptions: Object.keys(FARE_CONFIG).map((v) => ({
        vehicleCategory: v,
        fare: calculateFare(v, distance, duration, rideType),
      })),
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/ride/book
const bookRide = async (req, res) => {
  try {
    const {
      rideType,
      pickupLocation,
      dropLocation,
      vehicleCategory = "sedan",
      passengers = 1,
      paymentMethod = "cash",
      scheduledAt,
      emergencyContact,
      promoCode,
      distance = 10,
      duration = 20,
    } = req.body;

    if (!rideType || !pickupLocation || !dropLocation) {
      return errorResponse(res, 422, "rideType, pickupLocation and dropLocation are required");
    }

    if (rideType === "herdrive") {
      const user = await User.findById(req.user._id);
      if (user.gender && user.gender !== "female") {
        return errorResponse(res, 403, "HerDrive is available for women only");
      }
    }

    const fare = calculateFare(vehicleCategory, distance, duration, rideType);

    const rideData = {
      customer: req.user._id,
      rideType,
      pickupLocation,
      dropLocation,
      vehicleCategory,
      passengers,
      paymentMethod,
      distance,
      duration,
      estimatedFare: fare.total,
      fare,
      status: "searching",
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
    };

    if (scheduledAt) rideData.scheduledAt = new Date(scheduledAt);
    if (emergencyContact) rideData.emergencyContact = emergencyContact;
    if (promoCode) {
      rideData.promoCode = promoCode;
      rideData.promoDiscount = 20;
      rideData.fare.discount = 20;
      rideData.fare.total = parseFloat((fare.total - 20).toFixed(2));
      rideData.estimatedFare = rideData.fare.total;
    }

    const ride = await Ride.create(rideData);

    successResponse(res, 201, "Ride booked successfully. Searching for driver...", {
      ride: {
        _id: ride._id,
        rideId: ride.rideId,
        rideType: ride.rideType,
        status: ride.status,
        pickupLocation: ride.pickupLocation,
        dropLocation: ride.dropLocation,
        vehicleCategory: ride.vehicleCategory,
        estimatedFare: ride.estimatedFare,
        fare: ride.fare,
        otp: ride.otp,
        scheduledAt: ride.scheduledAt,
      },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/ride/my-rides
const getMyRides = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { customer: req.user._id };
    if (status) query.status = status;

    const rides = await Ride.find(query)
      .populate("driver", "vehicleType vehicleNumber vehicleModel rating user")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Ride.countDocuments(query);

    successResponse(res, 200, "Rides fetched", { rides, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/ride/:id
const getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("driver")
      .populate("customer", "name phone profileImage");

    if (!ride) return errorResponse(res, 404, "Ride not found");
    if (ride.customer._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, "Access denied");
    }

    successResponse(res, 200, "Ride fetched", { ride });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/ride/:id/cancel
const cancelRide = async (req, res) => {
  try {
    const { reason } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) return errorResponse(res, 404, "Ride not found");
    if (ride.customer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, "Access denied");
    }
    if (["completed", "cancelled"].includes(ride.status)) {
      return errorResponse(res, 409, `Ride already ${ride.status}`);
    }
    if (ride.status === "ride_started") {
      return errorResponse(res, 422, "Cannot cancel a ride that has already started");
    }

    ride.status = "cancelled";
    ride.cancelReason = reason || "Cancelled by customer";
    ride.cancelledBy = req.user._id;
    await ride.save();

    successResponse(res, 200, "Ride cancelled", { ride });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/ride/:id/rate
const rateRide = async (req, res) => {
  try {
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return errorResponse(res, 422, "Rating must be between 1 and 5");
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return errorResponse(res, 404, "Ride not found");
    if (ride.customer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, "Access denied");
    }
    if (ride.status !== "completed") {
      return errorResponse(res, 422, "Can only rate completed rides");
    }
    if (ride.rating) return errorResponse(res, 409, "Ride already rated");

    ride.rating = rating;
    ride.review = review;
    await ride.save();

    if (ride.driver) {
      const driver = await Driver.findById(ride.driver);
      if (driver) {
        driver.totalRatings += 1;
        driver.rating = parseFloat(
          ((driver.rating * (driver.totalRatings - 1) + rating) / driver.totalRatings).toFixed(1)
        );
        await driver.save();
      }
    }

    successResponse(res, 200, "Ride rated successfully", { ride });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/ride/driver/available-rides  (Driver sees nearby ride requests)
const getAvailableRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: "searching", scheduledAt: null })
      .populate("customer", "name phone profileImage")
      .sort({ createdAt: 1 })
      .limit(20);

    successResponse(res, 200, "Available rides", { rides });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/ride/:id/accept  (Driver accepts ride)
const acceptRide = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver profile not found");
    if (!driver.isApproved) return errorResponse(res, 403, "Driver not approved");

    const ride = await Ride.findById(req.params.id);
    if (!ride) return errorResponse(res, 404, "Ride not found");
    if (ride.status !== "searching") return errorResponse(res, 409, "Ride no longer available");

    ride.driver = driver._id;
    ride.status = "driver_assigned";
    await ride.save();

    driver.isAvailable = false;
    await driver.save();

    successResponse(res, 200, "Ride accepted", { ride });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/ride/:id/update-status  (Driver updates ride status)
const updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validTransitions = {
      driver_assigned: "driver_arriving",
      driver_arriving: "ride_started",
      ride_started: "completed",
    };

    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver profile not found");

    const ride = await Ride.findById(req.params.id);
    if (!ride) return errorResponse(res, 404, "Ride not found");
    if (ride.driver.toString() !== driver._id.toString()) {
      return errorResponse(res, 403, "Not your ride");
    }
    if (validTransitions[ride.status] !== status) {
      return errorResponse(res, 422, `Invalid transition: ${ride.status} → ${status}`);
    }

    ride.status = status;
    if (status === "ride_started") ride.startedAt = new Date();
    if (status === "completed") {
      ride.completedAt = new Date();
      ride.paymentStatus = ride.paymentMethod === "cash" ? "paid" : "pending";
      driver.totalEarnings += ride.fare.total;
      driver.totalDeliveries += 1;
      driver.isAvailable = true;
      await driver.save();
    }

    await ride.save();
    successResponse(res, 200, `Ride status updated to ${status}`, { ride });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/ride/driver/my-rides  (Driver's ride history)
const getDriverRides = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver profile not found");

    const { status, page = 1, limit = 10 } = req.query;
    const query = { driver: driver._id };
    if (status) query.status = status;

    const rides = await Ride.find(query)
      .populate("customer", "name phone profileImage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Ride.countDocuments(query);
    successResponse(res, 200, "Driver rides fetched", { rides, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getFareEstimate,
  bookRide,
  getMyRides,
  getRideById,
  cancelRide,
  rateRide,
  getAvailableRides,
  acceptRide,
  updateRideStatus,
  getDriverRides,
};
