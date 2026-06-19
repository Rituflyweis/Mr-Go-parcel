const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    videoUrl: { type: String },
    duration: { type: Number }, // minutes
    order: { type: Number },
  },
  { _id: true }
);

const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["delivery_basics", "safety", "customer_service", "app_usage", "women_empowerment", "vehicle_maintenance"],
      required: true,
    },
    targetRole: {
      type: String,
      enum: ["driver", "partner", "all"],
      default: "driver",
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    modules: [moduleSchema],
    totalDuration: { type: Number, default: 0 }, // minutes
    certificateAwarded: { type: Boolean, default: true },
    certificateName: { type: String },
    isActive: { type: Boolean, default: true },
    enrolledCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    thumbnailUrl: { type: String },
  },
  { timestamps: true }
);

// Enrollment / Progress tracking
const enrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    training: { type: mongoose.Schema.Types.ObjectId, ref: "Training", required: true },
    status: {
      type: String,
      enum: ["enrolled", "in_progress", "completed"],
      default: "enrolled",
    },
    progress: { type: Number, default: 0 }, // percentage 0-100
    completedModules: [{ type: mongoose.Schema.Types.ObjectId }],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    certificateUrl: { type: String },
    score: { type: Number }, // quiz score %
  },
  { timestamps: true }
);

const Training = mongoose.model("Training", trainingSchema);
const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

module.exports = { Training, Enrollment };
