const Parcel = require("../models/Parcel");
const Driver = require("../models/Driver");
const PromoCode = require("../models/PromoCode");
const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/response");

// Pricing logic
const calculatePrice = (vehicleType, weight, distance) => {
  const baseRates = { bike: 30, auto: 50, mini_truck: 80, tempo: 120, truck: 200 };
  const weightRates = { bike: 5, auto: 8, mini_truck: 12, tempo: 15, truck: 20 };
  const distanceRates = { bike: 6, auto: 8, mini_truck: 12, tempo: 15, truck: 20 };

  const base = baseRates[vehicleType] || 50;
  const weightCharge = weight * (weightRates[vehicleType] || 8);
  const distanceCharge = distance * (distanceRates[vehicleType] || 8);
  const subtotal = base + weightCharge + distanceCharge;
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const total = subtotal + tax;

  return { basePrice: base, weightCharge, distanceCharge, tax, discount: 0, total };
};

// @route POST /api/parcel/price-estimate
const getPriceEstimate = async (req, res) => {
  try {
    const { vehicleType, weight, distance } = req.body;
    const pricing = calculatePrice(vehicleType, weight || 1, distance || 1);
    successResponse(res, 200, "Price estimated", { pricing });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/parcel/create
const createParcel = async (req, res) => {
  try {
    const {
      parcelType, weight, dimensions, description,
      pickupAddress, deliveryAddress,
      vehicleType, paymentMethod, scheduledPickupTime,
      isInsured, insuranceAmount, promoCode,
    } = req.body;

    // Calculate distance (placeholder — integrate Google Maps API)
    const distance = req.body.distance || 5;
    let pricing = calculatePrice(vehicleType, weight, distance);

    // Apply promo code
    let promoDiscount = 0;
    if (promoCode) {
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase(), isActive: true });
      if (promo && new Date() >= promo.validFrom && new Date() <= promo.validTill) {
        if (!promo.usedBy.includes(req.user._id)) {
          if (pricing.total >= promo.minOrderAmount) {
            if (promo.discountType === "flat") {
              promoDiscount = promo.discountValue;
            } else {
              promoDiscount = Math.min(
                (pricing.total * promo.discountValue) / 100,
                promo.maxDiscount || Infinity
              );
            }
            promo.usedBy.push(req.user._id);
            promo.usedCount += 1;
            await promo.save();
          }
        }
      }
    }

    pricing.discount = promoDiscount;
    pricing.total = Math.max(0, pricing.total - promoDiscount);

    const parcel = await Parcel.create({
      customer: req.user._id,
      parcelType,
      weight,
      dimensions,
      description,
      pickupAddress,
      deliveryAddress,
      vehicleType,
      paymentMethod: paymentMethod || "cash",
      scheduledPickupTime,
      isInsured: isInsured || false,
      insuranceAmount: isInsured ? insuranceAmount : 0,
      promoCode,
      promoDiscount,
      distance,
      pricing,
      trackingHistory: [
        {
          status: "pending",
          message: "Parcel booking created. Looking for driver.",
          timestamp: new Date(),
          updatedBy: req.user._id,
        },
      ],
    });

    if (req.file) {
      parcel.parcelImage = req.file.path;
      await parcel.save();
    }

    // Create notification
    await Notification.create({
      user: req.user._id,
      title: "Booking Confirmed",
      message: `Your parcel (${parcel.trackingId}) has been booked. We're finding a driver.`,
      type: "order",
      data: { parcelId: parcel._id },
    });

    successResponse(res, 201, "Parcel booked successfully", { parcel });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/parcel/my-orders
const getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { customer: req.user._id };
    if (status) filter.status = status;

    const parcels = await Parcel.find(filter)
      .populate("driver", "user vehicleType vehicleNumber rating")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Parcel.countDocuments(filter);
    successResponse(res, 200, "Orders fetched", { parcels, total, page: Number(page) });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/parcel/:id
const getParcelById = async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id)
      .populate("customer", "name phone email profileImage")
      .populate({ path: "driver", populate: { path: "user", select: "name phone profileImage" } });

    if (!parcel) return errorResponse(res, 404, "Parcel not found");

    const isOwner = parcel.customer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return errorResponse(res, 403, "Not authorized");
    }

    successResponse(res, 200, "Parcel details", { parcel });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/parcel/track/:trackingId (public)
const trackParcel = async (req, res) => {
  try {
    const parcel = await Parcel.findOne({ trackingId: req.params.trackingId })
      .select("trackingId status trackingHistory pickupAddress deliveryAddress estimatedDeliveryTime")
      .populate({ path: "driver", populate: { path: "user", select: "name phone profileImage" } });

    if (!parcel) return errorResponse(res, 404, "Invalid tracking ID");
    successResponse(res, 200, "Tracking info", { parcel });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/parcel/:id/cancel
const cancelParcel = async (req, res) => {
  try {
    const { reason } = req.body;
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return errorResponse(res, 404, "Parcel not found");

    if (parcel.customer.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return errorResponse(res, 403, "Not authorized");
    }

    const cancellable = ["pending", "accepted"];
    if (!cancellable.includes(parcel.status)) {
      return errorResponse(res, 400, "Cannot cancel parcel at this stage");
    }

    parcel.status = "cancelled";
    parcel.cancelReason = reason;
    parcel.cancelledBy = req.user._id;
    parcel.trackingHistory.push({
      status: "cancelled",
      message: `Parcel cancelled: ${reason}`,
      timestamp: new Date(),
      updatedBy: req.user._id,
    });
    await parcel.save();

    successResponse(res, 200, "Parcel cancelled", { parcel });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/parcel/:id/rate
const rateDelivery = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return errorResponse(res, 404, "Parcel not found");
    if (parcel.status !== "delivered") return errorResponse(res, 400, "Can only rate delivered parcels");
    if (parcel.customerRating) return errorResponse(res, 400, "Already rated");

    parcel.customerRating = rating;
    parcel.customerReview = review;
    await parcel.save();

    // Update driver rating
    if (parcel.driver) {
      const driver = await Driver.findById(parcel.driver);
      if (driver) {
        driver.totalRatings += 1;
        driver.rating = ((driver.rating * (driver.totalRatings - 1)) + rating) / driver.totalRatings;
        await driver.save();
      }
    }

    successResponse(res, 200, "Rating submitted", { parcel });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getPriceEstimate,
  createParcel,
  getMyOrders,
  getParcelById,
  trackParcel,
  cancelParcel,
  rateDelivery,
};
