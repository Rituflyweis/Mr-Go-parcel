const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    parcel: { type: mongoose.Schema.Types.ObjectId, ref: "Parcel", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
