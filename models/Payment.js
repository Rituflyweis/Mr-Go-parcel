const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    parcel: { type: mongoose.Schema.Types.ObjectId, ref: "Parcel", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    method: { type: String, enum: ["cash", "online", "wallet"], required: true },
    gateway: { type: String, enum: ["razorpay", "stripe", "wallet", "cash"] },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    gatewaySignature: { type: String },
    status: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending" },
    refundId: { type: String },
    refundAmount: { type: Number },
    refundedAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
