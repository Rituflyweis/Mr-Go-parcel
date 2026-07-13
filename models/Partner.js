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

    // Team details
    teamSize: { type: String, enum: ["solo_mover", "crew_based"] },
    operatingHours: { type: String }, // e.g. "Mon-Fri 8AM-6PM, Sat 9AM-5PM"

    // Services offered
    serviceCategories: [{
      type: String,
      enum: ["small_item_move", "apartment_move", "home_move", "commercial_move", "heavy_item_move"],
    }],
    vehicleTypes: [{
      type: String,
      enum: ["cargo_van", "box_truck", "large_moving_truck", "pickup_truck"],
    }],

    // Pricing
    pricingModel: { type: String, enum: ["flat_rate", "hourly_rate", "distance_based"] },
    addOnPricing: {
      packingServices: { type: Number, default: 0 },
      disassemblyReassembly: { type: Number, default: 0 },
      heavyStairsFee: { type: Number, default: 0 },
      extraMoverPerPerson: { type: Number, default: 0 },
      stairFeePerFloor: { type: Number, default: 0 },
    },

    // Availability
    availableDays: [{
      type: String,
      enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    }],
    sameDayAvailability: { type: Boolean, default: false },

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
