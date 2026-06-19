const mongoose = require("mongoose");

const fleetSchema = new mongoose.Schema(
  {
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    assignedZone: { type: String }, // e.g. "Mumbai North", "Delhi Central"
    shift: {
      type: String,
      enum: ["morning", "afternoon", "night", "flexible"],
      default: "flexible",
    },
    shiftStart: { type: String }, // "09:00"
    shiftEnd: { type: String },   // "18:00"
    totalDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Fleet", fleetSchema);
