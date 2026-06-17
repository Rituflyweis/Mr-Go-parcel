const mongoose = require("mongoose");

const promoCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },
    discountType: { type: String, enum: ["flat", "percentage"], required: true },
    discountValue: { type: Number, required: true },
    maxDiscount: { type: Number },
    minOrderAmount: { type: Number, default: 0 },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    validFrom: { type: Date, required: true },
    validTill: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    forNewUsers: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PromoCode", promoCodeSchema);
