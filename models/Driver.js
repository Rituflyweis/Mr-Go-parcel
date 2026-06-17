const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    vehicleType: {
      type: String,
      enum: ["bike", "auto", "mini_truck", "tempo", "truck"],
      required: true,
    },
    vehicleNumber: { type: String, required: true, uppercase: true },
    vehicleModel: { type: String },
    licenseNumber: { type: String, required: true },
    licenseImage: { type: String },
    vehicleImage: { type: String },
    aadharNumber: { type: String },
    aadharImage: { type: String },
    panNumber: { type: String },
    panImage: { type: String },
    isApproved: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    totalEarnings: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolderName: String,
    },
  },
  { timestamps: true }
);

driverSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("Driver", driverSchema);
