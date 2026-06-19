const mongoose = require("mongoose");

const womenProgramSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    programType: {
      type: String,
      enum: ["herdrive", "training_only", "mentorship"],
      default: "herdrive",
    },
    status: {
      type: String,
      enum: ["applied", "under_review", "active", "inactive", "rejected"],
      default: "applied",
    },
    benefits: {
      higherEarnings: { type: Boolean, default: true },    // 15% extra on HerDrive
      priorityOrders: { type: Boolean, default: true },
      safetyKit: { type: Boolean, default: false },
      freeTraining: { type: Boolean, default: true },
      insuranceCover: { type: Boolean, default: false },
    },
    workPreference: {
      type: String,
      enum: ["day_only", "night_only", "flexible"],
      default: "flexible",
    },
    emergencyContact: { type: String },
    safetyFeatures: {
      sosEnabled: { type: Boolean, default: true },
      liveTracking: { type: Boolean, default: true },
      tripSharing: { type: Boolean, default: true },
    },
    totalHerDriveRides: { type: Number, default: 0 },
    totalEarningsFromProgram: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WomenProgram", womenProgramSchema);
