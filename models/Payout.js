const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    payoutId: { type: String, unique: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientType: { type: String, enum: ["driver", "partner"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    period: { type: String }, // "Dec 17 - Dec 23, 2024"
    periodFrom: { type: Date },
    periodTo: { type: Date },
    status: {
      type: String,
      enum: ["pending", "processed", "on_hold", "scheduled", "failed"],
      default: "pending",
    },
    scheduledDate: { type: Date },
    processedAt: { type: Date },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolderName: String,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

payoutSchema.pre("save", function (next) {
  if (!this.payoutId) {
    this.payoutId = "PAY-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4);
  }
  next();
});

module.exports = mongoose.model("Payout", payoutSchema);
