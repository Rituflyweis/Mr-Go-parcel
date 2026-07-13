const mongoose = require("mongoose");

// Patients managed by a healthcare agency/hospital account — the "Patient Management"
// screen in the Agency/Hospital portal (search/add/book-ride-for-patient) needs a
// queryable roster scoped to the agency that owns it.
const patientSchema = new mongoose.Schema(
  {
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    mobilityType: { type: String, enum: ["ambulatory", "wheelchair", "stretcher"], default: "ambulatory" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
