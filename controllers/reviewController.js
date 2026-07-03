const Review = require("../models/Review");
const Driver = require("../models/Driver");
const Parcel = require("../models/Parcel");
const Ride = require("../models/Ride");
const { successResponse, errorResponse } = require("../utils/response");

// @route POST /api/review/parcel/:parcelId
const reviewParcel = async (req, res) => {
  try {
    const { rating, review, tags } = req.body;
    if (!rating || rating < 1 || rating > 5) return errorResponse(res, 422, "Rating must be between 1 and 5");

    const parcel = await Parcel.findById(req.params.parcelId);
    if (!parcel) return errorResponse(res, 404, "Parcel not found");
    if (parcel.customer.toString() !== req.user._id.toString()) return errorResponse(res, 403, "Access denied");
    if (parcel.status !== "delivered") return errorResponse(res, 422, "Can only review delivered parcels");

    const existing = await Review.findOne({ parcel: parcel._id, customer: req.user._id });
    if (existing) return errorResponse(res, 409, "You have already reviewed this delivery");

    const newReview = await Review.create({
      parcel: parcel._id,
      customer: req.user._id,
      driver: parcel.driver,
      rating,
      review,
      tags: tags || [],
    });

    // Update driver rating
    if (parcel.driver) {
      const driver = await Driver.findById(parcel.driver);
      if (driver) {
        driver.totalRatings += 1;
        driver.rating = parseFloat(
          ((driver.rating * (driver.totalRatings - 1) + rating) / driver.totalRatings).toFixed(1)
        );
        await driver.save();
      }
    }

    // Update parcel rating
    parcel.customerRating = rating;
    parcel.customerReview = review;
    await parcel.save();

    successResponse(res, 201, "Review submitted successfully", { review: newReview });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/review/ride/:rideId
const reviewRide = async (req, res) => {
  try {
    const { rating, review, tip } = req.body;
    if (!rating || rating < 1 || rating > 5) return errorResponse(res, 422, "Rating must be between 1 and 5");

    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return errorResponse(res, 404, "Ride not found");
    if (ride.customer.toString() !== req.user._id.toString()) return errorResponse(res, 403, "Access denied");
    if (ride.status !== "completed") return errorResponse(res, 422, "Can only review completed rides");
    if (ride.rating) return errorResponse(res, 409, "You have already reviewed this ride");

    ride.rating = rating;
    ride.review = review;
    if (tip) ride.tip = tip;
    await ride.save();

    // Update driver rating
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

    successResponse(res, 201, "Ride reviewed successfully", { ride });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/review/driver/:driverId
const getDriverReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ driver: req.params.driverId })
      .populate("customer", "name profileImage")
      .populate("parcel", "trackingId parcelType")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Review.countDocuments({ driver: req.params.driverId });
    const driver = await Driver.findById(req.params.driverId).select("rating totalRatings");

    successResponse(res, 200, "Driver reviews fetched", { reviews, total, driverRating: driver });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/review/my-reviews
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ customer: req.user._id })
      .populate("driver", "vehicleType vehicleNumber user")
      .populate("parcel", "trackingId parcelType status")
      .sort({ createdAt: -1 });

    successResponse(res, 200, "Your reviews fetched", { reviews });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { reviewParcel, reviewRide, getDriverReviews, getMyReviews };
