const mongoose = require("mongoose");

const pricingRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ruleId: { type: String, unique: true },
    serviceType: {
      type: String,
      enum: ["on_demand", "carpool", "herdrive", "night_safe", "airport_transfer", "parcel", "nemt", "shuttle", "movers"],
      required: true,
    },
    ruleType: {
      type: String,
      enum: ["standard", "surge", "time_based", "distance_based", "flat"],
      default: "standard",
    },
    baseRate: { type: Number, required: true },
    perMile: { type: Number, default: 0 },
    perKm: { type: Number, default: 0 },
    perMinute: { type: Number, default: 0 },
    minimumFare: { type: Number, default: 0 },
    surgeMultiplier: { type: Number, default: 1 },
    applicableHours: { type: String }, // "7-9 AM, 5-7 PM weekdays"
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pricingRuleSchema.pre("save", function (next) {
  if (!this.ruleId) {
    this.ruleId = "PR-" + Date.now().toString().slice(-6);
  }
  next();
});

module.exports = mongoose.model("PricingRule", pricingRuleSchema);
