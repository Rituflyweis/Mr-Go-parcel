const mongoose = require("mongoose");

const merchantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessName: { type: String, required: true },
    businessType: {
      type: String,
      enum: ["ecommerce", "retail", "restaurant", "pharmacy", "grocery", "logistics", "other"],
      required: true,
    },
    gstin: { type: String },
    businessAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    contactPerson: { type: String },
    contactPhone: { type: String },
    website: { type: String },
    logoUrl: { type: String },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    totalOrders: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 10 }, // % commission GoParcel charges
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolderName: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Merchant", merchantSchema);
