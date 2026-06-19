const mongoose = require("mongoose");

const partnerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    partnerType: {
      type: String,
      enum: ["individual", "agency", "corporate", "franchise"],
      required: true,
    },
    companyName: { type: String },
    contactPerson: { type: String, required: true },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    serviceAreas: [{ type: String }], // ["Mumbai", "Pune", "Nashik"]
    expectedMonthlyOrders: { type: Number },
    hasOwnVehicles: { type: Boolean, default: false },
    vehicleCount: { type: Number, default: 0 },
    experience: { type: String }, // "2 years in logistics"
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String },
    approvedAt: { type: Date },
    commissionRate: { type: Number, default: 12 },
    totalEarnings: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Partner", partnerSchema);
