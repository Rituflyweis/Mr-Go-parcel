const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    verificationId: { type: String, unique: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subjectType: { type: String, enum: ["driver", "partner", "vehicle"], required: true },
    subjectName: { type: String },
    documentType: {
      type: String,
      enum: ["driver_license", "vehicle_insurance", "background_check", "business_license", "aadhar", "pan", "vehicle_registration"],
      required: true,
    },
    documentUrl: { type: String },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "expiring_soon", "expired"],
      default: "pending_review",
    },
    expiryDate: { type: Date },
    rejectionReason: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

verificationSchema.pre("save", function () {
  if (!this.verificationId) {
    this.verificationId = "VER-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4);
  }
});

module.exports = mongoose.model("VerificationDocument", verificationSchema);
