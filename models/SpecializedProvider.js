const mongoose = require("mongoose");

// Shared provider directory for specialized services (notary, movers, etc.) — the
// customer-facing "browse available providers" screens (e.g. "Sarah Martinez $75,
// 4.9★, 2.1 miles" for notary, "Swift Movers Pro $850, 98% reliability" for movers)
// need a queryable list of providers, which nothing in the codebase currently models.
const specializedProviderSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      enum: ["nemt", "notary", "movers", "shuttle", "event_transport", "campus_shuttle", "laundry", "tow"],
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // linked login, if the provider has partner-app access

    name: { type: String, required: true },
    image: { type: String },
    phone: { type: String },
    email: { type: String },

    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    reliabilityScore: { type: Number, default: 100 }, // % — used by movers cards
    completedJobs: { type: Number, default: 0 },

    // Notary specific
    specialties: [{ type: String }], // e.g. "Loan Signing", "Real Estate", "Wills / Affidavits"
    notaryCommissionNumber: { type: String },
    notaryCommissionState: { type: String },
    notaryCommissionExpiry: { type: Date },
    perSignatureFee: { type: Number },
    travelFee: { type: Number },
    afterHoursFee: { type: Number },

    // Movers specific
    truckType: { type: String }, // "Box Truck (20 ft)", "Cargo Van"
    crewSize: { type: Number },
    flatRate: { type: Number },
    hourlyRate: { type: Number },

    serviceRadius: { type: Number, default: 25 }, // miles
    zipCodesServed: [{ type: String }],
    availableTimeBlocks: [{ type: String }], // "Morning (8 AM - 12 PM)", etc.

    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "in_review", "verified", "rejected"],
      default: "pending",
    },
    documents: [{ type: String }], // commission certificate, driver's license, insurance, background check, etc.
  },
  { timestamps: true }
);

specializedProviderSchema.index({ serviceType: 1, isActive: 1, isApproved: 1 });

module.exports = mongoose.model("SpecializedProvider", specializedProviderSchema);
