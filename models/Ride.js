const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    city: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    rideId: { type: String, unique: true },

    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },

    rideType: {
      type: String,
      enum: ["on_demand", "carpool", "herdrive", "night_safe", "airport_transfer"],
      required: true,
    },

    pickupLocation: { type: locationSchema, required: true },
    dropLocation: { type: locationSchema, required: true },

    scheduledAt: { type: Date }, // null = immediate ride

    passengers: { type: Number, default: 1, min: 1, max: 6 },

    vehicleCategory: {
      type: String,
      enum: ["bike", "auto", "sedan", "suv", "premium"],
      default: "sedan",
    },

    status: {
      type: String,
      enum: ["searching", "driver_assigned", "driver_arriving", "ride_started", "completed", "cancelled"],
      default: "searching",
    },

    fare: {
      baseFare: { type: Number, default: 0 },
      distanceCharge: { type: Number, default: 0 },
      timeCharge: { type: Number, default: 0 },
      surgeMultiplier: { type: Number, default: 1 },
      discount: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    distance: { type: Number, default: 0 }, // km
    duration: { type: Number, default: 0 }, // minutes
    estimatedFare: { type: Number, default: 0 },

    paymentMethod: {
      type: String,
      enum: ["cash", "online", "wallet"],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    otp: { type: String }, // driver verifies before starting ride

    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },

    cancelReason: { type: String },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    startedAt: { type: Date },
    completedAt: { type: Date },

    // For carpool — shared ride passengers
    carpoolPassengers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        pickupLocation: locationSchema,
        dropLocation: locationSchema,
        fare: Number,
        status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
      },
    ],

    // For night safe — safety features
    emergencyContact: { type: String },
    liveTrackingShared: { type: Boolean, default: false },

    promoCode: { type: String },
    promoDiscount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

rideSchema.pre("save", function (next) {
  if (!this.rideId) {
    this.rideId = "RD" + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 4).toUpperCase();
  }
  next();
});

module.exports = mongoose.model("Ride", rideSchema);
