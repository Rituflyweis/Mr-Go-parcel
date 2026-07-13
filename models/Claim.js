const mongoose = require("mongoose");

// Agency/Hospital "Billing & Reports > Claims" tab — Medicaid/Medicare claim filed
// against an invoice. Kept separate from Invoice since a claim has its own lifecycle
// (submitted -> pending -> approved/rejected) independent of the invoice's paid status.
const claimSchema = new mongoose.Schema(
  {
    claimNumber: { type: String, unique: true },
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
    payer: { type: String, enum: ["medicaid", "medicare"], required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["submitted", "pending", "approved", "rejected"],
      default: "submitted",
    },
    serviceDate: { type: Date, required: true },
    submittedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

claimSchema.pre("save", function () {
  if (!this.claimNumber) {
    this.claimNumber = "CLM-" + Date.now().toString().slice(-6);
  }
});

module.exports = mongoose.model("Claim", claimSchema);
