const { Training, Enrollment } = require("../models/Training");
const Driver = require("../models/Driver");
const { successResponse, errorResponse } = require("../utils/response");

// @route GET /api/training
const getAllTrainings = async (req, res) => {
  try {
    const { category, level, targetRole } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (level) query.level = level;
    if (targetRole) query.targetRole = { $in: [targetRole, "all"] };

    const trainings = await Training.find(query).select("-modules").sort({ createdAt: -1 });
    successResponse(res, 200, "Trainings fetched", { trainings });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/training/:id
const getTrainingById = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) return errorResponse(res, 404, "Training not found");

    const enrollment = await Enrollment.findOne({ user: req.user._id, training: req.params.id });
    successResponse(res, 200, "Training fetched", { training, enrollment });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/training/:id/enroll
const enrollTraining = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) return errorResponse(res, 404, "Training not found");
    if (!training.isActive) return errorResponse(res, 422, "Training is not active");

    const existing = await Enrollment.findOne({ user: req.user._id, training: req.params.id });
    if (existing) return errorResponse(res, 409, "Already enrolled in this training");

    const enrollment = await Enrollment.create({
      user: req.user._id,
      training: req.params.id,
      status: "enrolled",
    });

    await Training.findByIdAndUpdate(req.params.id, { $inc: { enrolledCount: 1 } });

    successResponse(res, 201, "Enrolled successfully", { enrollment });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/training/:id/progress
const updateProgress = async (req, res) => {
  try {
    const { completedModuleId, progress } = req.body;

    const enrollment = await Enrollment.findOne({ user: req.user._id, training: req.params.id });
    if (!enrollment) return errorResponse(res, 404, "Enrollment not found. Please enroll first.");

    if (completedModuleId && !enrollment.completedModules.includes(completedModuleId)) {
      enrollment.completedModules.push(completedModuleId);
    }
    if (progress !== undefined) enrollment.progress = Math.min(100, progress);
    if (enrollment.status === "enrolled") enrollment.status = "in_progress";

    if (enrollment.progress === 100) {
      enrollment.status = "completed";
      enrollment.completedAt = new Date();
      enrollment.certificateUrl = `https://certificates.goparcel.com/${enrollment._id}.pdf`;
      await Training.findByIdAndUpdate(req.params.id, { $inc: { completedCount: 1 } });
    }

    await enrollment.save();
    successResponse(res, 200, "Progress updated", { enrollment });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/training/my-enrollments
const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate("training", "title category level certificateName thumbnailUrl totalDuration")
      .sort({ createdAt: -1 });

    successResponse(res, 200, "Your enrollments fetched", { enrollments });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/training/certificates
const getMyCertificates = async (req, res) => {
  try {
    const certs = await Enrollment.find({ user: req.user._id, status: "completed" })
      .populate("training", "title certificateName category")
      .sort({ completedAt: -1 });

    successResponse(res, 200, "Certificates fetched", { certificates: certs });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ADMIN
// @route POST /api/admin/training
const createTraining = async (req, res) => {
  try {
    const training = await Training.create(req.body);
    successResponse(res, 201, "Training created", { training });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/training/:id
const updateTraining = async (req, res) => {
  try {
    const training = await Training.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!training) return errorResponse(res, 404, "Training not found");
    successResponse(res, 200, "Training updated", { training });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { getAllTrainings, getTrainingById, enrollTraining, updateProgress, getMyEnrollments, getMyCertificates, createTraining, updateTraining };
