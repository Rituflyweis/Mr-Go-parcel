const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
  {
    refundId: { type: String, unique: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    order: { type: String }, // trackingId or rideId
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["service_not_delivered", "overcharge", "driver_cancelled", "duplicate_charge", "other"],
      required: true,
    },
    description: { type: String },
    requestedBy: { type: String, enum: ["customer", "admin", "system"], default: "customer" },
    status: {
      type: String,
      enum: ["pending_review", "processing", "approved", "rejected"],
      default: "pending_review",
    },
    rejectionReason: { type: String },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

refundSchema.pre("save", function (next) {
  if (!this.refundId) {
    this.refundId = "REF-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4);
  }
  next();
});

module.exports = mongoose.model("Refund", refundSchema);
