const mongoose = require("mongoose");

// Agency/Hospital "Billing & Reports > Invoices" tab — one invoice per completed NEMT
// ride booked by an agency, since insurance/private-pay billing is only relevant for
// agency-booked rides (individual patients pay directly at booking time).
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "SpecializedBooking", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["paid", "pending", "processing", "overdue"],
      default: "pending",
    },
    paymentType: {
      type: String,
      enum: ["medicaid", "medicare", "private_insurance", "self_pay"],
      default: "self_pay",
    },
    facility: { type: String },
    serviceDate: { type: Date, required: true },
  },
  { timestamps: true }
);

invoiceSchema.pre("save", function () {
  if (!this.invoiceNumber) {
    this.invoiceNumber = "INV-" + Date.now().toString().slice(-6);
  }
});

module.exports = mongoose.model("Invoice", invoiceSchema);
