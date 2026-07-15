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

    // Business info (shuttle/charter "Become a Provider" signup)
    dotMcNumber: { type: String }, // DOT/MC number for transport operators
    fleetSize: { type: Number },
    coverageAreas: [{ type: String }], // cities/states served, e.g. "Los Angeles, CA"
    servicesOffered: [{
      type: String,
      enum: ["airport_shuttle", "hotel_shuttle", "event_shuttle", "corporate_shuttle", "city_tour", "museum_attraction_tour", "winery_brewery_tour", "charter"],
    }],

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

    // NEMT specific
    vehicleTier: { type: String, enum: ["standard", "premium", "ambulatory"] },
    equipment: [{ type: String }], // "Wheelchair Ramp", "Oxygen Support", "First Aid Kit"
    isOnline: { type: Boolean, default: false },
    nemtFare: { type: Number }, // "Estimated fare" shown on the Select Vehicle screen
    etaMinutes: { type: Number }, // "12 mins away"

    // Shuttle / charter specific
    vehicleType: { type: String }, // "Coach Bus", "Mini Bus", "Sprinter Van"
    passengerCapacityMin: { type: Number },
    passengerCapacityMax: { type: Number }, // "30-45 passengers"
    luggageCapacityMin: { type: Number },
    luggageCapacityMax: { type: Number }, // "10-24 bags"
    amenities: [{ type: String }], // "AC Seats", "Wifi", "TV Streaming"
    shuttleFare: { type: Number }, // "Starting from $350"

    // Vehicle fleet — "Manage your vehicles and their details" screen. Each vehicle
    // is individually priced ("Setup Pricing"), unlike the summary fields above which
    // are just a quick-glance default shown on the customer's "Available Providers" card.
    vehicles: [{
      name: { type: String, required: true }, // "Sprinter #1"
      vehicleType: { type: String, required: true }, // "Sprinter Van", "Mini Bus", "Coach Bus"
      passengerCapacity: { type: Number },
      luggageCapacity: { type: Number },
      amenities: [{ type: String }],
      pricing: {
        flatRate: { type: Number },
        hourlyRate: { type: Number },
        perMileRate: { type: Number },
      },
      status: { type: String, enum: ["active", "inactive", "maintenance"], default: "active" },
    }],

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
