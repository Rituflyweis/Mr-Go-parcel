const mongoose = require("mongoose");

// Facility-specific details captured on the "Hospital Registration" / "Clinic Registration"
// signup screens — kept separate from User since individual patients never have this data.
const healthcareFacilitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    facilityName: { type: String, required: true },
    facilityType: {
      type: String,
      enum: ["hospital", "clinic", "nursing_home", "rehabilitation_center", "other"],
      required: true,
    },
    licenseNumber: { type: String, required: true },
    taxId: { type: String, required: true },
    contactPerson: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HealthcareFacility", healthcareFacilitySchema);
