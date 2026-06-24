const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, unique: true },
    type: {
      type: String,
      enum: ["accident", "customer_complaint", "safety_violation", "lost_item", "fraud", "other"],
      required: true,
    },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status: {
      type: String,
      enum: ["open", "under_investigation", "action_taken", "resolved", "closed"],
      default: "open",
    },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reportedByType: { type: String, enum: ["driver", "customer", "admin", "system"], default: "customer" },
    involvedDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    relatedOrder: { type: String }, // trackingId or rideId
    description: { type: String, required: true },
    resolution: { type: String },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

incidentSchema.pre("save", function (next) {
  if (!this.incidentId) {
    this.incidentId = "INC-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4);
  }
  next();
});

module.exports = mongoose.model("Incident", incidentSchema);
