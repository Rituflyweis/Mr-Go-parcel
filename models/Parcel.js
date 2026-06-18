const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: [Number], // [lng, lat]
    },
  },
  { _id: false }
);

const trackingSchema = new mongoose.Schema(
  {
    status: { type: String },
    message: { type: String },
    location: { type: String },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const parcelSchema = new mongoose.Schema(
  {
    trackingId: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },

    parcelType: {
      type: String,
      enum: ["document", "small_package", "medium_package", "large_package", "fragile", "electronics"],
      required: true,
    },
    weight: { type: Number, required: true }, // in kg
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    description: { type: String },
    parcelImage: { type: String },

    pickupAddress: { type: addressSchema, required: true },
    deliveryAddress: { type: addressSchema, required: true },

    vehicleType: {
      type: String,
      enum: ["bike", "auto", "mini_truck", "tempo", "truck"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "driver_assigned",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "failed",
      ],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "wallet"],
      default: "cash",
    },
    paymentId: { type: String },

    pricing: {
      basePrice: { type: Number, default: 0 },
      distanceCharge: { type: Number, default: 0 },
      weightCharge: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    distance: { type: Number, default: 0 }, // in km
    estimatedDeliveryTime: { type: String },
    scheduledPickupTime: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },

    trackingHistory: [trackingSchema],

    customerRating: { type: Number, min: 1, max: 5 },
    customerReview: { type: String },
    driverRating: { type: Number, min: 1, max: 5 },

    cancelReason: { type: String },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isInsured: { type: Boolean, default: false },
    insuranceAmount: { type: Number, default: 0 },

    promoCode: { type: String },
    promoDiscount: { type: Number, default: 0 },
  },
  { timestamps: true }
);


parcelSchema.pre("save", function (next) {
  if (!this.trackingId) {
    this.trackingId = "GP" + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 5).toUpperCase();
  }
  next();
});

module.exports = mongoose.model("Parcel", parcelSchema);
