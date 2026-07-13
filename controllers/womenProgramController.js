const WomenProgram = require("../models/WomenProgram");
const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const Parcel = require("../models/Parcel");
const { successResponse, errorResponse } = require("../utils/response");

// @route POST /api/women-program/apply
const applyToProgram = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return errorResponse(res, 404, "Driver profile not found. Register as driver first.");
    if (!driver.isApproved) return errorResponse(res, 403, "Driver not approved by admin yet");

    const existing = await WomenProgram.findOne({ driver: driver._id });
    if (existing) return errorResponse(res, 409, "Already applied to Women Empowerment Program");

    const { programType = "herdrive", workPreference = "flexible", emergencyContact } = req.body;

    const program = await WomenProgram.create({
      driver: driver._id,
      user: req.user._id,
      programType,
      workPreference,
      emergencyContact,
      status: "applied",
    });

    successResponse(res, 201, "Application submitted to Women Empowerment Program. We will review within 24 hours.", { program });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/women-program/status
const getProgramStatus = async (req, res) => {
  try {
    const program = await WomenProgram.findOne({ user: req.user._id })
      .populate("driver", "vehicleType vehicleNumber rating totalDeliveries");
    if (!program) return errorResponse(res, 404, "No Women Empowerment Program application found");
    successResponse(res, 200, "Program status fetched", { program });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/women-program/dashboard
const getProgramDashboard = async (req, res) => {
  try {
    const program = await WomenProgram.findOne({ user: req.user._id });
    if (!program) return errorResponse(res, 404, "Not enrolled in Women Empowerment Program");
    if (program.status !== "active") return errorResponse(res, 403, `Program status: ${program.status}`);

    const driver = await Driver.findById(program.driver);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalHerDriveRides, monthRides] = await Promise.all([
      Ride.countDocuments({ driver: driver._id, rideType: "herdrive", status: "completed" }),
      Ride.countDocuments({ driver: driver._id, rideType: "herdrive", status: "completed", createdAt: { $gte: startOfMonth } }),
    ]);

    successResponse(res, 200, "Women Program Dashboard", {
      program: {
        status: program.status,
        programType: program.programType,
        workPreference: program.workPreference,
        benefits: program.benefits,
        safetyFeatures: program.safetyFeatures,
        totalHerDriveRides: program.totalHerDrideRides || totalHerDriveRides,
        totalEarningsFromProgram: program.totalEarningsFromProgram,
        rating: program.rating,
        joinedAt: program.joinedAt,
      },
      stats: {
        totalHerDriveRides,
        monthHerDriveRides: monthRides,
        overallRating: driver.rating,
        totalDeliveries: driver.totalDeliveries,
      },
      safetyTips: [
        "Always verify passenger OTP before starting ride",
        "Share live trip with emergency contact",
        "Use SOS button in case of emergency",
        "Prefer well-lit pickup/drop locations at night",
      ],
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ADMIN
// @route GET /api/admin/women-program
const getAllApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;

    const programs = await WomenProgram.find(query)
      .populate("user", "name phone email profileImage")
      .populate("driver", "vehicleType vehicleNumber rating")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await WomenProgram.countDocuments(query);
    successResponse(res, 200, "Women program applications fetched", { programs, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/women-program/:id/review
const reviewApplication = async (req, res) => {
  try {
    const { status, benefits } = req.body;
    if (!["active", "rejected", "under_review"].includes(status)) {
      return errorResponse(res, 422, "status must be: active, rejected, or under_review");
    }

    const updates = { status };
    if (benefits) updates.benefits = benefits;

    const program = await WomenProgram.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!program) return errorResponse(res, 404, "Application not found");

    successResponse(res, 200, `Application ${status}`, { program });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { applyToProgram, getProgramStatus, getProgramDashboard, getAllApplications, reviewApplication };
